/**
 * /api/health
 * Neon Database Health Endpoint
 * 
 * Runs "SELECT 1" and returns only { ok: true/false } with zero internal details leaked.
 * Compatible with Vercel Serverless Functions.
 */

const { healthCheck } = require('./_db');

module.exports = async function handler(req, res) {
  // Set no-cache headers for accurate live status
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  const ok = await healthCheck();
  return res.status(ok ? 200 : 503).json({ ok });
};

