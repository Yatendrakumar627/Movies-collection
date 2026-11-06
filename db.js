/**
 * db.js
 * Database service layer wrapping /api/_db.js
 * 
 * - Works directly with Neon Serverless Postgres via parameterized queries
 * - Uses the "titles" table with "category" column
 * - Graceful fallback to demo in-memory store if DATABASE_URL is not yet provided
 */

const _db = require('./api/_db');

// Sample in-memory items for instant local demo before Neon credentials are provided
const fallbackDemoTitles = [
  {
    title: 'Interstellar',
    category: 'Movie',
    status: 'completed',
    genre: 'Sci-Fi, Adventure, Drama',
    release_year: 2014,
    rating: 9.4,
    platform: 'Paramount+',
    poster_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80',
    notes: 'A journey through a wormhole near Saturn. The docking scene with Hans Zimmer\'s No Time for Caution is peak cinema.'
  },
  {
    title: 'Severance',
    category: 'TV Show',
    status: 'watching',
    genre: 'Sci-Fi, Thriller, Mystery',
    release_year: 2022,
    rating: 9.0,
    platform: 'Apple TV+',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    notes: 'Lumon Industries work-life balance taken to the absolute extreme. Cliffhanger season finale.'
  },
  {
    title: 'Arcane',
    category: 'Anime',
    status: 'completed',
    genre: 'Animation, Action, Sci-Fi',
    release_year: 2021,
    rating: 9.8,
    platform: 'Netflix',
    poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    notes: 'Visually stunning depiction of Piltover and Zaun. Incredible score and emotional voice acting.'
  },
  {
    title: 'Dune: Part Two',
    category: 'Movie',
    status: 'completed',
    genre: 'Sci-Fi, Adventure',
    release_year: 2024,
    rating: 9.2,
    platform: 'HBO Max',
    poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    notes: 'Denis Villeneuve delivers an immaculate adaptation of Frank Herbert\'s desert epic.'
  },
  {
    title: 'The Bear',
    category: 'TV Show',
    status: 'plan_to_watch',
    genre: 'Drama, Comedy',
    release_year: 2022,
    rating: 8.8,
    platform: 'Hulu',
    poster_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    notes: 'High intensity culinary drama in a Chicago Italian beef sandwich shop.'
  }
];

let memoryItems = fallbackDemoTitles.map((item, idx) => ({
  id: idx + 1,
  ...item,
  type: item.category,
  created_at: new Date(Date.now() - idx * 86400000).toISOString(),
  updated_at: new Date().toISOString()
}));
let nextMemoryId = memoryItems.length + 1;

// High-Performance In-Memory Cache for 0ms-2ms Instantaneous Response
let _cachedLibrary = null;
let _cachedTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

function invalidateCache() {
  _cachedLibrary = null;
  _cachedTimestamp = 0;
}

async function getFullLibrary(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cachedLibrary && (now - _cachedTimestamp < CACHE_TTL_MS)) {
    return _cachedLibrary;
  }

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        'SELECT id, title, category, status, genre, release_year, rating, platform, poster_url, notes, watched_date::text AS watched_date, created_at, updated_at FROM titles ORDER BY id DESC;'
      );
      _cachedLibrary = rows.map(formatRow);
      _cachedTimestamp = now;
      return _cachedLibrary;
    } catch (err) {
      console.warn('[Neon getFullLibrary error, falling back to memory]:', err.message);
    }
  }

  return memoryItems;
}

/**
 * Initialize Database & Table Schema
 */
async function initDb() {
  if (!_db.isConfigured()) {
    console.log('⚡ Running in local demo mode. Add DATABASE_URL to .env to connect to Neon.');
    return;
  }

  try {
    console.log('🔌 Connecting to Neon Serverless PostgreSQL...');
    await _db.query(`
      CREATE TABLE IF NOT EXISTS titles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'Movie',
        status VARCHAR(50) NOT NULL DEFAULT 'plan_to_watch',
        genre VARCHAR(100),
        release_year INTEGER,
        rating NUMERIC(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 10),
        platform VARCHAR(100),
        poster_url TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_status ON titles(status);`);
    await _db.query(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS watched_date DATE;`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_watched_date ON titles(watched_date);`);

    console.log('🚀 Neon Database initialized successfully.');
    // Pre-warm high-speed in-memory cache in background
    getFullLibrary(true).then(list => console.log(`⚡ In-memory cache warmed up with ${list.length} titles.`)).catch(() => {});
  } catch (err) {
    console.warn(`[Neon DB init warning]: ${err.message}. Running fallback mode.`);
  }
}

