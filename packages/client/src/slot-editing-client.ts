import { BlockApiRequest, CreateSlot, DirectoryOptions, SlotApiRequest, SlotRequest } from '@page-blocks/core';

export type SlotEditingClient = ReturnType<typeof createSlotEditingClient>;

export function createSlotEditingClient(
  options: DirectoryOptions<any>,
  config?: { onMutation?: (req: SlotApiRequest, resp: any) => void | Promise<void> }
) {
  //
  const makeRequest = async (req: SlotApiRequest) => {
    const response = await fetch(options.resolver.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then((res) => res.json());

    if (config && config.onMutation) {
      await config.onMutation(req, response);
    }
    return response;
  };

  return {
    getSlot: (slotId: string, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'get-slot', slotId, parent });
    },
    getSlotList: (context: any, slots: string[], parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'request-slots', context, slots, parent });
    },
    updateSlot: (slotId: string, data: any, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'update-slot', slotId, data, parent });
    },
    createSlot: (slot: string, matches: CreateSlot['matches'], parent?: { blockId: string; slotId: string }) => {
      if (parent) {
        throw new Error('Cannot create slot within a block.');
      }
      return makeRequest({ type: 'create-slot', slot, matches });
    },
    deleteSlot: (slotId: string, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'delete-slot', slotId, parent });
    },
    createBlock: (slotId: string, block: any, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'create-block', slotId, block, parent });
    },
    deleteBlock: (slotId: string, blockId: string, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'delete-block', slotId, blockId, parent });
    },
    updateBlock: (slotId: string, blockId: string, block: any, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'update-block', slotId, blockId, block, parent });
    },
    updateBlockProps: (slotId: string, blockId: string, props: any, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'update-block-props', slotId, blockId, props, parent });
    },
    reorderBlocks: (slotId: string, blockIds: string[], parent?: { blockId: string; slotId: string }) => {
      // queryClient.invalidateQueries(['slot', slotId]);
      return makeRequest({ type: 'reorder-blocks', slotId, blockIds, parent });
    },
    updateSlotOptions: (slotId: string, options: any, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'update-slot-options', slotId, options, parent });
    },
    moveBlockUp: (slotId: string, blockId: string, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'move-block-up', slotId, blockId, parent });
    },
    moveBlockDown: (slotId: string, blockId: string, parent?: { blockId: string; slotId: string }) => {
      return makeRequest({ type: 'move-block-down', slotId, blockId, parent });
    },
    generateScreenshots() {
      return makeRequest({ type: 'generate-screenshots' });
    },
  };
}
