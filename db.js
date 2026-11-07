/**
 * db.js
 * Database service layer wrapping /api/_db.js
 * 
 * - Works directly with Neon Serverless Postgres via parameterized queries
 * - 4-Dimensional Architecture:
 *     Dimension 1 — Content Type: Movie, Web Series, Documentary
 *     Dimension 2 — Industry / Origin: Bollywood, Hollywood, Anime, South Indian, Korean, Japanese, Other
 *     Dimension 3 — Availability: Uploaded, Not Uploaded
 *     Dimension 4 — Watch Status: completed, watching, plan_to_watch, dropped
 * - High-speed in-memory cache for instant 0ms-2ms queries
 */

const _db = require('./api/_db');

// In-memory store (fallback if DATABASE_URL is not configured)
let memoryItems = [];
let nextMemoryId = 1;

/**
 * Normalize text for duplicate comparisons: trim, collapse repeated
 * whitespace and lowercase.
 */
function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// High-Performance In-Memory Cache
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
        `SELECT id, title, content_type, origin, availability, category, status, genre, release_year, rating, platform, poster_url, notes, watched_date::text AS watched_date, created_at, updated_at 
         FROM titles 
         ORDER BY id DESC;`
      );
      _cachedLibrary = rows.map(formatRow);
      _cachedTimestamp = now;
      return _cachedLibrary;
    } catch (err) {
      console.warn('[Neon getFullLibrary error, falling back to cache/memory]:', err.message);
      // Prefer the last known good snapshot over an empty list
      if (_cachedLibrary) return _cachedLibrary;
      return memoryItems;
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
        content_type VARCHAR(50) NOT NULL DEFAULT 'Movie',
        origin VARCHAR(50) NOT NULL DEFAULT 'Bollywood',
        availability VARCHAR(50) NOT NULL DEFAULT 'Not Uploaded',
        category VARCHAR(50) NOT NULL DEFAULT 'Movie',
        status VARCHAR(50) NOT NULL DEFAULT 'plan_to_watch',
        genre VARCHAR(100),
        release_year INTEGER,
        rating NUMERIC(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 10),
        platform VARCHAR(100),
        poster_url TEXT,
        notes TEXT,
        watched_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure 4-dimension columns exist
    await _db.query(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'Movie';`);
    await _db.query(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'Bollywood';`);
    await _db.query(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'Not Uploaded';`);
    await _db.query(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS watched_date DATE;`);

    // Ensure indexes
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_content_type ON titles(content_type);`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_origin ON titles(origin);`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_availability ON titles(availability);`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_status ON titles(status);`);
    await _db.query(`CREATE INDEX IF NOT EXISTS idx_titles_watched_date ON titles(watched_date);`);

    console.log('🚀 Neon Database initialized successfully with 4-Dimension schema.');
    // Pre-warm cache
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
  const contentType = r.content_type || 'Movie';
  const origin = r.origin || 'Bollywood';
  const availability = r.availability || 'Not Uploaded';
  const category = r.category || contentType;

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
    content_type: contentType,
    origin,
    availability,
    category,
    type: contentType, // Compatibility
    status: r.status || 'plan_to_watch',
    rating: r.rating != null ? parseFloat(r.rating) : 0.0,
    release_year: r.release_year != null ? parseInt(r.release_year, 10) : null,
    watched_date: formattedWatchedDate
  };
}

/**
 * Get items with parameterized filters (Powered by High-Speed In-Memory Cache)
 */
