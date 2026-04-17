import type {
  PageBlocksRuntimeConfig,
  PageBlocksStaticFilesRuntimeManifest,
  PageBlocksStaticRuntimeManifest,
} from './shared';

declare global {
  var __PAGE_BLOCKS_VITE_CONFIG__: PageBlocksRuntimeConfig | undefined;
  var __PAGE_BLOCKS_VITE_STATIC_MANIFEST__: PageBlocksStaticRuntimeManifest | undefined;
  var __PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__: PageBlocksStaticFilesRuntimeManifest | undefined;
  var __PAGE_BLOCKS_VITE_STATIC_MODE__: boolean | undefined;
}

export {};
