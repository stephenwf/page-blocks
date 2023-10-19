import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  dts: true,
  banner: {
    js: "'use client'",
  },
  target: ['es2020'],
  format: ['esm', 'cjs'],
  external: [
    'react',
    'react-dom',
    'react-query',
    'zod',
    '@nanostores/react',
    'nanostores',
    '@page-blocks/client',
    'zod',
  ],
  ...options,
}));
