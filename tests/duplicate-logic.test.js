/**
 * tests/duplicate-logic.test.js
 * Unit tests for Duplicate Detection Logic across Content Types
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');

describe('Duplicate Detection Logic', () => {

  it('Detects exact title duplicate within the same content_type', async () => {
    // "Legend of Hanuman - Season 01" is a Web Series
    const match = await db.findDuplicate('Legend of Hanuman - Season 01', 'Web Series');
    assert.ok(match, 'Should detect duplicate for existing Web Series');
    assert.equal(match.content_type, 'Web Series');
  });

  it('Detects duplicate case-insensitively', async () => {
    const match = await db.findDuplicate('legend of hanuman - season 01', 'Web Series');
    assert.ok(match, 'Lowercase title must still be detected as duplicate');
  });

  it('Detects duplicate ignoring extra and trailing whitespace', async () => {
    const match = await db.findDuplicate('   Legend   of   Hanuman - Season 01   ', 'Web Series');
    assert.ok(match, 'Title with irregular whitespace must still be detected as duplicate');
  });

  it('ALLOWS the same title in a DIFFERENT content_type (Movie vs Web Series)', async () => {
    // "Legend of Hanuman - Season 01" exists as a Web Series, but NOT as a Movie
    const match = await db.findDuplicate('Legend of Hanuman - Season 01', 'Movie');
    assert.equal(match, null, 'Same title in a different content_type must NOT be flagged as duplicate');
  });

  it('ALLOWS the same title in Documentary content_type', async () => {
    const match = await db.findDuplicate('Legend of Hanuman - Season 01', 'Documentary');
    assert.equal(match, null, 'Same title in Documentary must NOT be flagged as duplicate');
  });

  it('excludeId prevents an existing item from conflicting with itself during update', async () => {
    const existing = await db.findDuplicate('Legend of Hanuman - Season 01', 'Web Series');
    assert.ok(existing, 'Target item must exist');

    const matchWithExclusion = await db.findDuplicate('Legend of Hanuman - Season 01', 'Web Series', existing.id);
    assert.equal(matchWithExclusion, null, 'Editing an item should not report itself as a duplicate');
  });

  it('Returns null for non-existent titles', async () => {
    const match = await db.findDuplicate('A Completely Non Existent Title 998877', 'Movie');
    assert.equal(match, null, 'Non-existent title should return null');
  });

  it('Returns null for empty or invalid titles', async () => {
    assert.equal(await db.findDuplicate('', 'Movie'), null);
    assert.equal(await db.findDuplicate('   ', 'Movie'), null);
    assert.equal(await db.findDuplicate(null, 'Movie'), null);
    assert.equal(await db.findDuplicate(undefined, 'Movie'), null);
  });
});

