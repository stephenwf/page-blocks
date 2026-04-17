import { SlotResponse } from '../core';
import { atom, computed, onSet } from 'nanostores';

type BlockInstanceEditor = {
  blockId: string;
  blockType: string;
  slotId: string;
  parent?: { blockId: string; slotId: string } | null;
  props: any;
  context: Record<string, string>;
};

type PageBlocksClientStore = ReturnType<typeof createClientStore>;

declare global {
  var __page_blocks_client_store__: PageBlocksClientStore | undefined;
}

function createClientStore() {
  const editingMode = atom(false);
  const currentSlot = atom<SlotResponse | undefined>(undefined);
  const currentBlock = atom<BlockInstanceEditor | undefined>(undefined);
  const currentBlockId = computed(currentBlock, (block) => ({
    blockId: block?.blockId,
    slotId: block?.slotId,
  }));
  const pendingBlockProps = atom<any | undefined>(undefined);
  const previewBlockProps = computed([currentBlock, pendingBlockProps], (block, pending) => {
    if (!block) return undefined;

    if (pending) {
      return pending;
    }

    return block.props || {};
  });
  const currentlyAddingBlock = atom<
    { slotId: string; afterBlockId?: string; parent?: { blockId: string; slotId: string } | null } | undefined
  >(undefined);

  onSet(currentBlock, (block) => {
    if (!block.newValue) {
      pendingBlockProps.set(undefined);
      return;
    }
  });

  onSet(editingMode, (mode) => {
    if (!mode.newValue) {
      currentBlock.set(undefined);
    }
  });

  return {
    editingMode,
    currentSlot,
    currentBlock,
    currentBlockId,
    pendingBlockProps,
    previewBlockProps,
    currentlyAddingBlock,
  };
}

const clientStore = globalThis.__page_blocks_client_store__ || (globalThis.__page_blocks_client_store__ = createClientStore());

export const editingMode = clientStore.editingMode;
export const currentSlot = clientStore.currentSlot;
export const currentBlock = clientStore.currentBlock;
export const currentBlockId = clientStore.currentBlockId;
export const pendingBlockProps = clientStore.pendingBlockProps;
export const previewBlockProps = clientStore.previewBlockProps;
export const currentlyAddingBlock = clientStore.currentlyAddingBlock;
