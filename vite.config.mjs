import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-public-static',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = (req.url || '').split('?')[0];
          if (rawUrl === '/' || rawUrl === '/index.html') {
            return next();
          }
          const publicFile = path.join(process.cwd(), 'public', rawUrl.replace(/^\//, ''));
          if (fs.existsSync(publicFile) && fs.statSync(publicFile).isFile()) {
            const ext = path.extname(publicFile).toLowerCase();
            const mimeTypes = {
              '.svg': 'image/svg+xml',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.ico': 'image/x-icon',
              '.json': 'application/json',
              '.webmanifest': 'application/manifest+json'
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            return fs.createReadStream(publicFile).pipe(res);
          }
          next();
        });
      }
    }
  ],
  publicDir: false,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
