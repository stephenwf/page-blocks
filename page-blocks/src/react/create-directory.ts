import { BlockConfig, blockSymbol, DirectoryOptions, InferBlocks } from '../core';
import { Blocks } from './types';
import { FC } from 'react';
import { ComputeSlot, createSlot } from './create-slot';
import { createBlockArchive } from './create-block-archive';
import { createBlockEditor } from './create-block-editor';
import { createBlockEditorElement as _createBlockEditorElement } from '../client';
import { createSlotContext } from './create-slot-context';
import { SlotContextProps } from '../react-client';
import { resolveDirectoryResolver } from '../vite/runtime';

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
  const resolvedOptions = {
    ...options,
    resolver: resolveDirectoryResolver(options),
  } as O;

  const blocks = resolvedOptions.blocks;
  const blockKeys: Array<keyof O['blocks']> = Object.keys(blocks);
  const _Slot = createSlot(resolvedOptions) as any;
  const BlockArchive = createBlockArchive(resolvedOptions);
  const BlockEditor = createBlockEditor(resolvedOptions);
  const createBlockEditorElement = _createBlockEditorElement(resolvedOptions);
  const { loader, SlotContext } = createSlotContext(resolvedOptions);
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
    ...resolvedOptions,
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
