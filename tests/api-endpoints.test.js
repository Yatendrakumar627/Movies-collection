/**
 * tests/api-endpoints.test.js
 * Unit & Integration tests for Express REST API Endpoints
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

describe('REST API Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/health returns 200 and { ok: true }', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  it('GET /api/filter-options returns 4-dimensions and categories list', async () => {
    const res = await fetch(`${baseUrl}/api/filter-options`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.contentTypes, ['Movie', 'Web Series', 'Documentary']);
    assert.ok(data.origins.includes('Anime'));
    assert.ok(data.origins.includes('Bollywood'));
    assert.deepEqual(data.availabilities, ['Uploaded', 'Not Uploaded']);
    assert.deepEqual(data.statuses, ['completed', 'watching', 'plan_to_watch', 'dropped']);
    assert.ok(Array.isArray(data.categories));
  });

  it('GET /api/items?category=Anime returns 71 items', async () => {
    const res = await fetch(`${baseUrl}/api/items?category=Anime`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.count, 71);
    assert.equal(data.items.length, 71);
    for (const item of data.items) {
      assert.equal(item.origin, 'Anime');
    }
  });

  it('GET /api/items/check-duplicate returns isDuplicate: true for existing title & content_type', async () => {
    const params = new URLSearchParams({
      title: 'Legend of Hanuman - Season 01',
      content_type: 'Web Series'
    });
    const res = await fetch(`${baseUrl}/api/items/check-duplicate?${params.toString()}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.isDuplicate, true);
    assert.ok(data.match);
  });

  it('GET /api/items/check-duplicate returns isDuplicate: false for different content_type', async () => {
    const params = new URLSearchParams({
      title: 'Legend of Hanuman - Season 01',
      content_type: 'Documentary'
    });
    const res = await fetch(`${baseUrl}/api/items/check-duplicate?${params.toString()}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.isDuplicate, false);
    assert.equal(data.match, null);
  });

  it('POST /api/items rejects empty title with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  it('POST /api/items rejects duplicate title with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Legend of Hanuman - Season 01',
        content_type: 'Web Series'
      })
    });
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.duplicate, true);
  });

  it('POST /api/items/bulk/status returns valid numeric count (not undefined)', async () => {
    const res = await fetch(`${baseUrl}/api/items/bulk/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [1], status: 'completed' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.count, 'number');
    assert.ok(data.count >= 0);
    assert.ok(data.message.includes(`Updated status for ${data.count} item(s)`));
  });

  it('POST /api/items/bulk/category returns valid numeric count (not undefined)', async () => {
    const res = await fetch(`${baseUrl}/api/items/bulk/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [1], category: 'Bollywood' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(typeof data.count, 'number');
    assert.ok(data.count >= 0);
    assert.ok(data.message.includes(`Updated category for ${data.count} item(s)`));
  });

  it('GET /api/stats returns valid aggregate metrics', async () => {
    const res = await fetch(`${baseUrl}/api/stats`);
    assert.equal(res.status, 200);
    const stats = await res.json();
    assert.ok(stats.total > 0);
    assert.ok(stats.completed > 0);
    assert.ok(stats.avgRating > 0);
  });

  it('GET /api/export/excel returns binary XLSX file with proper download headers', async () => {
    const res = await fetch(`${baseUrl}/api/export/excel`);
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    assert.ok(res.headers.get('content-disposition').includes('Watched_Collection.xlsx'));
    const arrayBuffer = await res.arrayBuffer();
    assert.ok(arrayBuffer.byteLength > 1000, 'Excel file must have non-trivial size');
  });
});

