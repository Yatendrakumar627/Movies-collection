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

// Check if Vite production build exists, otherwise serve public
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// ==============================================================
// REST API ROUTES
// ==============================================================

// Health endpoint: executes "SELECT 1" and returns only { ok: true/false }
app.get('/api/health', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const ok = await db.healthCheck();
  res.status(ok ? 200 : 503).json({ ok });
});

// Get watchlist items with query parameters: status, category, type, search, sort, watchYear, releaseYear
app.get('/api/items', async (req, res) => {
  try {
    const { status, type, category, search, sort, watchYear, watch_year, releaseYear, release_year } = req.query;
    const items = await db.getItems({
      status,
      category: category || type,
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
    const { title, type, category, status, genre, release_year, rating, watched_date, platform, poster_url, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newItem = await db.createItem({
      title: title.trim(),
      type,
      category,
      status,
      genre,
      release_year,
      rating,
      watched_date,
      platform,
      poster_url,
      notes
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
    const { title, type, category, status, genre, release_year, rating, watched_date, platform, poster_url, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const updated = await db.updateItem(req.params.id, {
      title: title.trim(),
      type,
      category,
      status,
      genre,
      release_year,
      rating,
      watched_date,
      platform,
      poster_url,
      notes
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
    const cleanStatus = String(status).trim().toLowerCase() === 'watched' ? 'completed' : String(status).trim();

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
    const cleanStatus = status.trim().toLowerCase() === 'watched' ? 'completed' : status.trim();

    const updated = await db.bulkUpdateStatus(ids, cleanStatus);
    res.json({
      success: true,
      message: `Updated status for ${updated.length} item(s)`,
      count: updated.length,
      items: updated
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
    res.json({
      success: true,
      message: `Updated category for ${updated.length} item(s)`,
      count: updated.length,
      items: updated
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