async function getItems({
  status,
  category,
  type,
  content_type,
  origin,
  availability,
  search,
  sort = 'watched_date_desc',
  watchYear,
  releaseYear
} = {}) {
  const all = await getFullLibrary();
  let list = [...all];

  // 1. Direct Dimension Filters
  if (content_type && content_type !== 'all') {
    const ctLower = content_type.trim().toLowerCase();
    list = list.filter(r => (r.content_type || '').toLowerCase() === ctLower);
  }

  if (origin && origin !== 'all') {
    const oLower = origin.trim().toLowerCase();
    list = list.filter(r => (r.origin || '').toLowerCase() === oLower);
  }

  if (availability && availability !== 'all') {
    const aLower = availability.trim().toLowerCase();
    list = list.filter(r => (r.availability || '').toLowerCase() === aLower);
  }

  if (status && status !== 'all') {
    const normStatus = status === 'watched' ? 'completed' : status === 'to_watch' ? 'plan_to_watch' : status;
    list = list.filter(r => r.status === normStatus);
  }

  // 2. Smart Category Filter (Seamless Multi-View mapping)
  const chosenCategory = category || type;
  if (chosenCategory && chosenCategory !== 'all') {
    const catLower = chosenCategory.trim().toLowerCase();
    if (catLower === 'movies' || catLower === 'movie') {
      list = list.filter(r => (r.content_type || '').toLowerCase() === 'movie');
    } else if (catLower === 'web series' || catLower === 'webseries' || catLower === 'series') {
      list = list.filter(r => (r.content_type || '').toLowerCase() === 'web series');
    } else if (catLower === 'anime') {
      list = list.filter(r => (r.origin || '').toLowerCase() === 'anime' || (r.category || '').toLowerCase() === 'anime' || (r.content_type || '').toLowerCase() === 'anime');
    } else if (catLower === 'documentary') {
      list = list.filter(r => (r.content_type || '').toLowerCase() === 'documentary');
    } else if (catLower === 'bollywood') {
      list = list.filter(r => (r.origin || '').toLowerCase() === 'bollywood');
    } else if (catLower === 'hollywood') {
      list = list.filter(r => (r.origin || '').toLowerCase() === 'hollywood');
    } else if (catLower === 'south' || catLower === 'south indian') {
      list = list.filter(r => (r.origin || '').toLowerCase() === 'south indian');
    } else if (catLower === 'korean') {
      list = list.filter(r => (r.origin || '').toLowerCase() === 'korean');
    } else if (catLower === 'japanese') {
      list = list.filter(r => (r.origin || '').toLowerCase() === 'japanese');
    } else if (catLower === 'uploaded' || catLower === 'uploaded movies') {
      list = list.filter(r => (r.availability || '').toLowerCase() === 'uploaded' && (r.content_type || '').toLowerCase() === 'movie');
    } else if (catLower === 'uploaded web series') {
      list = list.filter(r => (r.availability || '').toLowerCase() === 'uploaded' && (r.content_type || '').toLowerCase() === 'web series');
    } else if (catLower === 'to watch') {
      list = list.filter(r => r.status === 'plan_to_watch');
    } else if (catLower === 'old collection') {
      list = list.filter(r => (r.category || '').toLowerCase() === 'old collection' || (r.availability === 'Uploaded' && r.release_year && r.release_year < 2015));
    } else {
      list = list.filter(r => 
        (r.category && r.category.toLowerCase() === catLower) ||
        (r.content_type && r.content_type.toLowerCase() === catLower) ||
        (r.origin && r.origin.toLowerCase() === catLower)
      );
    }
  }

  // 3. Year Filters
  if (watchYear && watchYear !== 'all') {
    const wy = parseInt(watchYear, 10);
    list = list.filter(r => {
      if (!r.watched_date) return false;
      const yr = parseInt(String(r.watched_date).slice(0, 4), 10);
      return yr === wy;
    });
  }
  if (releaseYear && releaseYear !== 'all') {
    const ry = parseInt(releaseYear, 10);
    list = list.filter(r => r.release_year === ry);
  }

  // 4. Search Filter (Matches Title, Content Type, Origin, Availability, Genre, Platform, Year, Notes)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.content_type && r.content_type.toLowerCase().includes(q)) ||
      (r.origin && r.origin.toLowerCase().includes(q)) ||
      (r.availability && r.availability.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.genre && r.genre.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      (r.platform && r.platform.toLowerCase().includes(q)) ||
      (r.release_year && String(r.release_year).includes(q))
    );
  }

  // 5. Sorting
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
  } else if (sort === 'created_at_desc') {
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
  } else if (sort === 'watched_date_asc') {
    // Oldest Watched: Earliest watched date first; items without watched_date at the end
    list.sort((a, b) => {
      const aHas = Boolean(a.watched_date);
      const bHas = Boolean(b.watched_date);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) {
        const cmp = String(a.watched_date).localeCompare(String(b.watched_date));
        if (cmp !== 0) return cmp;
        return (a.id || 0) - (b.id || 0);
      }
      return (a.id || 0) - (b.id || 0);
    });
  } else {
    // default watched_date_desc: Strict Recent Watched by Chronological Watch Date (newest date first)
    // Items with a watched date appear first; items without a watched date appear at the bottom
    list.sort((a, b) => {
      const aHas = Boolean(a.watched_date);
      const bHas = Boolean(b.watched_date);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) {
        const cmp = String(b.watched_date).localeCompare(String(a.watched_date));
        if (cmp !== 0) return cmp;
        return (b.id || 0) - (a.id || 0);
      }
      return (b.id || 0) - (a.id || 0);
    });
  }

  return list;
}

