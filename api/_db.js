/**
 * /api/_db.js
 * Shared Neon Serverless PostgreSQL Database Client
 * 
 * - Uses @neondatabase/serverless with parameterized queries only
 * - Implements scale-to-zero wake-up retry (retries failed query once after delay)
 * - Exposes healthCheck ('SELECT 1') and parameterized query helpers
 */

// Load environment variables from .env
require('dotenv').config();

const { neon } = require('@neondatabase/serverless');

let _sql = null;
let _connectionString = null;

/**
 * Returns the initialized Neon client or throws if DATABASE_URL is missing
 */
function getClient() {
  const connStr = process.env.DATABASE_URL;

  if (!connStr || connStr.trim() === '' || connStr.includes('your-neon-connection-string')) {
    throw new Error('DATABASE_URL is not configured in .env');
  }

  // Re-initialize only if connection string changed
  if (!_sql || _connectionString !== connStr) {
    _connectionString = connStr;
    _sql = neon(connStr);
  }

  return _sql;
}

/**
 * Retry helper for Neon scale-to-zero cold starts.
 * Neon free compute suspends after 5 minutes of inactivity and wakes on query.
 * If the first request times out or disconnects during spin-up, retry once after a short delay.
 */
async function withRetry(operation, delayMs = 900) {
  try {
    return await operation();
  } catch (err) {
    console.warn(`[Neon DB] Query failed (possible scale-to-zero wake up), retrying in ${delayMs}ms... Error: ${err.message}`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    // Second attempt - if this fails, let the error propagate
    return await operation();
  }
}

/**
 * Parameterized query using sql.query("SELECT ... $1 ...", [param1, ...])
 * Guaranteed parameterized to prevent SQL injection.
 * 
 * @param {string} sqlText - SQL query with $1, $2 placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Array>} Result rows
 */
async function query(sqlText, params = []) {
  const client = getClient();
  return withRetry(async () => {
    return await client.query(sqlText, params);
  });
}

/**
 * Tagged template literal query (e.g. sql`SELECT * FROM titles WHERE id = ${id}`)
 * Safely parameterized by @neondatabase/serverless
 */
async function sql(strings, ...values) {
  const client = getClient();
  return withRetry(async () => {
    return await client(strings, ...values);
  });
}

/**
 * Execute multiple queries in a single atomic Neon transaction
 * @param {Array} queries - Array of queries created via client.query(...)
 */
async function transaction(queries) {
  const client = getClient();
  return withRetry(async () => {
    return await client.transaction(queries);
  });
}

/**
 * Health check: executes "SELECT 1"
 * Returns true if DB is reachable and responsive, false otherwise.
 * Leaks no internal database errors or connection details.
 */
async function healthCheck() {
  try {
    const client = getClient();
    const result = await withRetry(async () => {
      return await client.query('SELECT 1 as ok;');
    }, 600);

    return Array.isArray(result) && result.length > 0;
  } catch (err) {
    // Silent catch: health endpoint must not leak error details
    return false;
  }
}

/**
 * Check if DATABASE_URL is configured
 */
function isConfigured() {
  const conn = process.env.DATABASE_URL;
  return Boolean(conn && conn.trim() && !conn.includes('your-neon-connection-string'));
}

module.exports = {
  getClient,
  query,
  sql,
  transaction,
  healthCheck,
  isConfigured
};

