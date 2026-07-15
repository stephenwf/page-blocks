import {
  BlockResolver,
  DirectoryOptions,
  findSlotManifestMatch,
  normalizeSlotResponse,
  queryStaticManifest,
  SlotQueryResponse,
  SlotResponse,
} from '../core';
import {
  PageBlocksRuntimeConfig,
  PageBlocksStaticFilesManifestEntry,
  PageBlocksStaticFilesRuntimeManifest,
  PageBlocksStaticRuntimeManifest,
  resolveDefaultPageBlocksContext,
} from './shared';
import { getPageBlocksRuntime } from '../client/runtime-controller';

const staticFileResponseCache = new Map<string, SlotResponse>();
const staticFileRequestCache = new Map<string, Promise<SlotResponse | null>>();

function isStaticRuntimeMode(mode: PageBlocksRuntimeConfig['mode'] | undefined) {
  return mode === 'static';
}

export function isPageBlocksStaticMode() {
  return isStaticRuntimeMode(getPageBlocksViteConfig()?.mode) || globalThis.__PAGE_BLOCKS_VITE_STATIC_MODE__ || false;
}

export function getPageBlocksViteConfig() {
  return globalThis.__PAGE_BLOCKS_VITE_CONFIG__ as PageBlocksRuntimeConfig | undefined;
}

export function getPageBlocksStaticManifest() {
  return globalThis.__PAGE_BLOCKS_VITE_STATIC_MANIFEST__ as PageBlocksStaticRuntimeManifest | undefined;
}

export function getPageBlocksStaticFilesManifest() {
  return globalThis.__PAGE_BLOCKS_VITE_STATIC_FILES_MANIFEST__ as PageBlocksStaticFilesRuntimeManifest | undefined;
}

export function isPageBlocksReadOnly() {
  const config = getPageBlocksViteConfig();
  if (config?.mode === 'preview') return !getPageBlocksRuntime().getSnapshot().capabilities.edit;
  return config?.readOnly || false;
}

export function resolveDirectoryResolver(
  options: Pick<DirectoryOptions<any, any>, 'resolver' | 'screenshots'> = {}
): BlockResolver {
  const runtimeConfig = getPageBlocksViteConfig();
  const screenshots = options.resolver?.screenshots || options.screenshots || runtimeConfig?.screenshots;

  const source = getPageBlocksRuntime().getSnapshot().source;
  if (isStaticRuntimeMode(runtimeConfig?.mode) || (runtimeConfig?.mode === 'preview' && source !== 'remote')) {
    return {
      ...(options.resolver || { type: 'tanstack-query' as const }),
      endpoint: undefined,
      screenshots,
    };
  }

  if (options.resolver) {
    return {
      ...options.resolver,
      endpoint: options.resolver.endpoint || runtimeConfig?.apiPath,
      screenshots,
    };
  }

  return {
    type: 'tanstack-query',
    endpoint: runtimeConfig?.apiPath,
    screenshots,
  };
}

export function mergePageBlocksContext(...contexts: Array<Record<string, string> | undefined>) {
  const runtimeConfig = getPageBlocksViteConfig();
  const defaultSource =
    typeof window !== 'undefined' ? window.location.pathname : globalThis.location?.pathname;
  const defaultContext = resolveDefaultPageBlocksContext(defaultSource, runtimeConfig);

  return Object.assign({}, defaultContext, ...contexts.filter(Boolean));
}

function createSlotQueryResponse(
  context: Record<string, string>,
  slots: Record<string, SlotResponse>
): SlotQueryResponse {
  const slotNames = Object.keys(slots);

  return {
    slots,
    isEmpty: slotNames.length === 0,
    slotNames,
    context,
  };
}

function resolveStaticFilesMatch(
  context: Record<string, string>,
  slots?: string[]
) {
  const manifest = getPageBlocksStaticFilesManifest();
  if (!manifest) {
    return undefined;
  }

  return {
    manifest,
    matches: findSlotManifestMatch(manifest.contexts, context, manifest.entries, slots),
  };
}

