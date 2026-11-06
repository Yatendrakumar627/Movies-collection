/**
 * tests/ui-components.test.js
 * Unit tests for UI Display Helpers, Subtitle Meta Line, and Card Logic
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Replicate pure UI logic from MediaCard.jsx for direct unit verification
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

function computeMetaSubtitle(item) {
  const contentType = item.content_type || item.type || 'Movie';
  const origin = item.origin || 'Bollywood';
  const metaParts = [];
  if (item.release_year) metaParts.push(item.release_year);
  metaParts.push(contentType);
  metaParts.push(origin);
  return metaParts.join(' · ');
}

function computeStatusBadge(status) {
  return status === 'completed'
    ? 'Watched'
    : status === 'watching'
    ? 'Watching'
    : status === 'dropped'
    ? 'Dropped'
    : 'To Watch';
}

function getStars(score) {
  const num = Math.min(10, Math.max(0, parseFloat(score) || 0));
  const full = Math.floor(num / 2);
  const half = num % 2 >= 1 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

describe('UI Display Helpers & Card Rendering Logic', () => {

  describe('formatDisplayDate()', () => {
    it('formats ISO dates correctly', () => {
      assert.equal(formatDisplayDate('2026-11-06'), '6 Nov 2026');
      assert.equal(formatDisplayDate('2024-01-15'), '15 Jan 2024');
    });

    it('handles empty and null safely', () => {
      assert.equal(formatDisplayDate(null), '');
      assert.equal(formatDisplayDate(''), '');
      assert.equal(formatDisplayDate(undefined), '');
    });
  });

  describe('computeMetaSubtitle() across Dimensions', () => {
    it('formats Anime Series subtitle matching design: "2024 · Web Series · Anime"', () => {
      const animeSeries = {
        title: 'Solo Leveling',
        content_type: 'Web Series',
        origin: 'Anime',
        release_year: 2024
      };
      assert.equal(computeMetaSubtitle(animeSeries), '2024 · Web Series · Anime');
    });

    it('formats Anime Movie subtitle matching design: "2016 · Movie · Anime"', () => {
      const animeMovie = {
        title: 'Your Name',
        content_type: 'Movie',
        origin: 'Anime',
        release_year: 2016
      };
      assert.equal(computeMetaSubtitle(animeMovie), '2016 · Movie · Anime');
    });

    it('formats Bollywood Movie subtitle matching design: "2023 · Movie · Bollywood"', () => {
      const bollywoodMovie = {
        title: '12th Fail',
        content_type: 'Movie',
        origin: 'Bollywood',
        release_year: 2023
      };
      assert.equal(computeMetaSubtitle(bollywoodMovie), '2023 · Movie · Bollywood');
    });

    it('handles missing release_year gracefully without extra bullets', () => {
      const withoutYear = {
        title: 'Secret Project',
        content_type: 'Movie',
        origin: 'Hollywood'
      };
      assert.equal(computeMetaSubtitle(withoutYear), 'Movie · Hollywood');
    });
  });

  describe('computeStatusBadge()', () => {
    it('maps database statuses to UI badge labels', () => {
      assert.equal(computeStatusBadge('completed'), 'Watched');
      assert.equal(computeStatusBadge('watching'), 'Watching');
      assert.equal(computeStatusBadge('plan_to_watch'), 'To Watch');
      assert.equal(computeStatusBadge('dropped'), 'Dropped');
      assert.equal(computeStatusBadge('unknown'), 'To Watch');
    });
  });

  describe('getStars()', () => {
    it('calculates 5-star representation accurately', () => {
      assert.equal(getStars(10), '★★★★★');
      assert.equal(getStars(8), '★★★★☆');
      assert.equal(getStars(7), '★★★½☆');
      assert.equal(getStars(5), '★★½☆☆');
      assert.equal(getStars(0), '☆☆☆☆☆');
    });
  });
});

