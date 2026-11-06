/**
 * tests/db-dimensions.test.js
 * Unit tests for 4-Dimensional Architecture and Category View Mapping
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');

describe('4-Dimensional Architecture & Category View Mapping', () => {

  describe('Dimension Definitions in getFilterOptions()', () => {
    it('Dimension 1 (Content Type) contains format options without Anime', async () => {
      const options = await db.getFilterOptions();
      assert.ok(Array.isArray(options.contentTypes), 'contentTypes should be an array');
      assert.deepEqual(options.contentTypes, ['Movie', 'Web Series', 'Documentary']);
      assert.equal(options.contentTypes.includes('Anime'), false, 'Anime must NOT be in Dimension 1 (Content Type)');
    });

    it('Dimension 2 (Industry / Origin) contains Anime alongside industries', async () => {
      const options = await db.getFilterOptions();
      assert.ok(Array.isArray(options.origins), 'origins should be an array');
      assert.ok(options.origins.includes('Anime'), 'Dimension 2 (Origin) must include Anime');
      assert.ok(options.origins.includes('Bollywood'), 'Dimension 2 (Origin) must include Bollywood');
      assert.ok(options.origins.includes('Hollywood'), 'Dimension 2 (Origin) must include Hollywood');
      assert.ok(options.origins.includes('South Indian'), 'Dimension 2 (Origin) must include South Indian');
      assert.ok(options.origins.includes('Korean'), 'Dimension 2 (Origin) must include Korean');
      assert.ok(options.origins.includes('Japanese'), 'Dimension 2 (Origin) must include Japanese');
      assert.ok(options.origins.includes('Other'), 'Dimension 2 (Origin) must include Other');
    });

    it('Dimension 3 (Availability) contains Uploaded & Not Uploaded', async () => {
      const options = await db.getFilterOptions();
      assert.deepEqual(options.availabilities, ['Uploaded', 'Not Uploaded']);
    });

    it('Dimension 4 (Watch Status) contains standard status options', async () => {
      const options = await db.getFilterOptions();
      assert.deepEqual(options.statuses, ['completed', 'watching', 'plan_to_watch', 'dropped']);
    });

    it('Filter options contains sorted years and all 12 category views', async () => {
      const options = await db.getFilterOptions();
      assert.ok(options.watchYears.length > 0, 'watchYears should not be empty');
      assert.ok(options.releaseYears.length > 0, 'releaseYears should not be empty');
      // Verify years sorted descending
      for (let i = 0; i < options.watchYears.length - 1; i++) {
        assert.ok(options.watchYears[i] >= options.watchYears[i + 1], 'watchYears must be sorted desc');
      }
      for (let i = 0; i < options.releaseYears.length - 1; i++) {
        assert.ok(options.releaseYears[i] >= options.releaseYears[i + 1], 'releaseYears must be sorted desc');
      }
      assert.ok(options.categories.includes('Anime'), 'categories list must include Anime');
      assert.ok(options.categories.includes('Movies'), 'categories list must include Movies');
      assert.ok(options.categories.includes('Web series'), 'categories list must include Web series');
    });
  });

  describe('Anime Data Classification & Multi-View Query Logic', () => {
    it('Querying category="Anime" returns all 71 titles with origin="Anime"', async () => {
      const animeTitles = await db.getItems({ category: 'Anime' });
      assert.equal(animeTitles.length, 71, 'Should find all 71 anime titles');
      for (const item of animeTitles) {
        assert.equal(item.origin, 'Anime', `Item "${item.title}" must have origin="Anime"`);
        assert.ok(
          item.content_type === 'Movie' || item.content_type === 'Web Series',
          `Item "${item.title}" content_type must be Movie or Web Series, got: ${item.content_type}`
        );
      }
    });

    it('Anime titles are classified into 42 Web Series and 29 Movies', async () => {
      const animeSeries = await db.getItems({ content_type: 'Web Series', origin: 'Anime' });
      const animeMovies = await db.getItems({ content_type: 'Movie', origin: 'Anime' });

      assert.equal(animeSeries.length, 42, 'Must have exactly 42 Anime Web Series');
      assert.equal(animeMovies.length, 29, 'Must have exactly 29 Anime Movies');
      assert.equal(animeSeries.length + animeMovies.length, 71, '42 series + 29 movies must equal 71 total anime');
    });

    it('Querying category="Movies" includes all 29 Anime movies', async () => {
      const movies = await db.getItems({ category: 'Movies' });
      assert.ok(movies.length >= 800, 'Should return all movies');
      const animeInMovies = movies.filter(m => m.origin === 'Anime');
      assert.equal(animeInMovies.length, 29, 'All 29 Anime movies must appear in Movies category view');
      for (const m of movies) {
        assert.equal(m.content_type, 'Movie', `Movie "${m.title}" must have content_type="Movie"`);
      }
    });

    it('Querying category="Web series" includes all 42 Anime series', async () => {
      const series = await db.getItems({ category: 'Web series' });
      assert.ok(series.length >= 180, 'Should return all web series');
      const animeInSeries = series.filter(s => s.origin === 'Anime');
      assert.equal(animeInSeries.length, 42, 'All 42 Anime series must appear in Web series category view');
      for (const s of series) {
        assert.equal(s.content_type, 'Web Series', `Series "${s.title}" must have content_type="Web Series"`);
      }
    });
  });

  describe('Other Views and Dimension Filtering', () => {
    it('category="Bollywood" returns only Bollywood origin', async () => {
      const items = await db.getItems({ category: 'Bollywood' });
      assert.ok(items.length > 0, 'Bollywood items should exist');
      for (const item of items) {
        assert.equal((item.origin || '').toLowerCase(), 'bollywood');
      }
    });

    it('category="Hollywood" returns only Hollywood origin', async () => {
      const items = await db.getItems({ category: 'Hollywood' });
      assert.ok(items.length > 0, 'Hollywood items should exist');
      for (const item of items) {
        assert.equal((item.origin || '').toLowerCase(), 'hollywood');
      }
    });

    it('category="To Watch" returns only items with status="plan_to_watch"', async () => {
      const items = await db.getItems({ category: 'To Watch' });
      assert.ok(items.length > 0, 'To Watch items should exist');
      for (const item of items) {
        assert.equal(item.status, 'plan_to_watch');
      }
    });

    it('category="Uploaded Movies" returns only Uploaded availability and Movie content_type', async () => {
      const items = await db.getItems({ category: 'Uploaded Movies' });
      assert.ok(items.length > 0, 'Uploaded Movies should exist');
      for (const item of items) {
        assert.equal(item.availability, 'Uploaded');
        assert.equal(item.content_type, 'Movie');
      }
    });

    it('Direct parameter filter content_type="Documentary"', async () => {
      const items = await db.getItems({ content_type: 'Documentary' });
      for (const item of items) {
        assert.equal(item.content_type, 'Documentary');
      }
    });

    it('Direct parameter filter status="completed"', async () => {
      const items = await db.getItems({ status: 'completed' });
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.equal(item.status, 'completed');
      }
    });
  });
});

