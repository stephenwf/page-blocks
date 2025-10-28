import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  banner: {
    js: "'use client'",
  },
  dts: true,
  platform: 'browser',
  target: ['es2020'],
  format: ['esm', 'cjs'],
  external: ['react', 'react-dom', '@tanstack/react-query', 'zod', '@nanostores/react', '@page-blocks/client'],
  ...options,
}));
