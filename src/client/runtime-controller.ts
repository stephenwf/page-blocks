import type { PageBlocksRemoteClient } from './remote-client';
import type { PageBlocksRuntimeConfig } from '../vite/shared';

export interface PageBlocksCapabilities {
  read: boolean;
  edit: boolean;
}

export interface PageBlocksRuntimeSnapshot {
  source: 'baked' | 'local' | 'remote';
  generation: number;
  capabilities: PageBlocksCapabilities;
}

export interface PageBlocksRemoteSession {
  client: PageBlocksRemoteClient;
  capabilities?: Partial<PageBlocksCapabilities>;
}

type RuntimeController = ReturnType<typeof createRuntimeController>;

declare global {
  var __page_blocks_runtime__: RuntimeController | undefined;
}

function initialSnapshot(config?: PageBlocksRuntimeConfig): PageBlocksRuntimeSnapshot {
  if (config?.mode === 'local') {
    return { source: 'local', generation: 0, capabilities: { read: true, edit: true } };
  }
  return { source: 'baked', generation: 0, capabilities: { read: true, edit: false } };
}

function createRuntimeController() {
  let config = globalThis.__PAGE_BLOCKS_VITE_CONFIG__ as PageBlocksRuntimeConfig | undefined;
  let snapshot = initialSnapshot(config);
  let remoteClient: PageBlocksRemoteClient | undefined;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());
  const synchronize = () => {
    const nextConfig = globalThis.__PAGE_BLOCKS_VITE_CONFIG__ as PageBlocksRuntimeConfig | undefined;
    if (nextConfig === config) return;
    config = nextConfig;
    remoteClient = undefined;
    snapshot = initialSnapshot(config);
    emit();
  };

  return {
    getSnapshot() {
      synchronize();
      return snapshot;
    },
    getRemoteClient() {
      synchronize();
      return remoteClient;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    useRemote(session: PageBlocksRemoteSession) {
      remoteClient = session.client;
      snapshot = {
        source: 'remote',
        generation: snapshot.generation + 1,
        capabilities: {
          read: session.capabilities?.read ?? true,
          edit: session.capabilities?.edit ?? false,
        },
      };
      emit();
    },
    useStatic() {
      remoteClient = undefined;
      snapshot = {
        source: 'baked',
        generation: snapshot.generation + 1,
        capabilities: { read: true, edit: false },
      };
      emit();
    },
  };
}

export function getPageBlocksRuntime() {
  return globalThis.__page_blocks_runtime__ || (globalThis.__page_blocks_runtime__ = createRuntimeController());
}

export type PageBlocksRuntime = ReturnType<typeof getPageBlocksRuntime>;

export interface PageBlocksPreviewBootstrapContext {
  runtime: PageBlocksRuntime;
  loadEditor: () => Promise<typeof import('../editor')>;
}

export type PageBlocksPreviewBootstrap = (
  context: PageBlocksPreviewBootstrapContext
) => void | (() => void) | Promise<void | (() => void)>;

export async function startPageBlocksPreview(
  bootstrap: PageBlocksPreviewBootstrap,
  loadEditor: () => Promise<typeof import('../editor')> = () => import('../editor')
) {
  const runtime = getPageBlocksRuntime();
  const cleanup = await bootstrap({
    runtime,
    loadEditor,
  });
  return () => {
    cleanup?.();
    runtime.useStatic();
  };
}
