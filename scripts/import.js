/**
 * scripts/import.js
 * 
 * Imports titles into Neon Serverless PostgreSQL:
 * - Reads DATABASE_URL from .env
 * - Executes all operations inside a single atomic transaction
 * - Supports --dry-run (validates and simulates import without writing to DB)
 * - Supports --reset (truncates titles table first for safe re-runs on dev branch)
 * - Requires explicit --confirm-prod if target looks like the main/production branch
 * - Prints summary row counts per category and lists every skipped row with reasons
 */

// Load environment variables from .env
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Parse Command Line Arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isReset = args.includes('--reset');
const hasConfirmProd = args.includes('--confirm-prod');

// Extract custom file path if supplied (--file path/to/file.json)
const fileArgIndex = args.indexOf('--file');
const dataFilePath = fileArgIndex !== -1 && args[fileArgIndex + 1]
  ? path.resolve(args[fileArgIndex + 1])
  : path.join(__dirname, '..', 'data', 'sample-titles.json');

/**
 * Detect if connection string points to main / production branch
 */
function isProductionTarget(dbUrl) {
  if (!dbUrl) return false;
  const lower = dbUrl.toLowerCase();
  
  // Neon branches typically contain "-dev-" or "dev" in their endpoint URL for dev branches.
  // Main branches usually have "main" or default endpoint names without "dev" / "test".
  if (lower.includes('main') || lower.includes('prod') || lower.includes('production')) {
    return true;
  }
  
  // If connection string does not mention dev/staging/test/preview, assume potential production
  if (!lower.includes('dev') && !lower.includes('test') && !lower.includes('stage') && !lower.includes('preview')) {
    return true;
  }

  return false;
}

