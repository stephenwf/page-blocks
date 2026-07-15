import { BlockResolver } from './resolvers';
import { BlockConfig } from './block-config';
import { PageBlocksDirectoryManifest, SlotPolicy } from './directory-manifest';
import { SlotDocument } from './protocol';

export interface DirectoryOptions<B extends Record<string, any> = {}, Context = unknown, ServerContext = any> {
  resolver?: BlockResolver;
  blocks: B;
  context?: Context;
  metadata?: Record<string, BlockConfig>;
  screenshots?: string;
  version?: string;
  contexts?: { required?: string[]; optional?: string[] };
  slots?: Record<string, SlotPolicy>;
  aliases?: Record<string, string>;
  migrations?: PageBlocksDirectoryManifest['migrations'];
  presets?: Array<{ id: string; label: string; slot?: string; document: SlotDocument }>;
}

export type InferBlocks<Options extends DirectoryOptions<any, any>> = Options extends DirectoryOptions<
  infer BlockLibraryMap,
  any
>
  ? BlockLibraryMap
  : never;