/**
 * Health check delegator
 */
async function healthCheck() {
  if (!_db.isConfigured()) {
    return false;
  }
  return await _db.healthCheck();
}

/**
 * Format PostgreSQL row
 */
function formatRow(r) {
  if (!r) return null;
  const category = r.category || r.type || 'Movie';
  let formattedWatchedDate = null;
  if (r.watched_date) {
    if (typeof r.watched_date === 'string') {
      formattedWatchedDate = r.watched_date.slice(0, 10);
    } else if (r.watched_date instanceof Date) {
      const yr = r.watched_date.getFullYear();
      const mo = String(r.watched_date.getMonth() + 1).padStart(2, '0');
      const da = String(r.watched_date.getDate()).padStart(2, '0');
      formattedWatchedDate = `${yr}-${mo}-${da}`;
    }
  }

  return {
    ...r,
    id: parseInt(r.id, 10),
    category,
    type: category, // Keep compatibility with type-based filters
    rating: r.rating != null ? parseFloat(r.rating) : 0.0,
    release_year: r.release_year != null ? parseInt(r.release_year, 10) : null,
    watched_date: formattedWatchedDate
  };
}

/**
 * Get items with parameterized filters (Powered by High-Speed In-Memory Cache)
 */
async function getItems({ status, category, type, search, sort, watchYear, releaseYear } = {}) {
  const chosenCategory = category || type;
  const all = await getFullLibrary();
  let list = [...all];

  if (status && status !== 'all') {
    const normStatus = status === 'watched' ? 'completed' : status;
    list = list.filter(r => r.status === normStatus);
  }
  if (chosenCategory && chosenCategory !== 'all') {
    list = list.filter(r => r.category === chosenCategory || r.type === chosenCategory);
  }
  if (watchYear && watchYear !== 'all') {
    const wy = parseInt(watchYear, 10);
    list = list.filter(r => r.watched_date && new Date(r.watched_date).getFullYear() === wy);
  }
  if (releaseYear && releaseYear !== 'all') {
    const ry = parseInt(releaseYear, 10);
    list = list.filter(r => r.release_year === ry);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.genre && r.genre.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      (r.platform && r.platform.toLowerCase().includes(q))
    );
  }

  if (sort === 'created_at_asc') {
    list.sort((a, b) => (a.id || 0) - (b.id || 0));
  } else if (sort === 'rating_desc') {
    list.sort((a, b) => {
      const aVal = a.rating != null ? Number(a.rating) : -1;
      const bVal = b.rating != null ? Number(b.rating) : -1;
      if (bVal !== aVal) return bVal - aVal;
      return (b.id || 0) - (a.id || 0);
    });
  } else if (sort === 'rating_asc') {
    list.sort((a, b) => {
      const aHas = a.rating != null && Number(a.rating) > 0;
      const bHas = b.rating != null && Number(b.rating) > 0;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return (a.id || 0) - (b.id || 0);
      if (a.rating !== b.rating) return Number(a.rating) - Number(b.rating);
      return (a.id || 0) - (b.id || 0);
    });
  } else if (sort === 'title_asc') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || '') || (a.id || 0) - (b.id || 0));
  } else if (sort === 'title_desc') {
    list.sort((a, b) => (b.title || '').localeCompare(a.title || '') || (b.id || 0) - (a.id || 0));
  } else if (sort === 'year_desc' || sort === 'release_year_desc') {
    list.sort((a, b) => {
      const aHas = a.release_year != null;
      const bHas = b.release_year != null;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return (b.id || 0) - (a.id || 0);
      return b.release_year - a.release_year || (b.id || 0) - (a.id || 0);
    });
  } else if (sort === 'year_asc' || sort === 'release_year_asc') {
    list.sort((a, b) => {
      const aHas = a.release_year != null;
      const bHas = b.release_year != null;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return (a.id || 0) - (b.id || 0);
      return a.release_year - b.release_year || (a.id || 0) - (b.id || 0);
    });
  } else if (sort === 'watched_date_desc') {
    list.sort((a, b) => {
      const aHas = Boolean(a.watched_date);
      const bHas = Boolean(b.watched_date);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return (b.id || 0) - (a.id || 0);
      return new Date(b.watched_date) - new Date(a.watched_date) || (b.id || 0) - (a.id || 0);
    });
  } else if (sort === 'watched_date_asc') {
    list.sort((a, b) => {
      const aHas = Boolean(a.watched_date);
      const bHas = Boolean(b.watched_date);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return (a.id || 0) - (b.id || 0);
      return new Date(a.watched_date) - new Date(b.watched_date) || (a.id || 0) - (b.id || 0);
    });
  } else {
    // default created_at_desc
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  return list;
}

