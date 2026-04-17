import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pageBlocks from 'page-blocks/vite';
import { createScreenshotGenerator } from 'page-blocks/screenshots';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    pageBlocks({
      generateScreenshots: createScreenshotGenerator({
        host: 'http://127.0.0.1:5173',
        archivePath: '/block-archive',
        target: join(__dirname, 'public/blocks'),
      }),
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
