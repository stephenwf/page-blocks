import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  banner: {
    js: "'use client'",
  },
  dts: true,
  target: ['es2020'],
  format: ['esm', 'cjs'],
  external: ['react', 'react-dom', 'react-query', 'zod', '@nanostores/react', '@page-blocks/client'],
  ...options,
}));
