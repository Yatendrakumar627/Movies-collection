require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { buildExcelWorkbook } = require('./exportExcel');

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// ==============================================================
// VALIDATION HELPERS
// ==============================================================
const CONTENT_TYPES = ['Movie', 'Web Series', 'Documentary'];
const ORIGINS = ['Bollywood', 'Hollywood', 'Anime', 'South Indian', 'Korean', 'Japanese', 'Other'];
const AVAILABILITIES = ['Uploaded', 'Not Uploaded'];
const STATUSES = ['completed', 'watching', 'plan_to_watch', 'dropped'];

function normalizeStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'watched') return 'completed';
  if (s === 'to_watch' || s === 'towatch') return 'plan_to_watch';
  return s;
}

function normalizeDate(value) {
  if (value == null || value === '') return { value: null };
  const str = String(value).trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return { error: 'Watched date must be in YYYY-MM-DD format' };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return { error: 'Watched date is not a valid calendar date' };
  }
  return { value: str };
}

function validateItemPayload(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return { error: 'Title is required' };
  if (title.length > 255) return { error: 'Title must be 255 characters or fewer' };

  const contentType = String(body.content_type || body.type || 'Movie').trim();
  if (!CONTENT_TYPES.includes(contentType)) {
    return { error: `Content type must be one of: ${CONTENT_TYPES.join(', ')}` };
  }

  const origin = String(body.origin || 'Bollywood').trim();
  if (!ORIGINS.includes(origin)) {
    return { error: `Origin must be one of: ${ORIGINS.join(', ')}` };
  }

  const availability = String(body.availability || 'Not Uploaded').trim();
  if (!AVAILABILITIES.includes(availability)) {
    return { error: `Availability must be one of: ${AVAILABILITIES.join(', ')}` };
  }

  const status = normalizeStatus(body.status || 'plan_to_watch');
  if (!STATUSES.includes(status)) {
    return { error: `Status must be one of: ${STATUSES.join(', ')}` };
  }

  let rating = 0;
  if (body.rating !== undefined && body.rating !== null && body.rating !== '') {
    rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
      return { error: 'Rating must be a number between 0 and 10' };
    }
  }

  let releaseYear = null;
  if (body.release_year !== undefined && body.release_year !== null && body.release_year !== '') {
    releaseYear = Number(body.release_year);
    if (!Number.isInteger(releaseYear) || releaseYear < 1888 || releaseYear > 2100) {
      return { error: 'Release year must be a whole number between 1888 and 2100' };
    }
  }

  const watchedDate = normalizeDate(body.watched_date);
  if (watchedDate.error) return { error: watchedDate.error };

  if (body.genre && String(body.genre).length > 100) return { error: 'Genre must be 100 characters or fewer' };
  if (body.platform && String(body.platform).length > 100) return { error: 'Platform must be 100 characters or fewer' };
  if (body.poster_url && String(body.poster_url).length > 2048) return { error: 'Poster URL is too long' };
  if (body.notes && String(body.notes).length > 5000) return { error: 'Notes must be 5000 characters or fewer' };

  return {
    data: {
      ...body,
      title,
      content_type: contentType,
      type: contentType,
      origin,
      availability,
      status,
      rating,
      release_year: releaseYear,
      watched_date: watchedDate.value
    }
  };
}

// Check if Vite production build exists, otherwise serve public
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================================
// REST API ROUTES
// ==============================================================

// Health endpoint: executes "SELECT 1" and returns only { ok: true/false }
app.get('/api/health', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const ok = await db.healthCheck();
  res.status(ok ? 200 : 503).json({ ok });
});

// Get watchlist items with query parameters: status, category, type, content_type, origin, availability, search, sort, watchYear, releaseYear
app.get('/api/items', async (req, res) => {
  try {
    const { status, type, category, content_type, origin, availability, search, sort, watchYear, watch_year, releaseYear, release_year } = req.query;
    const items = await db.getItems({
      status,
      category: category || type,
      content_type,
      origin,
      availability,
      search,
      sort,
      watchYear: watchYear || watch_year,
      releaseYear: releaseYear || release_year
    });
    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err) {
    console.error('Error in GET /api/items:', err);
    res.status(500).json({ error: 'Failed to retrieve watchlist' });
  }
});

// Dynamic filter options endpoint: available timeline watch years and release years
app.get('/api/filter-options', async (req, res) => {
  try {
    const options = await db.getFilterOptions();
    res.json(options);
  } catch (err) {
    console.error('Error in GET /api/filter-options:', err);
    res.status(500).json({ error: 'Failed to retrieve filter options' });
  }
});

// Real-time duplicate check endpoint (Title + Content Type check)
app.get('/api/items/check-duplicate', async (req, res) => {
  try {
    const { title, content_type, contentType, excludeId } = req.query;
    const match = await db.findDuplicate(title, content_type || contentType, excludeId);
    res.json({
      isDuplicate: Boolean(match),
      match: match || null
    });
  } catch (err) {
    console.error('Error checking duplicate:', err);
    res.status(500).json({ error: 'Failed to check duplicate' });
  }
});