async function runImport() {
  console.log('\n=============================================================');
  console.log('📥  Neon DB Watchlist Importer');
  console.log('=============================================================');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('your-neon-connection-string')) {
    console.error('\n❌ ERROR: DATABASE_URL is not configured in .env.');
    console.error('   Please add your Neon database connection string before importing.\n');
    process.exit(1);
  }

  // Check production safety
  const looksLikeProd = isProductionTarget(dbUrl);
  if (looksLikeProd) {
    console.log('🔍 Target Environment: [PRODUCTION / MAIN BRANCH]');
    if (!hasConfirmProd && !isDryRun) {
      console.error('\n🛑 SAFETY WARNING: The target database appears to be the main/production branch!');
      console.error('   To prevent accidental overwrites, imports into production require --confirm-prod.');
      console.error('\n   Run with:');
      console.error('     npm run import -- --confirm-prod');
      console.error('     # Or for dry-run verification first:');
      console.error('     npm run import -- --dry-run\n');
      process.exit(1);
    }
  } else {
    console.log('🌱 Target Environment: [DEVELOPMENT / TEST BRANCH]');
  }

  if (isDryRun) {
    console.log('🧪 MODE: DRY RUN (Validating & simulating import, no writes will be made)');
  } else {
    console.log(`⚡ MODE: LIVE IMPORT ${isReset ? '(WITH TABLE RESET/TRUNCATE)' : ''}`);
  }

  // Check source file
  if (!fs.existsSync(dataFilePath)) {
    console.error(`\n❌ ERROR: Data file not found at: ${dataFilePath}\n`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
  } catch (err) {
    console.error(`\n❌ ERROR: Failed to parse JSON file: ${err.message}\n`);
    process.exit(1);
  }

  if (!Array.isArray(rawData)) {
    console.error('\n❌ ERROR: JSON file content must be an array of title objects.\n');
    process.exit(1);
  }

  console.log(`📂 Read ${rawData.length} records from ${path.basename(dataFilePath)}`);

  // Validation & Categorization
  const validRecords = [];
  const skippedRows = [];
  const categoryCounts = {};

  rawData.forEach((item, index) => {
    const rowNum = index + 1;

    // Check title
    if (!item.title || !String(item.title).trim()) {
      skippedRows.push({
        row: rowNum,
        title: item.title || '(empty)',
        reason: 'Missing or empty title'
      });
      return;
    }

    const title = String(item.title).trim();

    // Check rating (must be 0 - 10)
    let rating = 0.0;
    if (item.rating != null && item.rating !== '') {
      const parsedRating = parseFloat(item.rating);
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10) {
        skippedRows.push({
          row: rowNum,
          title,
          reason: `Invalid rating score "${item.rating}" (must be between 0.0 and 10.0)`
        });
        return;
      }
      rating = parsedRating;
    }

    // Check release year
    let releaseYear = null;
    if (item.release_year != null && item.release_year !== '') {
      const year = parseInt(item.release_year, 10);
      if (isNaN(year) || year < 1888 || year > 2100) {
        skippedRows.push({
          row: rowNum,
          title,
          reason: `Invalid release year "${item.release_year}"`
        });
        return;
      }
      releaseYear = year;
    }

    // Standardize category and status
    const category = (item.category || item.type || 'Movie').trim();
    const status = (item.status || 'plan_to_watch').trim().toLowerCase();
    const watchedDate = item.watched_date ? String(item.watched_date).substring(0, 10) : null;

    validRecords.push({
      title,
      category,
      status,
      genre: item.genre ? String(item.genre).trim() : null,
      release_year: releaseYear,
      rating,
      watched_date: watchedDate,
      platform: item.platform ? String(item.platform).trim() : null,
      poster_url: item.poster_url ? String(item.poster_url).trim() : null,
      notes: item.notes ? String(item.notes).trim() : null
    });

    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Database Execution
  const sql = neon(dbUrl);

  try {
    if (!isDryRun) {
      console.log('🔄 Executing transaction on Neon Serverless Postgres...');

      // Transaction queries batch
      const queries = [];

      // If reset requested, truncate titles table and restart IDs
      if (isReset) {
        queries.push(sql.query('TRUNCATE TABLE titles RESTART IDENTITY;'));
      }

      // Add parameterized insert query for each valid record
      for (const record of validRecords) {
        queries.push(
          sql.query(
            `INSERT INTO titles (title, category, status, genre, release_year, rating, watched_date, platform, poster_url, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
            [
              record.title,
              record.category,
              record.status,
              record.genre,
              record.release_year,
              record.rating,
              record.watched_date,
              record.platform,
              record.poster_url,
              record.notes
            ]
          )
        );
      }

      // Execute atomic transaction batch
      await sql.transaction(queries);
      console.log('✅ Transaction committed successfully!');
    } else {
      console.log('✨ Dry-run complete. Database remained untouched.');
    }
  } catch (err) {
    console.error(`\n❌ Transaction failed: ${err.message}`);
    process.exit(1);
  }

  // Print Summary
  console.log('\n=============================================================');
  console.log('📊  IMPORT SUMMARY REPORT');
  console.log('=============================================================');
  console.log(`Total rows processed:  ${rawData.length}`);
  console.log(`Successfully valid:    ${validRecords.length}`);
  console.log(`Skipped rows:          ${skippedRows.length}`);

  console.log('\n📁 Row Counts Per Category:');
  const categories = Object.keys(categoryCounts);
  if (categories.length === 0) {
    console.log('   (No rows to count)');
  } else {
    categories.sort().forEach(cat => {
      console.log(`   • ${cat.padEnd(16)} : ${categoryCounts[cat]}`);
    });
  }

  if (skippedRows.length > 0) {
    console.log('\n⚠️  Skipped Rows Breakdown:');
    skippedRows.forEach(skip => {
      console.log(`   [Row ${skip.row}] "${skip.title}" -> Reason: ${skip.reason}`);
    });
  } else {
    console.log('\n🎉 No rows skipped! All rows satisfied schema validation.');
  }

  console.log('\n=============================================================\n');
}

runImport();

