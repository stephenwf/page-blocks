import {
  CreateSlot,
  DirectoryOptions,
  PageBlocksMutation,
  PageBlocksTarget,
  QuerySubContextBlocksRequest,
  SlotApiRequest,
} from '../core';
import { isPageBlocksReadOnly, mergePageBlocksContext, resolveDirectoryResolver } from '../vite/runtime';
import { readPageBlocksResponse } from './errors';
import { createPageBlocksRemoteClient } from './remote-client';

export type SlotEditingClient = ReturnType<typeof createSlotEditingClient>;

export function createSlotEditingClient(
  options: DirectoryOptions<any>,
  config?: { onMutation?: (req: SlotApiRequest, resp: any) => void | Promise<void> }
) {
  const resolver = () => {
    const resolved = resolveDirectoryResolver(options);
    if (!resolved.endpoint) throw new Error('page-blocks could not resolve an editor endpoint for this build.');
    return resolved;
  };
  const remote = () => createPageBlocksRemoteClient({ endpoint: resolver().endpoint! });
  const target = (slotId: string, parent?: { blockId: string; slotId: string }): PageBlocksTarget =>
    parent
      ? { documentId: parent.slotId, path: [{ blockId: parent.blockId, slot: slotId }] }
      : { documentId: slotId, path: [] };
  const notify = async (request: SlotApiRequest, response: unknown) => {
    await config?.onMutation?.(request, response);
    return response;
  };
  const mutate = async (
    request: SlotApiRequest,
    mutation: PageBlocksMutation,
    slotId: string,
    parent?: { blockId: string; slotId: string }
  ) => {
    if (isPageBlocksReadOnly()) throw new Error('Page Blocks editing is disabled in read-only builds.');
    const client = remote();
    const resolvedTarget = target(slotId, parent);
    const current = await client.get(resolvedTarget);
    const response = await client.mutate(resolvedTarget, current.document.version, mutation);
    await notify(request, response);
    return response;
  };

  return {
    async getSlot(slotId: string, parent?: { blockId: string; slotId: string }) {
      return (await remote().get(target(slotId, parent))).target;
    },
    getSlotList(context: Record<string, string>, slots: string[], _parent?: { blockId: string; slotId: string }) {
      const merged = mergePageBlocksContext((options.context as Record<string, string>) || {}, context);
      return remote().query(merged, slots);
    },
    async updateSlot(slotId: string, data: any, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'update-slot', slotId, data, parent }, { type: 'replace-slot', document: data }, slotId, parent);
      return { success: true as const };
    },
    async createSlot(slot: string, matches: CreateSlot['matches'], parent?: { blockId: string; slotId: string }) {
      if (parent) throw new Error('Cannot create a top-level slot within a block.');
      if (isPageBlocksReadOnly()) throw new Error('Page Blocks editing is disabled in read-only builds.');
      const request = { type: 'create-slot' as const, slot, matches };
      const response = await remote().create({ slot, matches });
      await notify(request, response);
      return response.target;
    },
    async deleteSlot(slotId: string, parent?: { blockId: string; slotId: string }) {
      if (isPageBlocksReadOnly()) throw new Error('Page Blocks editing is disabled in read-only builds.');
      const request = { type: 'delete-slot' as const, slotId, parent };
      const client = remote();
      const resolvedTarget = target(slotId, parent);
      const current = await client.get(resolvedTarget);
      const response = await client.delete(resolvedTarget, current.document.version);
      await notify(request, response);
      return { success: true as const };
    },
    async createBlock(slotId: string, block: any, parent?: { blockId: string; slotId: string }) {
      const response = await mutate(
        { type: 'create-block', slotId, block, parent },
        { type: 'create-block', block },
        slotId,
        parent
      );
      return response.block!;
    },
    async deleteBlock(slotId: string, blockId: string, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'delete-block', slotId, blockId, parent }, { type: 'delete-block', blockId }, slotId, parent);
      return { success: true as const };
    },
    async updateBlock(slotId: string, blockId: string, block: any, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'update-block', slotId, blockId, block, parent }, { type: 'update-block', blockId, block }, slotId, parent);
      return { success: true as const };
    },
    async updateBlockProps(slotId: string, blockId: string, props: any, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'update-block-props', slotId, blockId, props, parent }, { type: 'update-block-props', blockId, props }, slotId, parent);
      return { success: true as const };
    },
    async reorderBlocks(slotId: string, blockIds: string[], parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'reorder-blocks', slotId, blockIds, parent }, { type: 'reorder-blocks', blockIds }, slotId, parent);
      return { success: true as const };
    },
    async updateSlotOptions(slotId: string, slotOptions: any, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'update-slot-options', slotId, options: slotOptions, parent }, { type: 'update-slot-options', options: slotOptions }, slotId, parent);
      return { success: true as const };
    },
    async moveBlockUp(slotId: string, blockId: string, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'move-block-up', slotId, blockId, parent }, { type: 'move-block-up', blockId }, slotId, parent);
      return { success: true as const };
    },
    async moveBlockDown(slotId: string, blockId: string, parent?: { blockId: string; slotId: string }) {
      await mutate({ type: 'move-block-down', slotId, blockId, parent }, { type: 'move-block-down', blockId }, slotId, parent);
      return { success: true as const };
    },
    queryContextValues: (context: string) => remote().contextValues(context),
    querySubContext: (context: Record<string, string>) => remote().subContexts(context),
    querySubContextBlocks: (context: Record<string, string>, queryOptions: QuerySubContextBlocksRequest['options']) =>
      remote().subContextBlocks(context, queryOptions),
    async generateScreenshots() {
      if (isPageBlocksReadOnly()) throw new Error('Page Blocks editing is disabled in read-only builds.');
      const endpoint = `${resolver().endpoint!.replace(/\/$/, '')}/screenshots`;
      const response = await fetch(endpoint, { method: 'POST' });
      await readPageBlocksResponse(response);
      return { success: true as const };
    },
  };
}
