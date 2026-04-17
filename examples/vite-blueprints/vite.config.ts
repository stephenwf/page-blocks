import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pageBlocks from 'page-blocks/vite';

export default defineConfig({
  plugins: [
    react(),
    pageBlocks({
      contexts: ['pokemon'],
      designs: ['src/designs/**/*.tsx'],
      slotsDir: 'slots-generated',
      staticOutput: 'lazy-files',
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});
