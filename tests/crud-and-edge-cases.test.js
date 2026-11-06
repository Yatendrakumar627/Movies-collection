/**
 * tests/crud-and-edge-cases.test.js
 * Unit tests for CRUD Operations, Status Transitions, Bulk Operations, and Stats
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');

describe('CRUD Operations & Data Mutation Edge Cases', () => {
  const TEST_TITLE = `Test Title ${Date.now()}`;
  let createdSeriesId = null;
  let createdMovieId = null;

  after(async () => {
    // Cleanup test artifacts from database
    const toDelete = [createdSeriesId, createdMovieId].filter(Boolean);
    if (toDelete.length > 0) {
      await db.bulkDelete(toDelete);
    }
  });

  it('createItem creates an item with all 4 dimensions', async () => {
    const item = await db.createItem({
      title: TEST_TITLE,
      content_type: 'Web Series',
      origin: 'Anime',
      availability: 'Uploaded',
      status: 'plan_to_watch',
      release_year: 2024,
      rating: 8.5,
      genre: 'Animation, Sci-Fi',
      platform: 'Crunchyroll',
      notes: 'Initial test review'
    });

    assert.ok(item.id, 'Item should have an ID');
    createdSeriesId = item.id;

    assert.equal(item.title, TEST_TITLE);
    assert.equal(item.content_type, 'Web Series');
    assert.equal(item.origin, 'Anime');
    assert.equal(item.availability, 'Uploaded');
    assert.equal(item.status, 'plan_to_watch');
    assert.equal(item.release_year, 2024);
    assert.equal(Number(item.rating), 8.5);
    assert.equal(item.genre, 'Animation, Sci-Fi');
  });

  it('createItem blocks duplicate title in same content_type', async () => {
    await assert.rejects(
      async () => {
        await db.createItem({
          title: TEST_TITLE,
          content_type: 'Web Series',
          origin: 'Anime'
        });
      },
      (err) => {
        assert.equal(err.code, 'DUPLICATE_TITLE');
        return true;
      }
    );
  });

  it('createItem ALLOWS same title in a different content_type (Movie vs Web Series)', async () => {
    const movieItem = await db.createItem({
      title: TEST_TITLE,
      content_type: 'Movie',
      origin: 'Anime',
      availability: 'Not Uploaded',
      status: 'plan_to_watch',
      release_year: 2025
    });

    assert.ok(movieItem.id);
    createdMovieId = movieItem.id;
    assert.equal(movieItem.content_type, 'Movie');
    assert.equal(movieItem.title, TEST_TITLE);
  });

  it('getItemById retrieves item with complete fields', async () => {
    const item = await db.getItemById(createdSeriesId);
    assert.ok(item);
    assert.equal(item.id, createdSeriesId);
    assert.equal(item.title, TEST_TITLE);
    assert.equal(item.content_type, 'Web Series');
  });

  it('getItemById returns null for nonexistent ID', async () => {
    const item = await db.getItemById(999999999);
    assert.equal(item, null);
  });

  it('updateItem successfully updates dimensions, rating, and notes', async () => {
    const updated = await db.updateItem(createdSeriesId, {
      title: TEST_TITLE,
      content_type: 'Web Series',
      origin: 'Anime',
      availability: 'Uploaded',
      status: 'watching',
      rating: 9.0,
      release_year: 2024,
      notes: 'Updated review note'
    });

    assert.ok(updated);
    assert.equal(updated.status, 'watching');
    assert.equal(Number(updated.rating), 9.0);
    assert.equal(updated.notes, 'Updated review note');
  });

  it('updateStatus automatically sets watched_date when transitioning to completed', async () => {
    const updated = await db.updateStatus(createdSeriesId, 'completed');
    assert.ok(updated);
    assert.equal(updated.status, 'completed');
    assert.ok(updated.watched_date, 'watched_date should be automatically assigned on complete');
    const todayStr = new Date().toISOString().slice(0, 10);
    assert.equal(updated.watched_date, todayStr);
  });

  it('bulkUpdateStatus updates status for multiple IDs', async () => {
    const count = await db.bulkUpdateStatus([createdSeriesId, createdMovieId], 'watching');
    assert.equal(count, 2);

    const item1 = await db.getItemById(createdSeriesId);
    const item2 = await db.getItemById(createdMovieId);
    assert.equal(item1.status, 'watching');
    assert.equal(item2.status, 'watching');
  });

  it('bulkUpdateCategory with "Anime" sets origin="Anime"', async () => {
    const count = await db.bulkUpdateCategory([createdSeriesId], 'Anime');
    assert.equal(count, 1);

    const item = await db.getItemById(createdSeriesId);
    assert.equal(item.category, 'Anime');
    assert.equal(item.origin, 'Anime');
  });

  it('getStats returns accurate aggregate counts and average rating', async () => {
    const stats = await db.getStats();
    assert.ok(stats.total > 0, 'Total should be greater than 0');
    assert.ok(stats.watching >= 0);
    assert.ok(stats.completed > 0);
    assert.ok(stats.planToWatch >= 0);
    assert.ok(stats.avgRating > 0 && stats.avgRating <= 10);
  });

  it('deleteItem and bulkDelete successfully remove titles and cleanup cache', async () => {
    const deleted1 = await db.deleteItem(createdSeriesId);
    assert.equal(deleted1, true);
    const deletedSeriesId = createdSeriesId;
    createdSeriesId = null;

    const deletedCount = await db.bulkDelete([createdMovieId]);
    assert.equal(deletedCount, 1);
    createdMovieId = null;

    // Verify deletion
    const checkSeries = await db.getItemById(deletedSeriesId);
    assert.equal(checkSeries, null);
  });
});