/**
 * Get single title by ID
 */
async function getItemById(id) {
  if (id == null) return null;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return null;
  if (_db.isConfigured()) {
    const rows = await _db.query('SELECT *, watched_date::text AS watched_date FROM titles WHERE id = $1;', [numId]);
    return rows.length > 0 ? formatRow(rows[0]) : null;
  }
  return memoryItems.find(r => r.id === numId) || null;
}

/**
 * Check if a title already exists within the same content type (case-insensitive & trimmed)
 * @param {string} title
 * @param {string} contentType
 * @param {number|string|null} excludeId
 */
async function findDuplicate(title, contentType = null, excludeId = null) {
  const cleanTitle = normalizeText(title);
  if (!cleanTitle) return null;
  const cleanType = normalizeText(contentType);

  if (_db.isConfigured()) {
    try {
      // REGEXP_REPLACE collapses internal whitespace in stored titles too,
      // so "Some  Movie" and "Some Movie" are treated as the same title.
      let query = `SELECT * FROM titles WHERE LOWER(REGEXP_REPLACE(TRIM(title), '\\s+', ' ', 'g')) = $1`;
      const params = [cleanTitle];
      let paramIndex = 2;

      if (cleanType) {
        query += ` AND LOWER(REGEXP_REPLACE(TRIM(content_type), '\\s+', ' ', 'g')) = $${paramIndex++}`;
        params.push(cleanType);
      }

      if (excludeId != null) {
        const numExclude = parseInt(excludeId, 10);
        if (!isNaN(numExclude)) {
          query += ` AND id != $${paramIndex++}`;
          params.push(numExclude);
        }
      }

      query += ` LIMIT 1;`;
      const rows = await _db.query(query, params);
      if (rows && rows.length > 0) {
        return formatRow(rows[0]);
      }
    } catch (e) {
      console.error('[findDuplicate Neon error]:', e.message);
      throw e;
    }
  }

  // Check in-memory cache / memory items
  const pool = _cachedLibrary || memoryItems;
  return pool.find(item => {
    if (excludeId != null) {
      const numExclude = parseInt(excludeId, 10);
      if (!isNaN(numExclude) && item.id === numExclude) return false;
    }
    const itemTitle = normalizeText(item.title);
    if (itemTitle !== cleanTitle) return false;
    if (cleanType) {
      const itemType = normalizeText(item.content_type || item.type || item.category);
      if (itemType !== cleanType) return false;
    }
    return true;
  }) || null;
}

/**
 * Create new title
 */
