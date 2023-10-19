import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  dts: true,
  target: ['es2020', 'chrome58', 'edge16', 'firefox57', 'node16', 'safari11'],
  format: ['esm', 'cjs'],
  external: ['@tanstack/query-core'],
  ...options,
}));