// Get single item by ID
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await db.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, item });
  } catch (err) {
    console.error(`Error in GET /api/items/${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
});

// Add new title to watchlist
app.post('/api/items', async (req, res) => {
  try {
    const validation = validateItemPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const data = validation.data;

    const newItem = await db.createItem({
      ...data,
      category: data.category || data.content_type
    });

    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      item: newItem
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_TITLE') {
      return res.status(409).json({ error: err.message, duplicate: true, existingItem: err.existingItem });
    }
    console.error('Error in POST /api/items:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update title details
app.put('/api/items/:id', async (req, res) => {
  try {
    const validation = validateItemPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    const data = validation.data;

    const updated = await db.updateItem(req.params.id, {
      ...data,
      category: data.category || data.content_type
    });

    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      success: true,
      message: 'Item updated successfully',
      item: updated
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_TITLE') {
      return res.status(409).json({ error: err.message, duplicate: true, existingItem: err.existingItem });
    }
    console.error(`Error in PUT /api/items/${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Quick status toggle
app.patch('/api/items/:id/status', async (req, res) => {
  try {
    let { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const cleanStatus = normalizeStatus(status);
    if (!STATUSES.includes(cleanStatus)) {
      return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const updated = await db.updateStatus(req.params.id, cleanStatus);
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      item: updated
    });
  } catch (err) {
    console.error(`Error in PATCH /api/items/${req.params.id}/status:`, err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete title
app.delete('/api/items/:id', async (req, res) => {
  try {
    const deleted = await db.deleteItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      success: true,
      message: 'Item removed from watchlist'
    });
  } catch (err) {
    console.error(`Error in DELETE /api/items/${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Bulk update status
app.post('/api/items/bulk/status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required and must not be empty' });
    }
    if (!status || !status.trim()) {
      return res.status(400).json({ error: 'status is required' });
    }
    const cleanStatus = normalizeStatus(status);
    if (!STATUSES.includes(cleanStatus)) {
      return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const updated = await db.bulkUpdateStatus(ids, cleanStatus);
    const count = typeof updated === 'number' ? updated : (Array.isArray(updated) ? updated.length : 0);
    res.json({
      success: true,
      message: `Updated status for ${count} item(s)`,
      count
    });
  } catch (err) {
    console.error('Error in POST /api/items/bulk/status:', err);
    res.status(500).json({ error: 'Failed to bulk update status' });
  }
});

// Bulk update category
app.post('/api/items/bulk/category', async (req, res) => {
  try {
    const { ids, category } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required and must not be empty' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'category is required' });
    }

    const updated = await db.bulkUpdateCategory(ids, category.trim());
    const count = typeof updated === 'number' ? updated : (Array.isArray(updated) ? updated.length : 0);
    res.json({
      success: true,
      message: `Updated category for ${count} item(s)`,
      count
    });
  } catch (err) {
    console.error('Error in POST /api/items/bulk/category:', err);
    res.status(500).json({ error: 'Failed to bulk update category' });
  }
});

// Bulk delete items
app.post('/api/items/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required and must not be empty' });
    }

    const deletedCount = await db.bulkDelete(ids);
    res.json({
      success: true,
      message: `Removed ${deletedCount} item(s) from watchlist`,
      count: deletedCount
    });
  } catch (err) {
    console.error('Error in POST /api/items/bulk/delete:', err);
    res.status(500).json({ error: 'Failed to bulk delete items' });
  }
});

// Aggregate Dashboard Stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error in GET /api/stats:', err);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Export entire collection to Excel in original spreadsheet pattern
app.get('/api/export/excel', async (req, res) => {
  try {
    const items = await db.getItems({ sort: 'created_at_asc' });
    const wb = await buildExcelWorkbook(items);

    const buffer = await wb.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Watched_Collection.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.send(buffer);
  } catch (err) {
    console.error('Error in GET /api/export/excel:', err);
    res.status(500).json({ error: 'Failed to export Excel spreadsheet' });
  }
});

// Unknown API routes must return JSON instead of the SPA HTML shell
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Centralized error handler (malformed JSON bodies, unexpected failures)
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Fallback to index.html for client-side routing
app.use((req, res) => {
  if (fs.existsSync(distPath)) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ==============================================================
// SERVER BOOTSTRAP
// ==============================================================
async function startServer() {
  await db.initDb();
  const isHealthy = await db.healthCheck();

  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🎬 Watched - Media Tracker & Neon DB Website`);
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`⚡ Neon DB: ${isHealthy ? 'CONNECTED (Cloud Postgres)' : 'DEMO MODE (Set DATABASE_URL in .env)'}`);
    console.log(`==================================================\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
