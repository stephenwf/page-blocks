import react from '@vitejs/plugin-react';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import pageBlocks from 'page-blocks/vite';
import { createScreenshotGenerator } from 'page-blocks/screenshots';
import { createTravelSearchResponse } from './src/catalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sendJson(res: ServerResponse<IncomingMessage>, body: unknown) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

function createTravelSearchPlugin(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse<IncomingMessage>, next: () => void) => {
    const url = new URL(req.url || '/', 'http://page-blocks.local');
    if (req.method !== 'GET' || url.pathname !== '/api/travel-search') {
      next();
      return;
    }

    sendJson(res, createTravelSearchResponse(url.searchParams.get('q') || ''));
  };

  return {
    name: 'page-blocks-travel-search',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use(middleware);
      };
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    createTravelSearchPlugin(),
    pageBlocks({
      contexts: ['path', 'country', 'city', 'season'],
      staticOutput: 'lazy-files',
      generateScreenshots: createScreenshotGenerator({
        host: 'http://127.0.0.1:5175',
        archivePath: '/block-archive',
        target: join(__dirname, 'public/blocks'),
      }),
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
    strictPort: true,
  },
});
