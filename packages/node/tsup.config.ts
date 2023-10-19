import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  dts: true,
  target: ['node16'],
  format: ['esm', 'cjs'],
  ...options,
}));
