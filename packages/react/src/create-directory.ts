import { BlockConfig, blockSymbol, DirectoryOptions, InferBlocks } from '@page-blocks/core';
import { Blocks } from './types';
import { FC } from 'react';
import { ComputeSlot, createSlot } from './create-slot';
import { createBlockArchive } from './create-block-archive';
import { createBlockEditor } from './create-block-editor';
import { createBlockEditorElement as _createBlockEditorElement } from '@page-blocks/client';
import { createSlotContext } from './create-slot-context';
import { SlotContextProps } from '@page-blocks/react-client';

export type Directory<Options extends DirectoryOptions<any, any>> = Options & {
  Slot: ComputeSlot<InferBlocks<Options>>;
  Blocks: Options['blocks'];
  BlockArchive: FC;
  BlockEditor: FC<{ showToggle?: boolean }>;
  createBlockEditorElement: (query?: any) => HTMLElement;
  SlotContext: FC<SlotContextProps>;
  metadata: Record<keyof Options['blocks'], BlockConfig>;
};

export function createDirectory<B extends Blocks, Context, O extends DirectoryOptions<B, Context>>(
  options: O
): Directory<O> {
  const blocks = options.blocks;
  const blockKeys: Array<keyof O['blocks']> = Object.keys(blocks);
  const _Slot = createSlot(options) as any;
  const BlockArchive = createBlockArchive(options);
  const BlockEditor = createBlockEditor(options);
  const createBlockEditorElement = _createBlockEditorElement(options);
  const { loader, SlotContext } = createSlotContext(options);
  const metadata = {} as Record<keyof O['blocks'], BlockConfig>;

  for (const key of blockKeys) {
    // Check if it's a module.
    let block = blocks[key];
    if ((block as any).default) {
      let config = (block as any).config;
      block = (block as any).default;
      (block as any)[blockSymbol] = config;
    }

    _Slot[key] = blocks[key];
    metadata[key] = blocks[key][blockSymbol];
  }

  const Slot = _Slot as ComputeSlot<InferBlocks<O>>;

  return {
    ...options,
    metadata,
    loader,
    Blocks: blocks,
    SlotContext,
    Slot,
    BlockArchive,
    BlockEditor,
    createBlockEditorElement,
  };
}