/**
 * Get single title by ID
 */
async function getItemById(id) {
  const numId = parseInt(id, 10);
  if (_db.isConfigured()) {
    try {
      const rows = await _db.query('SELECT *, watched_date::text AS watched_date FROM titles WHERE id = $1;', [numId]);
      return rows.length > 0 ? formatRow(rows[0]) : null;
    } catch (err) {
      console.warn('[Neon getItemById error]:', err.message);
    }
  }
  return memoryItems.find(r => r.id === numId) || null;
}

/**
 * Check if a title already exists (case-insensitive & trimmed)
 */
async function findDuplicate(title, excludeId = null) {
  const cleanTitle = (title || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!cleanTitle) return null;

  if (_db.isConfigured()) {
    try {
      let query = `SELECT * FROM titles WHERE LOWER(TRIM(title)) = $1`;
      const params = [cleanTitle];
      if (excludeId != null) {
        query += ` AND id != $2`;
        params.push(parseInt(excludeId, 10));
      }
      query += ` LIMIT 1;`;
      const rows = await _db.query(query, params);
      if (rows && rows.length > 0) {
        return formatRow(rows[0]);
      }
    } catch (e) {
      console.warn('[findDuplicate Neon error]:', e.message);
    }
  }

  // Check in-memory cache / memory items
  const pool = _cachedLibrary || memoryItems;
  return pool.find(item => {
    if (excludeId != null && item.id === parseInt(excludeId, 10)) return false;
    const itemTitle = (item.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
    return itemTitle === cleanTitle;
  }) || null;
}

/**
 * Create new title
 */
async function createItem(data) {
  const category = (data.category || data.type || 'Movie').trim();
  const status = (data.status || 'plan_to_watch').trim();
  const title = (data.title || '').trim();
  const genre = data.genre ? data.genre.trim() : null;
  const releaseYear = data.release_year ? parseInt(data.release_year, 10) : null;
  const rating = data.rating != null ? parseFloat(data.rating) : 0.0;
  const watchedDate = data.watched_date ? data.watched_date.trim() : null;
  const platform = data.platform ? data.platform.trim() : null;
  const posterUrl = data.poster_url ? data.poster_url.trim() : null;
  const notes = data.notes ? data.notes.trim() : null;

  // Prevent duplicate title (case-insensitive)
  const duplicate = await findDuplicate(title);
  if (duplicate) {
    const error = new Error(`"${title}" already exists in your collection (Category: ${duplicate.category || duplicate.type || 'Watchlist'}).`);
    error.code = 'DUPLICATE_TITLE';
    error.existingItem = duplicate;
    throw error;
  }

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `INSERT INTO titles (title, category, status, genre, release_year, rating, watched_date, platform, poster_url, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *;`,
        [title, category, status, genre, releaseYear, rating, watchedDate, platform, posterUrl, notes]
      );
      invalidateCache();
      return formatRow(rows[0]);
    } catch (err) {
      console.warn('[Neon createItem error]:', err.message);
      if (err.message && err.message.includes('duplicate')) {
        const error = new Error(`"${title}" already exists in your collection.`);
        error.code = 'DUPLICATE_TITLE';
        throw error;
      }
    }
  }

  const newRecord = {
    id: nextMemoryId++,
    title,
    category,
    type: category,
    status,
    genre,
    release_year: releaseYear,
    rating,
    watched_date: watchedDate,
    platform,
    poster_url: posterUrl,
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  memoryItems.unshift(newRecord);
  invalidateCache();
  return newRecord;
}

