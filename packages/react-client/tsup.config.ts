import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  banner: {
    js: "'use client'",
  },
  dts: true,
  platform: 'browser',
  target: ['es2020'],
  format: ['esm', 'cjs'],
  ...options,
}));
