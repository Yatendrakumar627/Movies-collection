/**
 * tests/sorting-logic.test.js
 * Unit tests for all 10 Sorting Options in getItems()
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');

describe('Sorting Logic in getItems()', () => {

  it('watched_date_desc (Recent Watched) places newest watch dates first in strict chronological order', async () => {
    const items = await db.getItems({ sort: 'watched_date_desc' });
    assert.ok(items.length > 0, 'Library should have items');

    // First item must have a valid watched date
    assert.ok(items[0].watched_date, 'Top item in Recent Watched must have a watched_date');

    // Verify chronological order for all items that have a watched_date
    let sawNull = false;
    for (let i = 0; i < items.length - 1; i++) {
      const cur = items[i].watched_date;
      const next = items[i + 1].watched_date;

      if (!cur) sawNull = true;
      if (sawNull) {
        // Once we see a null/empty watched_date, all subsequent items must also have null/empty watched_date
        assert.ok(!cur, `Item at index ${i} should have null watched_date since sawNull is true`);
      }

      if (cur && next) {
        assert.ok(
          cur >= next,
          `Chronological violation at index ${i}: "${cur}" was placed before "${next}"`
        );
      }
    }
  });

  it('watched_date_asc (Oldest Watched) places earliest watch dates first', async () => {
    const items = await db.getItems({ sort: 'watched_date_asc' });
    assert.ok(items.length > 0);

    assert.ok(items[0].watched_date, 'Top item in Oldest Watched must have a watched_date');

    let sawNull = false;
    for (let i = 0; i < items.length - 1; i++) {
      const cur = items[i].watched_date;
      const next = items[i + 1].watched_date;

      if (!cur) sawNull = true;
      if (sawNull) {
        assert.ok(!cur, `Item at index ${i} should have null watched_date`);
      }

      if (cur && next) {
        assert.ok(
          cur <= next,
          `Ascending chronological violation at index ${i}: "${cur}" placed before "${next}"`
        );
      }
    }
  });

  it('created_at_desc (Newest Added) sorts IDs descending', async () => {
    const items = await db.getItems({ sort: 'created_at_desc' });
    assert.ok(items.length > 1);
    for (let i = 0; i < items.length - 1; i++) {
      assert.ok(
        (items[i].id || 0) >= (items[i + 1].id || 0),
        `ID order violation: ${items[i].id} < ${items[i + 1].id}`
      );
    }
  });

  it('created_at_asc (Oldest Added) sorts IDs ascending', async () => {
    const items = await db.getItems({ sort: 'created_at_asc' });
    assert.ok(items.length > 1);
    for (let i = 0; i < items.length - 1; i++) {
      assert.ok(
        (items[i].id || 0) <= (items[i + 1].id || 0),
        `ID order violation: ${items[i].id} > ${items[i + 1].id}`
      );
    }
  });

  it('rating_desc (Highest Rated) sorts ratings 10 -> 0 descending', async () => {
    const items = await db.getItems({ sort: 'rating_desc' });
    assert.ok(items.length > 1);
    for (let i = 0; i < items.length - 1; i++) {
      const r1 = items[i].rating != null ? Number(items[i].rating) : -1;
      const r2 = items[i + 1].rating != null ? Number(items[i + 1].rating) : -1;
      assert.ok(r1 >= r2, `Rating desc violation at index ${i}: ${r1} < ${r2}`);
    }
  });

  it('rating_asc (Lowest Rated) sorts non-zero ratings ascending', async () => {
    const items = await db.getItems({ sort: 'rating_asc' });
    assert.ok(items.length > 1);
    // Find items that have a positive rating
    const rated = items.filter(i => i.rating != null && Number(i.rating) > 0);
    assert.ok(rated.length > 0);
    for (let i = 0; i < rated.length - 1; i++) {
      const r1 = Number(rated[i].rating);
      const r2 = Number(rated[i + 1].rating);
      assert.ok(r1 <= r2, `Rating asc violation at index ${i}: ${r1} > ${r2}`);
    }
  });

  it('release_year_desc (Released: Newest First) sorts release years descending', async () => {
    const items = await db.getItems({ sort: 'release_year_desc' });
    const withYears = items.filter(i => i.release_year != null);
    assert.ok(withYears.length > 0);
    for (let i = 0; i < withYears.length - 1; i++) {
      assert.ok(
        withYears[i].release_year >= withYears[i + 1].release_year,
        `Year desc violation at index ${i}: ${withYears[i].release_year} < ${withYears[i + 1].release_year}`
      );
    }
  });

  it('release_year_asc (Released: Oldest First) sorts release years ascending', async () => {
    const items = await db.getItems({ sort: 'release_year_asc' });
    const withYears = items.filter(i => i.release_year != null);
    assert.ok(withYears.length > 0);
    for (let i = 0; i < withYears.length - 1; i++) {
      assert.ok(
        withYears[i].release_year <= withYears[i + 1].release_year,
        `Year asc violation at index ${i}: ${withYears[i].release_year} > ${withYears[i + 1].release_year}`
      );
    }
  });

  it('title_asc (Title A - Z) sorts titles alphabetically', async () => {
    const items = await db.getItems({ sort: 'title_asc' });
    assert.ok(items.length > 1);
    for (let i = 0; i < Math.min(items.length - 1, 50); i++) {
      const cmp = (items[i].title || '').localeCompare(items[i + 1].title || '');
      assert.ok(cmp <= 0, `Title asc violation at index ${i}: "${items[i].title}" > "${items[i + 1].title}"`);
    }
  });

  it('title_desc (Title Z - A) sorts titles reverse alphabetically', async () => {
    const items = await db.getItems({ sort: 'title_desc' });
    assert.ok(items.length > 1);
    for (let i = 0; i < Math.min(items.length - 1, 50); i++) {
      const cmp = (items[i].title || '').localeCompare(items[i + 1].title || '');
      assert.ok(cmp >= 0, `Title desc violation at index ${i}: "${items[i].title}" < "${items[i + 1].title}"`);
    }
  });
});

