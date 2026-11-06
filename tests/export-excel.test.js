/**
 * tests/export-excel.test.js
 * Unit tests for Excel Export Engine and Formatting Helpers
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildExcelWorkbook,
  CATEGORIES,
  formatWatchDate,
  formatStarRating
} = require('../exportExcel');

describe('Excel Export Engine & Formatters', () => {

  describe('formatWatchDate()', () => {
    it('formats ISO dates to human-friendly English style', () => {
      assert.equal(formatWatchDate('2026-11-06'), '06th Nov, 2026');
      assert.equal(formatWatchDate('2024-01-01'), '01st Jan, 2024');
      assert.equal(formatWatchDate('2023-08-02'), '02nd Aug, 2023');
      assert.equal(formatWatchDate('2022-10-03'), '03rd Oct, 2022');
    });

    it('returns empty string for null, undefined, or empty values', () => {
      assert.equal(formatWatchDate(null), '');
      assert.equal(formatWatchDate(undefined), '');
      assert.equal(formatWatchDate(''), '');
    });

    it('returns raw string if not matching YYYY-MM-DD pattern', () => {
      assert.equal(formatWatchDate('Unknown Date'), 'Unknown Date');
    });
  });

  describe('formatStarRating()', () => {
    it('converts 0-10 scale rating to 1-5 star integer', () => {
      assert.equal(formatStarRating(10), 5);
      assert.equal(formatStarRating(9), 5);
      assert.equal(formatStarRating(8), 4);
      assert.equal(formatStarRating(7), 4);
      assert.equal(formatStarRating(6), 3);
      assert.equal(formatStarRating(4), 2);
      assert.equal(formatStarRating(2), 1);
    });

    it('returns empty string for 0, null, negative, or invalid ratings', () => {
      assert.equal(formatStarRating(0), '');
      assert.equal(formatStarRating(null), '');
      assert.equal(formatStarRating(undefined), '');
      assert.equal(formatStarRating('abc'), '');
      assert.equal(formatStarRating(-5), '');
    });
  });

  describe('CATEGORIES Configuration', () => {
    it('contains all required spreadsheet categories including Anime', () => {
      assert.ok(CATEGORIES.includes('Anime'), 'CATEGORIES must include Anime');
      assert.ok(CATEGORIES.includes('Bollywood'), 'CATEGORIES must include Bollywood');
      assert.ok(CATEGORIES.includes('Hollywood'), 'CATEGORIES must include Hollywood');
      assert.ok(CATEGORIES.includes('Web series'), 'CATEGORIES must include Web series');
      assert.ok(CATEGORIES.includes('To Watch'), 'CATEGORIES must include To Watch');
      assert.ok(CATEGORIES.includes('Uploaded Movies'), 'CATEGORIES must include Uploaded Movies');
      assert.ok(CATEGORIES.includes('Uploaded Web series'), 'CATEGORIES must include Uploaded Web series');
    });
  });

  describe('buildExcelWorkbook()', () => {
    it('generates a valid workbook with the Watched worksheet and frozen header rows', async () => {
      const mockItems = [
        {
          id: 1,
          title: 'Legend of Hanuman - Season 01',
          category: 'Anime',
          origin: 'Anime',
          content_type: 'Web Series',
          release_year: 2021,
          rating: 8.0,
          watched_date: '2026-11-06'
        },
        {
          id: 2,
          title: 'Ghosted',
          category: 'Hollywood',
          origin: 'Hollywood',
          content_type: 'Movie',
          release_year: 2023,
          rating: 7.0,
          watched_date: '2024-05-10'
        }
      ];

      const wb = await buildExcelWorkbook(mockItems);
      assert.ok(wb);
      const ws = wb.getWorksheet('All Watched');
      assert.ok(ws, 'Worksheet "All Watched" should exist');

      // Verify row 1 and row 2 exist
      const row1 = ws.getRow(1);
      const row2 = ws.getRow(2);
      assert.ok(row1);
      assert.ok(row2);

      // Verify views has frozen top 2 rows
      assert.ok(ws.views && ws.views.length > 0);
      assert.equal(ws.views[0].ySplit, 2, 'Top 2 rows must be frozen');

      // Verify buffer generation
      const buffer = await wb.xlsx.writeBuffer();
      assert.ok(buffer);
      assert.ok(buffer.length > 0);
    });
  });
});
