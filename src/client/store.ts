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
  const editorStatus = atom<'idle' | 'saving' | 'saved' | 'offline' | 'expired' | 'conflict' | 'error'>('idle');
  const editorError = atom<unknown>(undefined);
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
    editorStatus,
    editorError,
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
export const editorStatus = clientStore.editorStatus;
export const editorError = clientStore.editorError;

export async function trackPageBlocksWrite<Result>(run: () => Promise<Result>) {
  editorStatus.set('saving');
  editorError.set(undefined);
  try {
    const result = await run();
    editorStatus.set('saved');
    return result;
  } catch (error) {
    editorError.set(error);
    const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
    editorStatus.set(status === 401 ? 'expired' : status === 409 ? 'conflict' : status ? 'error' : 'offline');
    throw error;
  }
}