function resolvePageBlocksDocumentBase() {
  const source =
    (typeof document !== 'undefined' && document.baseURI) ||
    (typeof window !== 'undefined' && window.location?.href) ||
    globalThis.location?.href ||
    'http://page-blocks.local/';

  return new URL(source);
}

function resolvePageBlocksStaticFileUrl(file: string) {
  const basePath = getPageBlocksViteConfig()?.basePath || '/';
  const baseUrl = new URL(basePath, resolvePageBlocksDocumentBase());
  return new URL(file, baseUrl).toString();
}

function warnStaticFileLoadFailure(
  file: string,
  context: Record<string, string>,
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  console.warn(
    `[page-blocks] failed to load static slot file "${file}" for context ${JSON.stringify(context)}: ${message}`
  );
}

async function loadStaticFileSlot(
  match: PageBlocksStaticFilesManifestEntry,
  context: Record<string, string>
) {
  const cached = staticFileResponseCache.get(match.file);
  if (cached) {
    return cached;
  }

  const pending = staticFileRequestCache.get(match.file);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const response = await fetch(resolvePageBlocksStaticFileUrl(match.file));
    if (!response.ok) {
      warnStaticFileLoadFailure(match.file, context, `${response.status} ${response.statusText}`.trim());
      return null;
    }

    const json = await response.json();
    const slot = normalizeSlotResponse(match.id, match.slot, json);
    staticFileResponseCache.set(match.file, slot);
    return slot;
  })()
    .catch((error) => {
      warnStaticFileLoadFailure(match.file, context, error);
      return null;
    })
    .finally(() => {
      staticFileRequestCache.delete(match.file);
    });

  staticFileRequestCache.set(match.file, request);
  return request;
}

function getCachedStaticFilesData(
  context: Record<string, string>,
  slots?: string[]
): SlotQueryResponse | undefined {
  const resolved = resolveStaticFilesMatch(context, slots);
  if (!resolved) {
    return undefined;
  }

  const responseSlots: Record<string, SlotResponse> = {};
  for (const slotName of Object.keys(resolved.matches.slots)) {
    const match = resolved.matches.slots[slotName];
    const slot = staticFileResponseCache.get(match.file);
    if (!slot) {
      return undefined;
    }

    responseSlots[slotName] = normalizeSlotResponse(match.id, match.slot, slot);
  }

  return createSlotQueryResponse(resolved.matches.context, responseSlots);
}

async function loadStaticFilesData(
  context: Record<string, string>,
  slots?: string[]
): Promise<SlotQueryResponse | undefined> {
  const resolved = resolveStaticFilesMatch(context, slots);
  if (!resolved) {
    return undefined;
  }

  const responseSlots: Record<string, SlotResponse> = {};

  await Promise.all(
    Object.keys(resolved.matches.slots).map(async (slotName) => {
      const match = resolved.matches.slots[slotName];
      const slot = await loadStaticFileSlot(match, resolved.matches.context);
      if (!slot) {
        return;
      }

      responseSlots[slotName] = normalizeSlotResponse(match.id, match.slot, slot);
    })
  );

  return createSlotQueryResponse(resolved.matches.context, responseSlots);
}

export function queryPageBlocksStaticData(
  context: Record<string, string>,
  slots?: string[]
): SlotQueryResponse | undefined {
  const manifest = getPageBlocksStaticManifest();
  if (!manifest) {
    return getCachedStaticFilesData(context, slots);
  }

  return queryStaticManifest(manifest, context, slots);
}

export async function loadPageBlocksStaticData(
  context: Record<string, string>,
  slots?: string[]
): Promise<SlotQueryResponse | undefined> {
  const manifest = getPageBlocksStaticManifest();
  if (manifest) {
    return queryStaticManifest(manifest, context, slots);
  }

  return loadStaticFilesData(context, slots);
}