async function createItem(data) {
  const contentType = (data.content_type || data.type || 'Movie').trim();
  const origin = (data.origin || 'Bollywood').trim();
  const availability = (data.availability || 'Not Uploaded').trim();
  const category = (data.category || contentType).trim();
  const status = (data.status || 'plan_to_watch').trim();
  const title = (data.title || '').trim();
  const genre = data.genre ? data.genre.trim() : null;
  const releaseYear = data.release_year ? parseInt(data.release_year, 10) : null;
  const rating = data.rating != null ? parseFloat(data.rating) : 0.0;
  const watchedDate = data.watched_date ? data.watched_date.trim() : null;
  const platform = data.platform ? data.platform.trim() : null;
  const posterUrl = data.poster_url ? data.poster_url.trim() : null;
  const notes = data.notes ? data.notes.trim() : null;

  // Prevent duplicate title within same content type
  const duplicate = await findDuplicate(title, contentType);
  if (duplicate) {
    const error = new Error(`"${title}" already exists as a ${duplicate.content_type || 'title'} in your collection.`);
    error.code = 'DUPLICATE_TITLE';
    error.existingItem = duplicate;
    throw error;
  }

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `INSERT INTO titles (title, content_type, origin, availability, category, status, genre, release_year, rating, watched_date, platform, poster_url, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *;`,
        [title, contentType, origin, availability, category, status, genre, releaseYear, rating, watchedDate, platform, posterUrl, notes]
      );
      invalidateCache();
      return formatRow(rows[0]);
    } catch (err) {
      // Surface real database failures instead of silently writing to the
      // (invisible) in-memory store while the database remains unchanged.
      console.error('[Neon createItem error]:', err.message);
      if (err.code === '23505' || /duplicate key|already exists/i.test(err.message || '')) {
        const error = new Error(`"${title}" already exists in your collection.`);
        error.code = 'DUPLICATE_TITLE';
        throw error;
      }
      throw err;
    }
  }

  const newRecord = {
    id: nextMemoryId++,
    title,
    content_type: contentType,
    origin,
    availability,
    category,
    type: contentType,
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
  if (id == null) return null;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return null;
  const contentType = (data.content_type || data.type || 'Movie').trim();
  const origin = (data.origin || 'Bollywood').trim();
  const availability = (data.availability || 'Not Uploaded').trim();
  const category = (data.category || contentType).trim();
  const status = (data.status || 'plan_to_watch').trim();
  const title = (data.title || '').trim();
  const genre = data.genre ? data.genre.trim() : null;
  const releaseYear = data.release_year ? parseInt(data.release_year, 10) : null;
  const rating = data.rating != null ? parseFloat(data.rating) : 0.0;
  const watchedDate = data.watched_date ? data.watched_date.trim() : null;
  const platform = data.platform ? data.platform.trim() : null;
  const posterUrl = data.poster_url ? data.poster_url.trim() : null;
  const notes = data.notes ? data.notes.trim() : null;

  // Load the current row first: editing an item that already has pre-existing
  // duplicates must be allowed as long as its title/type are not being changed.
  const current = await getItemById(numId);
  if (!current) return null;

  const identityChanged =
    normalizeText(current.title) !== normalizeText(title) ||
    normalizeText(current.content_type || current.type) !== normalizeText(contentType);

  if (identityChanged) {
    const duplicate = await findDuplicate(title, contentType, numId);
    if (duplicate) {
      const error = new Error(`"${title}" already exists as a ${duplicate.content_type || 'title'} in your collection.`);
      error.code = 'DUPLICATE_TITLE';
      error.existingItem = duplicate;
      throw error;
    }
  }

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `UPDATE titles
         SET title = $1, content_type = $2, origin = $3, availability = $4, category = $5,
             status = $6, genre = $7, release_year = $8, rating = $9, watched_date = $10,
             platform = $11, poster_url = $12, notes = $13, updated_at = CURRENT_TIMESTAMP
         WHERE id = $14
         RETURNING *;`,
        [title, contentType, origin, availability, category, status, genre, releaseYear, rating, watchedDate, platform, posterUrl, notes, numId]
      );
      invalidateCache();
      return rows.length > 0 ? formatRow(rows[0]) : null;
    } catch (err) {
      // Do not fall back to memory: report the real failure to the caller.
      console.error('[Neon updateItem error]:', err.message);
      throw err;
    }
  }

  const idx = memoryItems.findIndex(r => r.id === numId);
  if (idx === -1) return null;
  memoryItems[idx] = {
    ...memoryItems[idx],
    title,
    content_type: contentType,
    origin,
    availability,
    category,
    type: contentType,
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
  if (id == null) return null;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return null;

  if (_db.isConfigured()) {
    try {
      let query;
      if (newStatus === 'completed') {
        query = `UPDATE titles 
                 SET status = $1, 
                     watched_date = COALESCE(watched_date, CURRENT_DATE), 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 
                 RETURNING *;`;
      } else {
        query = `UPDATE titles 
                 SET status = $1, 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 
                 RETURNING *;`;
      }
      const rows = await _db.query(query, [newStatus, numId]);
      invalidateCache();
      return rows.length > 0 ? formatRow(rows[0]) : null;
    } catch (err) {
      console.error('[Neon updateStatus error]:', err.message);
      throw err;
    }
  }

  const item = memoryItems.find(r => r.id === numId);
  if (!item) return null;
  item.status = newStatus;
  if (newStatus === 'completed' && !item.watched_date) {
    item.watched_date = new Date().toISOString().slice(0, 10);
  }
  item.updated_at = new Date().toISOString();
  invalidateCache();
  return item;
}