/**
 * Update title
 */
async function updateItem(id, data) {
  const numId = parseInt(id, 10);
  const category = (data.category || data.type || 'Movie').trim();
  const status = (data.status || 'plan_to_watch').trim();
  const title = (data.title || '').trim();
  const genre = data.genre ? data.genre.trim() : null;
  const releaseYear = data.release_year ? parseInt(data.release_year, 10) : null;
  const rating = data.rating != null ? parseFloat(data.rating) : 0.0;
  const watchedDate = data.watched_date ? data.watched_date.trim() : null;
  const platform = data.platform ? data.platform.trim() : null;
  const posterUrl = data.poster_url ? data.poster_url.trim() : null;
  const notes = data.notes ? data.notes.trim() : null;

  // Prevent duplicate title (case-insensitive, excluding self)
  const duplicate = await findDuplicate(title, numId);
  if (duplicate) {
    const error = new Error(`"${title}" already exists in your collection (Category: ${duplicate.category || duplicate.type || 'Watchlist'}).`);
    error.code = 'DUPLICATE_TITLE';
    error.existingItem = duplicate;
    throw error;
  }

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `UPDATE titles
         SET title = $1, category = $2, status = $3, genre = $4, release_year = $5,
             rating = $6, watched_date = $7, platform = $8, poster_url = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
         WHERE id = $11
         RETURNING *;`,
        [title, category, status, genre, releaseYear, rating, watchedDate, platform, posterUrl, notes, numId]
      );
      invalidateCache();
      return rows.length > 0 ? formatRow(rows[0]) : null;
    } catch (err) {
      console.warn('[Neon updateItem error]:', err.message);
    }
  }

  const idx = memoryItems.findIndex(r => r.id === numId);
  if (idx === -1) return null;
  memoryItems[idx] = {
    ...memoryItems[idx],
    title,
    category,
    type: category,
    status,
    genre,
    release_year: releaseYear,
    rating,
    watched_date: watchedDate,
    platform,
    poster_url: posterUrl,
    notes,
    updated_at: new Date().toISOString()
  };
  invalidateCache();
  return memoryItems[idx];
}

/**
 * Quick update status
 */
async function updateStatus(id, newStatus) {
  const numId = parseInt(id, 10);
  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `UPDATE titles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;`,
        [newStatus, numId]
      );
      invalidateCache();
      return rows.length > 0 ? formatRow(rows[0]) : null;
    } catch (err) {
      console.warn('[Neon updateStatus error]:', err.message);
    }
  }

  const item = memoryItems.find(r => r.id === numId);
  if (!item) return null;
  item.status = newStatus;
  item.updated_at = new Date().toISOString();
  invalidateCache();
  return item;
}

/**
 * Delete title
 */
async function deleteItem(id) {
  const numId = parseInt(id, 10);
  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(`DELETE FROM titles WHERE id = $1 RETURNING id;`, [numId]);
      invalidateCache();
      return rows.length > 0;
    } catch (err) {
      console.warn('[Neon deleteItem error]:', err.message);
    }
  }

  const prevLen = memoryItems.length;
  memoryItems = memoryItems.filter(r => r.id !== numId);
  invalidateCache();
  return memoryItems.length < prevLen;
}

/**
 * Bulk update watch status for multiple titles
 * @param {Array<number>} ids
 * @param {string} newStatus
 */
