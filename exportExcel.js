/**
 * exportExcel.js
 * Excel Export Engine for Watched Cinema & Series Journal
 * 
 * Recreates the exact multi-column categorized spreadsheet pattern:
 * - Row 1: Category Names (merged across 4 columns, light-blue header, Lobster / Script font)
 * - Row 2: Sub-headers (Name, Year, Star, Watch Date)
 * - Row 3+: Media titles listed vertically under their respective category columns
 * - Blank spacer columns separating each category
 * - Frozen top 2 rows for seamless spreadsheet navigation
 */

const ExcelJS = require('exceljs');

const CATEGORIES = [
  'Bollywood',
  'Hollywood',
  'Web series',
  'Anime',
  'South',
  'To Watch',
  'Old Collection',
  'Uploaded Movies',
  'Uploaded Web series'
];

/**
 * Formats ISO YYYY-MM-DD date into human-friendly format (e.g. "29th Oct, 2022")
 */
function formatWatchDate(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return str;
  const year = m[1];
  const monthIdx = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx] || m[2];
  
  const s = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  const padDay = day < 10 ? '0' + day : '' + day;
  
  return `${padDay}${suffix} ${monthName}, ${year}`;
}

/**
 * Converts 0-10 database rating to 1-5 Star integer matching original sheet format
 */
function formatStarRating(ratingVal) {
  if (ratingVal == null || ratingVal === '') return '';
  const num = Number(ratingVal);
  if (isNaN(num) || num <= 0) return '';
  const stars = Math.round(num / 2);
  return stars > 0 ? stars : '';
}

/**
 * Builds the ExcelJS Workbook matching the exact layout pattern
 */
async function buildExcelWorkbook(items) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Watched Journal';
  wb.lastModifiedBy = 'Watched Journal';
  wb.created = new Date();
  wb.modified = new Date();

  // Primary Sheet: "All Watched"
  const ws = wb.addWorksheet('All Watched', {
    views: [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: 2,
        showGridLines: true
      }
    ]
  });

  // Group items by category (case-insensitive key mapping)
  const itemsByCategory = {};
  CATEGORIES.forEach(cat => {
    itemsByCategory[cat.toLowerCase()] = [];
  });

  // Extra categories if present
  const extraCategories = [];

  for (const item of items) {
    const rawCat = (item.category || 'Bollywood').trim();
    const key = rawCat.toLowerCase();
    if (itemsByCategory[key]) {
      itemsByCategory[key].push(item);
    } else {
      if (!extraCategories.includes(rawCat)) {
        extraCategories.push(rawCat);
        itemsByCategory[key] = [];
      }
      itemsByCategory[key].push(item);
    }
  }

  const allDisplayCategories = [...CATEGORIES, ...extraCategories];

  // Colors & Styles
  const categoryHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD0E0E3' } // Pastel soft blue matching Google Sheets .s23 / user screenshot
  };

  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F3F3' }
  };

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
  };

  // Set row heights
  ws.getRow(1).height = 32;
  ws.getRow(2).height = 24;

  let currentStartCol = 1;

  allDisplayCategories.forEach((categoryName) => {
    const startCol = currentStartCol;
    const nameCol = startCol;
    const yearCol = startCol + 1;
    const starCol = startCol + 2;
    const dateCol = startCol + 3;
    const endCol = dateCol;
    const spacerCol = endCol + 1;

    // Set column widths
    ws.getColumn(nameCol).width = 46;
    ws.getColumn(yearCol).width = 9;
    ws.getColumn(starCol).width = 8;
    ws.getColumn(dateCol).width = 19;
    ws.getColumn(spacerCol).width = 4;

    // 1. Merge Row 1 for Category Header
    ws.mergeCells(1, startCol, 1, endCol);
    const catCell = ws.getCell(1, startCol);
    catCell.value = categoryName;
    catCell.font = {
      name: 'Lobster',
      family: 4,
      size: 16,
      bold: true,
      italic: true,
      color: { argb: 'FF000000' }
    };
    catCell.alignment = { horizontal: 'center', vertical: 'middle' };
    catCell.fill = categoryHeaderFill;

    // Apply borders & fill across merged header cells
    for (let c = startCol; c <= endCol; c++) {
      const cCell = ws.getCell(1, c);
      cCell.border = thinBorder;
      cCell.fill = categoryHeaderFill;
    }

    // 2. Row 2 Subheaders
    const headers = [
      { col: nameCol, text: 'Name', align: 'center' },
      { col: yearCol, text: 'Year', align: 'center' },
      { col: starCol, text: 'Star', align: 'center' },
      { col: dateCol, text: 'Watch Date', align: 'center' }
    ];

    headers.forEach(h => {
      const cell = ws.getCell(2, h.col);
      cell.value = h.text;
      cell.font = {
        name: 'Lobster',
        family: 4,
        size: 13,
        bold: true,
        color: { argb: 'FF000000' }
      };
      cell.alignment = { horizontal: h.align, vertical: 'middle' };
      cell.fill = subHeaderFill;
      cell.border = thinBorder;
    });

    // 3. Row 3+ Data Rows
    const catItems = itemsByCategory[categoryName.toLowerCase()] || [];
    catItems.forEach((item, idx) => {
      const rowNum = idx + 3;
      const row = ws.getRow(rowNum);
      if (!row.height || row.height < 20) {
        row.height = 20;
      }

      // Name Cell
      const cName = ws.getCell(rowNum, nameCol);
      cName.value = item.title || '';
      cName.font = { name: 'Arial', size: 10.5 };
      cName.alignment = { horizontal: 'left', vertical: 'middle' };
      cName.border = thinBorder;

      // Year Cell
      const cYear = ws.getCell(rowNum, yearCol);
      cYear.value = item.release_year ? Number(item.release_year) : '';
      cYear.font = { name: 'Arial', size: 10.5 };
      cYear.alignment = { horizontal: 'center', vertical: 'middle' };
      cYear.border = thinBorder;

      // Star Cell
      const cStar = ws.getCell(rowNum, starCol);
      const starVal = formatStarRating(item.rating);
      cStar.value = starVal !== '' ? Number(starVal) : '';
      cStar.font = { name: 'Arial', size: 10.5 };
      cStar.alignment = { horizontal: 'center', vertical: 'middle' };
      cStar.border = thinBorder;

      // Watch Date Cell
      const cDate = ws.getCell(rowNum, dateCol);
      cDate.value = formatWatchDate(item.watched_date);
      cDate.font = { name: 'Arial', size: 10 };
      cDate.alignment = { horizontal: 'center', vertical: 'middle' };
      cDate.border = thinBorder;
    });

    // Advance to next category block (4 columns + 1 spacer)
    currentStartCol = spacerCol + 1;
  });

  return wb;
}

module.exports = {
  buildExcelWorkbook,
  CATEGORIES,
  formatWatchDate,
  formatStarRating
};