/**
 * Delete title
 */
async function deleteItem(id) {
  if (id == null) return false;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return false;

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(`DELETE FROM titles WHERE id = $1 RETURNING id;`, [numId]);
      invalidateCache();
      return rows.length > 0;
    } catch (err) {
      console.error('[Neon deleteItem error]:', err.message);
      throw err;
    }
  }

  const prevLen = memoryItems.length;
  memoryItems = memoryItems.filter(r => r.id !== numId);
  invalidateCache();
  return memoryItems.length < prevLen;
}

/**
 * Bulk update status
 */
async function bulkUpdateStatus(ids, newStatus) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const numIds = ids.map(id => parseInt(id, 10)).filter(Boolean);
  if (numIds.length === 0) return 0;

  if (_db.isConfigured()) {
    try {
      let query;
      if (newStatus === 'completed') {
        query = `UPDATE titles 
                 SET status = $1, 
                     watched_date = COALESCE(watched_date, CURRENT_DATE), 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ANY($2::int[]) 
                 RETURNING id;`;
      } else {
        query = `UPDATE titles 
                 SET status = $1, 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ANY($2::int[]) 
                 RETURNING id;`;
      }
      const rows = await _db.query(query, [newStatus, numIds]);
      invalidateCache();
      return rows.length;
    } catch (err) {
      console.error('[Neon bulkUpdateStatus error]:', err.message);
      throw err;
    }
  }

  let count = 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  memoryItems.forEach(i => {
    if (numIds.includes(i.id)) {
      i.status = newStatus;
      if (newStatus === 'completed' && !i.watched_date) {
        i.watched_date = todayStr;
      }
      i.updated_at = new Date().toISOString();
      count++;
    }
  });
  invalidateCache();
  return count;
}

/**
 * Bulk update category and synchronize 4 dimensions
 */
