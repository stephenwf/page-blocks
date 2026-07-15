import { defineConfig } from 'vite';
import pageBlocks from 'page-blocks/vite';

const preview = process.env.PAGE_BLOCKS_CHANNEL === 'preview';

export default defineConfig({
  plugins: [
    pageBlocks({
      mode: preview ? 'preview' : 'static',
      contexts: ['path'],
      staticOutput: 'inline',
      ...(preview ? { preview: { bootstrap: './src/preview-bootstrap.ts' } } : {}),
    }),
  ],
});
