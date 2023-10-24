import {
  BlockResponse,
  BlockWithOptionalSlotResponse,
  BlockWithSlotResponse,
  FullSlotLoader,
  SlotLoader,
} from '@page-blocks/core';

export function loaderAdapter(loader: SlotLoader & Partial<FullSlotLoader>): FullSlotLoader {
  async function getBlockSlots(slotId: string, blockId: string, slotName: string) {
    const parentSlot = await loader.find(slotId);
    const parentBlock = parentSlot.blocks.find((b: any) => b.id === blockId);
    if (!parentBlock) {
      throw new Error('Parent block not found');
    }

    parentBlock.slots = parentBlock.slots || {};
    parentBlock.slots[slotName] = parentBlock.slots[slotName] || {
      slot_id: slotName,
      blocks: [],
    };

    return [parentBlock as BlockWithSlotResponse, async () => await loader.update(slotId, parentSlot)] as const;
  }

  return {
    createInnerSlot: async (slotId: string, slot: string, parent: { slotId: string; blockId: string }) => {
      const parentSlot = await loader.find(parent!.slotId);

      const parentBlock = parentSlot.blocks.find((b: any) => b.id === parent.blockId);
      if (!parentBlock) {
        throw new Error('Parent block not found');
      }

      parentBlock.slots = parentBlock.slots || {};
      parentBlock.slots[slot] = parentBlock.slots[slot] || {
        slot_id: slotId,
        blocks: [],
      };

      await loader.update(parent.slotId, parentSlot);
    },
    deleteInnerSlot: async (slotId: string, parent: { slotId: string; blockId: string }) => {
      const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

      if (parentBlock.slots) {
        delete parentBlock.slots[slotId];
      }

      await updateParentSlot();
    },
    updateInnerSlot: async (slotId: string, data: any, parent: { slotId: string; blockId: string }) => {
      const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

      if (parentBlock.slots) {
        parentBlock.slots[slotId] = data;
      }

      await updateParentSlot();
    },

    createBlock: async (slotId: string, block: any, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);
        if (!parentBlock.slots) {
          parentBlock.slots = {};
        }

        parentBlock.slots[slotId].blocks.push(block);
        await updateParentSlot();
        return block;
      }

      const slot = await loader.find(slotId);
      slot.blocks.push(block);
      await loader.update(slotId, slot);

      return block;
    },
    deleteBlock: async (slotId: string, blockId: string, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

        parentBlock.slots[slotId].blocks = parentBlock.slots[slotId].blocks.filter(
          (block: any) => block.id !== blockId
        );
        await updateParentSlot();
        return;
      }

      const slot = await loader.find(slotId);
      slot.blocks = slot.blocks.filter((block: any) => block.id !== blockId);
      await loader.update(slotId, slot);
    },
    updateBlock: async (slotId: string, blockId: string, block: any, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

        parentBlock.slots[slotId].blocks = parentBlock.slots[slotId].blocks.map((b: any) =>
          b.id === blockId ? block : b
        );
        await updateParentSlot();
        return;
      }

      const slot = await loader.find(slotId);
      slot.blocks = slot.blocks.map((b: any) => (b.id === blockId ? block : b));
      await loader.update(slotId, slot);
    },
    updateBlockProps: async (slotId: string, blockId: string, props: any, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);
        parentBlock.slots[slotId].blocks = parentBlock.slots[slotId].blocks.map((b: any) =>
          b.id === blockId ? { ...b, data: props } : b
        );
        await updateParentSlot();
        return;
      }

      if (!slotId) {
        throw new Error('slotId not provided');
      }

      const slot = await loader.find(slotId);

      slot.blocks = slot.blocks.map((b: any) => (b.id === blockId ? { ...b, data: props } : b));
      await loader.update(slotId, slot);
    },
    reorderBlocks: async (slotId: string, blockIds: string[], parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

        parentBlock.slots[slotId].blocks = blockIds
          .map((id: string) => parentBlock.slots[slotId].blocks.find((b: any) => b.id === id))
          .filter(Boolean) as BlockResponse[];

        await updateParentSlot();

        return;
      }

      if (!slotId) {
        throw new Error('slotId not provided');
      }

      const slot = await loader.find(slotId);
      slot.blocks = slot.blocks || [];
      slot.blocks = blockIds
        .map((id: string) => slot.blocks.find((b: any) => b.id === id))
        .filter(Boolean) as BlockResponse[];

      await loader.update(slotId, slot);
    },
    updateSlotOptions: async (slotId: string, details: any, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

        parentBlock.slots[slotId].options = details;
        await updateParentSlot();
      }

      const slot = await loader.find(slotId);
      slot.options = details;
      await loader.update(slotId, slot);
    },
    moveBlockUp: async (slotId: string, blockId: string, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

        const index = parentBlock.slots[slotId].blocks.findIndex((b: any) => b.id === blockId);
        if (index === -1) {
          return;
        }
        if (index > 0) {
          const tmp = parentBlock.slots[slotId].blocks[index - 1];
          parentBlock.slots[slotId].blocks[index - 1] = parentBlock.slots[slotId].blocks[index];
          parentBlock.slots[slotId].blocks[index] = tmp;
          await updateParentSlot();
        }
        return;
      }

      const slot = await loader.find(slotId);
      const index = slot.blocks.findIndex((b: any) => b.id === blockId);
      if (index === -1) {
        return;
      }
      if (index > 0) {
        const tmp = slot.blocks[index - 1];
        slot.blocks[index - 1] = slot.blocks[index];
        slot.blocks[index] = tmp;
        await loader.update(slotId, slot);
      }
    },
    moveBlockDown: async (slotId: string, blockId: string, parent) => {
      if (parent) {
        const [parentBlock, updateParentSlot] = await getBlockSlots(parent.slotId, parent.blockId, slotId);

        const index = parentBlock.slots[slotId].blocks.findIndex((b: any) => b.id === blockId);
        if (index === -1) {
          return;
        }
        if (index < parentBlock.slots[slotId].blocks.length - 1) {
          const tmp = parentBlock.slots[slotId].blocks[index + 1];
          parentBlock.slots[slotId].blocks[index + 1] = parentBlock.slots[slotId].blocks[index];
          parentBlock.slots[slotId].blocks[index] = tmp;
          await updateParentSlot();
        }
        return;
      }

      const slot = await loader.find(slotId);
      const index = slot.blocks.findIndex((b: any) => b.id === blockId);
      if (index === -1) {
        return;
      }
      if (index < slot.blocks.length - 1) {
        const tmp = slot.blocks[index + 1];
        slot.blocks[index + 1] = slot.blocks[index];
        slot.blocks[index] = tmp;
        await loader.update(slotId, slot);
      }
    },
    async querySubContextBlocks(
      context: Record<string, string>,
      query?: {
        searchValue?: string;
        slotIds?: string[];
        blockTypes?: string[];
      }
    ): Promise<Array<{ context: Record<string, string>; blocks: BlockWithOptionalSlotResponse[] }>> {
      const allMatches = [];

      const foundSubContexts = await loader.querySubContext(context);
      for (const subContext of foundSubContexts) {
        const fullContext = { ...context, ...subContext };
        const matches = await loader.query(fullContext, query?.slotIds);
        const foundBlocks = [];
        for (const slot of matches.slots) {
          const blocks = slot.blocks.filter((block: any) => {
            if (query?.blockTypes && !query.blockTypes.includes(block.type)) {
              return false;
            }
            if (query?.searchValue) {
              // @todo search value filtering.
            }
            return true;
          });
          foundBlocks.push(...blocks);
        }

        allMatches.push({ context: fullContext, blocks: foundBlocks });
      }

      return allMatches;
    },
    ...loader,
  };
}