async function bulkUpdateCategory(ids, newCategory) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const numIds = ids.map(id => parseInt(id, 10)).filter(Boolean);

  const catLower = (newCategory || '').trim().toLowerCase();
  let contentType = null;
  let origin = null;
  let availability = null;
  let status = null;

  if (catLower === 'movies' || catLower === 'movie') {
    contentType = 'Movie';
  } else if (catLower === 'web series' || catLower === 'webseries') {
    contentType = 'Web Series';
  } else if (catLower === 'anime') {
    origin = 'Anime';
  } else if (catLower === 'documentary') {
    contentType = 'Documentary';
  } else if (catLower === 'bollywood') {
    contentType = 'Movie';
    origin = 'Bollywood';
  } else if (catLower === 'hollywood') {
    contentType = 'Movie';
    origin = 'Hollywood';
  } else if (catLower === 'south' || catLower === 'south indian') {
    contentType = 'Movie';
    origin = 'South Indian';
  } else if (catLower === 'uploaded movies') {
    contentType = 'Movie';
    availability = 'Uploaded';
  } else if (catLower === 'uploaded web series') {
    contentType = 'Web Series';
    availability = 'Uploaded';
  } else if (catLower === 'to watch') {
    status = 'plan_to_watch';
  }

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `UPDATE titles 
         SET category = $1,
             content_type = COALESCE($2, content_type),
             origin = COALESCE($3, origin),
             availability = COALESCE($4, availability),
             status = COALESCE($5, status),
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ANY($6::int[]) 
         RETURNING id;`,
        [newCategory, contentType, origin, availability, status, numIds]
      );
      invalidateCache();
      return rows.length;
    } catch (err) {
      console.error('[Neon bulkUpdateCategory error]:', err.message);
      throw err;
    }
  }

  let count = 0;
  memoryItems.forEach(i => {
    if (numIds.includes(i.id)) {
      i.category = newCategory;
      if (contentType) i.content_type = contentType;
      if (origin) i.origin = origin;
      if (availability) i.availability = availability;
      if (status) i.status = status;
      i.type = i.content_type || newCategory;
      i.updated_at = new Date().toISOString();
      count++;
    }
  });
  invalidateCache();
  return count;
}

/**
 * Bulk delete titles
 */
async function bulkDelete(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const numIds = ids.map(id => parseInt(id, 10)).filter(Boolean);

  if (_db.isConfigured()) {
    try {
      const rows = await _db.query(
        `DELETE FROM titles WHERE id = ANY($1::int[]) RETURNING id;`,
        [numIds]
      );
      invalidateCache();
      return rows.length;
    } catch (err) {
      console.error('[Neon bulkDelete error]:', err.message);
      throw err;
    }
  }

  const prevLen = memoryItems.length;
  memoryItems = memoryItems.filter(i => !numIds.includes(i.id));
  invalidateCache();
  return prevLen - memoryItems.length;
}

/**
 * Aggregate summary statistics
 */
async function getStats() {
  const all = await getFullLibrary();
  const total = all.length;
  const watching = all.filter(i => i.status === 'watching').length;
  const completed = all.filter(i => i.status === 'completed').length;
  const planToWatch = all.filter(i => i.status === 'plan_to_watch' || i.status === 'to_watch').length;

  const ratedItems = all.filter(i => i.rating && Number(i.rating) > 0);
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, curr) => acc + Number(curr.rating), 0) / ratedItems.length).toFixed(1)
    : '0.0';

  return {
    total,
    watching,
    completed,
    planToWatch,
    avgRating
  };
}

/**
 * Dynamic filter options for 4 dimensions, watch years, release years, and views
 */
async function getFilterOptions() {
  const all = await getFullLibrary();
  const wYears = Array.from(new Set(all.map(i => i.watched_date ? parseInt(String(i.watched_date).slice(0, 4), 10) : null).filter(Boolean))).sort((a,b) => b-a);
  const rYears = Array.from(new Set(all.map(i => i.release_year).filter(Boolean))).sort((a,b) => b-a);

  return {
    contentTypes: ['Movie', 'Web Series', 'Documentary'],
    origins: ['Bollywood', 'Hollywood', 'Anime', 'South Indian', 'Korean', 'Japanese', 'Other'],
    availabilities: ['Uploaded', 'Not Uploaded'],
    statuses: ['completed', 'watching', 'plan_to_watch', 'dropped'],
    watchYears: wYears,
    releaseYears: rYears,
    categories: [
      'All Categories',
      'Movies',
      'Bollywood',
      'Hollywood',
      'Web series',
      'Anime',
      'South',
      'Documentary',
      'To Watch',
      'Old Collection',
      'Uploaded Movies',
      'Uploaded Web series'
    ]
  };
}

module.exports = {
  initDb,
  healthCheck,
  getItems,
  getItemById,
  findDuplicate,
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
