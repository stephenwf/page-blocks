import { ContextFlatNode, normalizeSlotPathname, PageBlocksStaticManifest } from '../core';

export const pageBlocksViteConfigDefine = 'globalThis.__PAGE_BLOCKS_VITE_CONFIG__';
export const pageBlocksStaticManifestDefine = 'globalThis.__PAGE_BLOCKS_VITE_STATIC_MANIFEST__';
export const pageBlocksStaticFilesManifestDefine = 'globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__';
export const pageBlocksStaticModeDefine = 'globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__';

export interface PageBlocksViteOptions {
  mode?: 'auto' | 'local' | 'static' | 'preview';
  slotsDir?: string;
  apiPath?: string;
  contexts?: string[];
  screenshots?: string;
  designs?: string | string[];
  staticOutput?: 'inline' | 'lazy-files';
  staticAssetDir?: string;
  generateScreenshots?: () => Promise<void>;
  preview?: {
    bootstrap: string;
  };
}

export interface PageBlocksStaticFilesManifestEntry extends ContextFlatNode {
  file: string;
}

export interface PageBlocksStaticFilesRuntimeManifest {
  contexts: string[];
  entries: PageBlocksStaticFilesManifestEntry[];
}

export interface PageBlocksRuntimeConfig {
  mode: 'local' | 'static' | 'preview';
  staticOutput?: 'inline' | 'lazy-files';
  readOnly: boolean;
  apiPath?: string;
  root?: string;
  slotsDir?: string;
  contexts: string[];
  screenshots?: string;
  basePath?: string;
  defaultContexts: Array<'path'>;
}

export interface ResolvedPageBlocksViteOptions extends PageBlocksRuntimeConfig {
  configuredMode: 'auto' | 'local' | 'static' | 'preview';
  slotsDir: string;
  apiPath: string;
  root: string;
  staticOutput: 'inline' | 'lazy-files';
  staticAssetDir: string;
}

export type PageBlocksStaticRuntimeManifest = PageBlocksStaticManifest;

export function normalizePageBlocksPathname(pathname: string) {
  return normalizeSlotPathname(pathname);
}

export function toPageBlocksPathname(
  input?: string | URL | Request | { url?: string | URL } | null
): string | undefined {
  if (!input) {
    return undefined;
  }

  if (typeof input === 'string') {
    if (input.startsWith('/')) {
      return normalizePageBlocksPathname(input);
    }

    return normalizePageBlocksPathname(new URL(input, 'http://page-blocks.local').pathname);
  }

  if (input instanceof URL) {
    return normalizePageBlocksPathname(input.pathname);
  }

  if ('url' in input && input.url) {
    return toPageBlocksPathname(input.url);
  }

  return undefined;
}

export function resolveDefaultPageBlocksContext(
  input: string | URL | Request | { url?: string | URL } | undefined | null,
  config?: Pick<PageBlocksRuntimeConfig, 'defaultContexts'>
) {
  const context: Record<string, string> = {};
  const defaults = config?.defaultContexts || [];

  if (defaults.includes('path')) {
    const pathname = toPageBlocksPathname(input);
    if (pathname) {
      context.path = pathname;
    }
  }

  return context;
}
