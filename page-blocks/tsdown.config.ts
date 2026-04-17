import { defineConfig } from 'tsdown';

const formats = ['esm', 'cjs'] as const;

function config(entry: string | Record<string, string>, outDir: string, options: Record<string, unknown> = {}) {
  return {
    entry: typeof entry === 'string' ? { index: entry } : entry,
    outDir,
    dts: true,
    format: formats,
    target: 'es2020',
    ...options,
  };
}

export default defineConfig([
  config('src/core/index.ts', 'dist/core'),
  config('src/client/index.ts', 'dist/client', {
    platform: 'browser',
  }),
  config('src/node/index.ts', 'dist/node', {
    platform: 'node',
    target: 'node18',
  }),
  config('src/next/index.ts', 'dist/next', {
    platform: 'node',
    target: 'node18',
  }),
  config('src/file-system/index.ts', 'dist/file-system', {
    platform: 'node',
    target: 'node18',
  }),
  config('src/designer/index.ts', 'dist/designer', {
    platform: 'node',
    target: 'node18',
  }),
  config('src/screenshots/index.ts', 'dist/screenshots', {
    platform: 'node',
    target: 'node18',
  }),
  config(
    {
      index: 'src/vite/index.ts',
      server: 'src/vite/server.ts',
    },
    'dist/vite',
    {
    platform: 'node',
    target: 'node18',
    }
  ),
  config('src/react-client/index.ts', 'dist/react-client', {
    platform: 'browser',
    unbundle: true,
  }),
  config('src/react/index.ts', 'dist/react', {
    platform: 'browser',
    unbundle: true,
  }),
  config('src/react-editor/index.tsx', 'dist/react-editor', {
    platform: 'browser',
    treeshake: false,
    unbundle: true,
  }),
  config('src/web-components/index.ts', 'dist/web-components', {
    platform: 'browser',
    treeshake: false,
  }),
]);
