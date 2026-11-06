/**
 * scripts/backup.js
 * 
 * Exports the entire Neon titles table to dated CSV and JSON files in the backups/ folder.
 * Free plan Neon projects have a limited point-in-time restore history window, so running
 * regular automated backups ensures permanent retention.
 */

// Load environment variables from .env
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());
  const secs = pad(now.getSeconds());
  return `${year}-${month}-${day}_${hours}-${mins}-${secs}`;
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = [
    'id',
    'title',
    'category',
    'status',
    'genre',
    'release_year',
    'rating',
    'watched_date',
    'platform',
    'poster_url',
    'notes',
    'created_at',
    'updated_at'
  ];

  const headerRow = headers.join(',');
  const dataRows = rows.map(r => headers.map(h => escapeCsvField(r[h])).join(','));
  return [headerRow, ...dataRows].join('\n');
}

async function runBackup() {
  console.log('\n=============================================================');
  console.log('💾  Neon DB Watchlist Backup');
  console.log('=============================================================');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('your-neon-connection-string')) {
    console.error('\n❌ ERROR: DATABASE_URL is not set in .env.');
    console.error('   Please provide your Neon connection string before running a backup.\n');
    process.exit(1);
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = getTimestamp();
  const jsonPath = path.join(backupDir, `titles_${timestamp}.json`);
  const csvPath = path.join(backupDir, `titles_${timestamp}.csv`);

  try {
    console.log('🔌 Connecting to Neon PostgreSQL...');
    const sql = neon(dbUrl);

    console.log('📥 Exporting records from "titles" table...');
    const rows = await sql`
      SELECT id, title, category, status, genre, release_year, rating, watched_date, platform, poster_url, notes, created_at, updated_at
      FROM titles
      ORDER BY id ASC;
    `;

    console.log(`📊 Retrieved ${rows.length} titles from database.`);

    // Write JSON file
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`✅ Saved JSON backup: ${path.relative(process.cwd(), jsonPath)}`);

    // Write CSV file
    const csvContent = toCsv(rows);
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`✅ Saved CSV backup:  ${path.relative(process.cwd(), csvPath)}`);

    console.log('\n🎉 Backup completed successfully!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error(`\n❌ Backup failed: ${err.message}\n`);
    process.exit(1);
  }
}

runBackup();

