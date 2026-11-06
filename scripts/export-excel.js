/**
 * scripts/export-excel.js
 * CLI Script to export Watched Collection to Excel
 * 
 * Recreates the exact multi-column categorized spreadsheet pattern:
 * - Row 1: Merged Category headers (Lobster font, light blue fill)
 * - Row 2: Sub-headers (Name, Year, Star, Watch Date)
 * - Row 3+: Items categorized vertically side-by-side
 * 
 * Run with:
 *   npm run export
 *   node scripts/export-excel.js
 *   node scripts/export-excel.js --out "custom/path.xlsx"
 */

require('dotenv').config();
const path = require('path');
const db = require('../db');
const { buildExcelWorkbook, CATEGORIES } = require('../exportExcel');

async function runExport() {
  console.log('\n=============================================================');
  console.log('📊  Watched Collection - Excel Spreadsheet Exporter');
  console.log('=============================================================');

  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const defaultFileName = `Watched_Collection_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const outputPath = outIndex !== -1 && args[outIndex + 1]
    ? path.resolve(args[outIndex + 1])
    : path.join(__dirname, '..', 'backups', defaultFileName);

  try {
    console.log('🔌 Fetching titles from database...');
    const items = await db.getItems({ sort: 'created_at_asc' });
    console.log(`📂 Retrieved ${items.length} titles.`);

    console.log('🎨 Generating Excel workbook in original multi-column pattern...');
    const wb = await buildExcelWorkbook(items);

    console.log(`💾 Saving spreadsheet to: ${outputPath}`);
    await wb.xlsx.writeFile(outputPath);

    console.log('\n✅ EXPORT SUCCESSFUL!');
    console.log(`   File: ${outputPath}`);
    console.log(`   Pattern: Multi-column side-by-side [Name, Year, Star, Watch Date]`);
    console.log(`   Categories: ${CATEGORIES.join(', ')}`);
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Export failed:', err.message);
    process.exit(1);
  }
}

runExport();

