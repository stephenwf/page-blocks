import { createFileSystemLoader } from '../file-system';
import { queryStaticManifest, SlotQueryResponse } from '../core';
import { getPageBlocksStaticManifest, getPageBlocksViteConfig } from './runtime';
import { resolveDefaultPageBlocksContext } from './shared';

const loaders = new Map<string, ReturnType<typeof createFileSystemLoader>>();

function getLoader() {
  const config = getPageBlocksViteConfig();
  if (!config?.slotsDir) {
    return null;
  }

  const key = `${config.slotsDir}::${config.contexts.join('|')}`;
  const cached = loaders.get(key);
  if (cached) {
    return cached;
  }

  const loader = createFileSystemLoader({
    path: config.slotsDir,
    contexts: config.contexts,
  });

  loaders.set(key, loader);
  return loader;
}

export function resolvePageBlocksContext(input: string | URL | Request | { url?: string | URL }) {
  return resolveDefaultPageBlocksContext(input, getPageBlocksViteConfig());
}

export async function loadPageBlocksSlots(
  context: Record<string, string>,
  slots?: string[]
): Promise<SlotQueryResponse> {
  const loader = getLoader();
  if (loader) {
    return loader.query(context, slots);
  }

  const manifest = getPageBlocksStaticManifest();
  if (manifest) {
    return queryStaticManifest(manifest, context, slots);
  }

  throw new Error('page-blocks/vite/server is not configured. Add the pageBlocks() plugin to your Vite config.');
}