async function bulkUpdateStatus(ids, newStatus) {
  if (!Array.isArray(ids) || ids.length === 0 || !newStatus) return [];
  const cleanIds = ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
  if (cleanIds.length === 0) return [];

  if (_db.isConfigured()) {
    try {
      const placeholders = cleanIds.map((_, i) => '$' + (i + 2)).join(', ');
      const sqlText = `UPDATE titles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) RETURNING *;`;
      const rows = await _db.query(sqlText, [newStatus, ...cleanIds]);
      invalidateCache();
      return rows.map(formatRow);
    } catch (err) {
      console.warn('[Neon bulkUpdateStatus error]:', err.message);
    }
  }

  // Fallback
  const idSet = new Set(cleanIds);
  const updated = [];
  for (const item of memoryItems) {
    if (idSet.has(item.id)) {
      item.status = newStatus;
      item.updated_at = new Date().toISOString();
      updated.push(item);
    }
  }
  invalidateCache();
  return updated;
}

/**
 * Bulk update category for multiple titles
 * @param {Array<number>} ids
 * @param {string} newCategory
 */
async function bulkUpdateCategory(ids, newCategory) {
  if (!Array.isArray(ids) || ids.length === 0 || !newCategory) return [];
  const cleanIds = ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
  if (cleanIds.length === 0) return [];

  if (_db.isConfigured()) {
    try {
      const placeholders = cleanIds.map((_, i) => '$' + (i + 2)).join(', ');
      const sqlText = `UPDATE titles SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) RETURNING *;`;
      const rows = await _db.query(sqlText, [newCategory, ...cleanIds]);
      invalidateCache();
      return rows.map(formatRow);
    } catch (err) {
      console.warn('[Neon bulkUpdateCategory error]:', err.message);
    }
  }

  // Fallback
  const idSet = new Set(cleanIds);
  const updated = [];
  for (const item of memoryItems) {
    if (idSet.has(item.id)) {
      item.category = newCategory;
      item.type = newCategory;
      item.updated_at = new Date().toISOString();
      updated.push(item);
    }
  }
  invalidateCache();
  return updated;
}

/**
 * Bulk delete multiple titles
 * @param {Array<number>} ids
 */
async function bulkDelete(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const cleanIds = ids.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
  if (cleanIds.length === 0) return 0;

  if (_db.isConfigured()) {
    try {
      const placeholders = cleanIds.map((_, i) => '$' + (i + 1)).join(', ');
      const sqlText = `DELETE FROM titles WHERE id IN (${placeholders}) RETURNING id;`;
      const rows = await _db.query(sqlText, cleanIds);
      invalidateCache();
      return rows.length;
    } catch (err) {
      console.warn('[Neon bulkDelete error]:', err.message);
    }
  }

  // Fallback
  const idSet = new Set(cleanIds);
  const prevLen = memoryItems.length;
  memoryItems = memoryItems.filter(r => !idSet.has(r.id));
  invalidateCache();
  return prevLen - memoryItems.length;
}

/**
 * Aggregate stats
 */
/**
 * Aggregate stats (Instantaneous in-memory lookup)
 */
async function getStats() {
  const all = await getFullLibrary();
  const total = all.length;
  const watching = all.filter(i => i.status === 'watching').length;
  const completed = all.filter(i => i.status === 'completed').length;
  const planToWatch = all.filter(i => i.status === 'plan_to_watch').length;

  const ratedItems = all.filter(i => i.rating && Number(i.rating) > 0);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, curr) => acc + Number(curr.rating), 0) / ratedItems.length).toFixed(1)
    : '7.7';

  return {
    total,
    watching,
    completed,
    planToWatch,
    avgRating
  };
}

/**
 * Dynamic filter options for timeline watch years and release years (Instantaneous in-memory lookup)
 */
async function getFilterOptions() {
  const all = await getFullLibrary();
  const wYears = Array.from(new Set(all.map(i => i.watched_date ? new Date(i.watched_date).getFullYear() : null).filter(Boolean))).sort((a,b) => b-a);
  const rYears = Array.from(new Set(all.map(i => i.release_year).filter(Boolean))).sort((a,b) => b-a);
  const cats = Array.from(new Set(all.map(i => i.category).filter(Boolean))).sort();
  return { watchYears: wYears, releaseYears: rYears, categories: cats };
}

module.exports = {
  initDb,
  healthCheck,
  getItems,
  getItemById,
  createItem,
  updateItem,
  updateStatus,
  deleteItem,
  bulkUpdateStatus,
  bulkUpdateCategory,
  bulkDelete,
  getStats,
  getFilterOptions
};
