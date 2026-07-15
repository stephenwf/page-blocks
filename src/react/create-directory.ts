import {
  BlockConfig,
  blockSymbol,
  createDirectoryContract,
  createDirectoryManifest,
  DirectoryOptions,
  InferBlocks,
  PageBlocksDirectoryContract,
  PageBlocksDirectoryManifest,
} from '../core';
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
  manifest: PageBlocksDirectoryManifest;
  contract: PageBlocksDirectoryContract;
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
  const manifest = createDirectoryManifest({
    version: options.version || '1',
    contexts: {
      required: options.contexts?.required || [],
      optional: options.contexts?.optional || [],
    },
    blocks: blockKeys.map((key) => {
      const config = metadata[key];
      const slotNames = new Set([...(config.slots || []), ...Object.keys(config.slotConfig || {})]);
      return {
        type: String(key),
        label: config.label,
        ...(config.description ? { description: config.description } : {}),
        ...(config.icon ? { icon: config.icon } : {}),
        ...(config.thumbnail ? { thumbnail: config.thumbnail } : {}),
        ...(config.form ? { form: config.form } : {}),
        innerSlots: Object.fromEntries(
          [...slotNames].sort().map((name) => [name, (config.slotConfig as Record<string, any> | undefined)?.[name] || {}])
        ),
        requiredContexts: (config.requiredContext || []) as string[],
        optionalContexts: (config.optionalContext || []) as string[],
      };
    }),
    slots: Object.entries(options.slots || {}).map(([name, policy]) => ({ name, policy })),
    aliases: options.aliases || {},
    migrations: options.migrations || [],
    presets: options.presets || [],
  });
  const contract = createDirectoryContract(
    manifest,
    Object.fromEntries(blockKeys.flatMap((key) => metadata[key].props ? [[String(key), metadata[key].props!]] : []))
  );

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
    manifest,
    contract,
  };
}
