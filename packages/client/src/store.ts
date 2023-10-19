import { SlotResponse } from '@page-blocks/core';
import { atom, computed, onSet } from 'nanostores';

type BlockInstanceEditor = {
  blockId: string;
  blockType: string;
  slotId: string;
  parent?: { blockId: string; slotId: string } | null;
  props: any;
  context: Record<string, string>;
};

export const editingMode = atom(false);

export const currentSlot = atom<SlotResponse | undefined>(undefined);
export const currentBlock = atom<BlockInstanceEditor | undefined>(undefined);

export const currentBlockId = computed(currentBlock, (block) => ({
  blockId: block?.blockId,
  slotId: block?.slotId,
}));

export const pendingBlockProps = atom<any | undefined>(undefined);

export const previewBlockProps = computed([currentBlock, pendingBlockProps], (block, pending) => {
  if (!block) return undefined;

  if (pending) {
    return pending;
  }

  return block.props || {};
});

export const currentlyAddingBlock = atom<
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
