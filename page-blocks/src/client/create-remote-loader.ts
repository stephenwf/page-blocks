import { DirectoryOptions, SlotQueryResponse } from '../core';
import { getPageBlocksViteConfig, loadPageBlocksStaticData, queryPageBlocksStaticData, resolveDirectoryResolver } from '../vite/runtime';
import { createPageBlocksRemoteClient } from './remote-client';
import { getPageBlocksRuntime } from './runtime-controller';

export type PageBlocksRemoteLoader = ((
  slotContext: Record<string, string>,
  slotsToRequest: string[]
) => readonly [readonly unknown[], () => Promise<SlotQueryResponse>]) & {
  getInitialData?: (slotContext: Record<string, string>, slotsToRequest: string[]) => SlotQueryResponse | undefined;
};

export function createRemoteLoader(options: DirectoryOptions<any, any>) {
  const getRuntimeMode = () => getPageBlocksViteConfig()?.mode;
  const getStaticResponse = (slotContext: Record<string, string>, slotsToRequest: string[]): SlotQueryResponse =>
    queryPageBlocksStaticData(slotContext, slotsToRequest) || {
      slots: {},
      isEmpty: true,
      slotNames: [],
      context: slotContext,
    };

  const loader = ((slotContext: Record<string, string>, slotsToRequest: string[]) => {
    const runtimeMode = getRuntimeMode();
    const runtime = getPageBlocksRuntime();
    const runtimeSnapshot = runtime.getSnapshot();
    const staticMode = runtimeMode === 'static' || (runtimeMode === 'preview' && runtimeSnapshot.source === 'baked');
    const resolver = staticMode ? undefined : resolveDirectoryResolver(options);
    const key = [
      '@page-blocks/slot-request',
      {
        slotContext,
        slots: slotsToRequest,
        endpoint: resolver?.endpoint || runtimeMode || 'static',
        source: runtimeSnapshot.source,
        generation: runtimeSnapshot.generation,
      },
    ] as const;

    const getData = async () => {
      if (staticMode) {
        return (
          (await loadPageBlocksStaticData(slotContext, slotsToRequest)) || {
            slots: {},
            isEmpty: true,
            slotNames: [],
            context: slotContext,
          }
        );
      }

      const remoteClient = runtimeSnapshot.source === 'remote' ? runtime.getRemoteClient() : undefined;
      if (remoteClient) return remoteClient.query(slotContext, slotsToRequest);

      if (!resolver?.endpoint) {
        throw new Error('page-blocks could not resolve a slot loader endpoint for this build.');
      }

      return createPageBlocksRemoteClient({ endpoint: resolver.endpoint }).query(slotContext, slotsToRequest);
    };

    return [key, getData] as const;
  }) as PageBlocksRemoteLoader;

  loader.getInitialData = (slotContext: Record<string, string>, slotsToRequest: string[]) => {
    const runtimeMode = getRuntimeMode();
    if (getPageBlocksViteConfig()?.staticOutput === 'lazy-files') {
      return queryPageBlocksStaticData(slotContext, slotsToRequest);
    }
    if (runtimeMode === 'static' || runtimeMode === 'preview') {
      return getStaticResponse(slotContext, slotsToRequest);
    }

    return queryPageBlocksStaticData(slotContext, slotsToRequest);
  };

  return loader;
}
