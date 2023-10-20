import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  dts: true,
  target: ['es2020'],
  format: ['esm', 'cjs'],
  platform: 'browser',
  external: [
    'react',
    'react-dom',
    'react-query',
    'zod',
    '@nanostores/react',
    '@page-blocks/client',
    '@page-blocks/react-client',
  ],
  ...options,
}));
