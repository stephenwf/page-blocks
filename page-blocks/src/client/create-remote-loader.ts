import { DirectoryOptions, SlotQueryResponse } from '../core';
import { getPageBlocksViteConfig, loadPageBlocksStaticData, queryPageBlocksStaticData, resolveDirectoryResolver } from '../vite/runtime';
import { createPageBlocksRemoteClient } from './remote-client';

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
    const staticMode = runtimeMode === 'static' || runtimeMode === 'static-files';
    const resolver = staticMode ? undefined : resolveDirectoryResolver(options);
    const key = [
      '@page-blocks/slot-request',
      { slotContext, slots: slotsToRequest, endpoint: resolver?.endpoint || runtimeMode || 'static' },
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

      if (!resolver?.endpoint) {
        throw new Error('page-blocks could not resolve a slot loader endpoint for this build.');
      }

      return createPageBlocksRemoteClient({ endpoint: resolver.endpoint }).query(slotContext, slotsToRequest);
    };

    return [key, getData] as const;
  }) as PageBlocksRemoteLoader;

  loader.getInitialData = (slotContext: Record<string, string>, slotsToRequest: string[]) => {
    const runtimeMode = getRuntimeMode();
    if (runtimeMode === 'static') {
      return getStaticResponse(slotContext, slotsToRequest);
    }

    if (runtimeMode === 'static-files') {
      return queryPageBlocksStaticData(slotContext, slotsToRequest);
    }

    return queryPageBlocksStaticData(slotContext, slotsToRequest);
  };

  return loader;
}
