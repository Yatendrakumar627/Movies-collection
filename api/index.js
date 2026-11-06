/**
 * api/index.js
 * Vercel Serverless Function entry point
 * 
 * Bridges Express REST API and Neon Database to Vercel's serverless edge.
 * Runs completely on Vercel without requiring any separate backend server.
 */

const app = require('../server');

module.exports = app;

