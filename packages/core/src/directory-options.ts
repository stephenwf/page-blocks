import { BlockResolver } from './resolvers';
import { BlockConfig } from './block-config';

export interface DirectoryOptions<B extends Record<string, any> = {}, Context = unknown, ServerContext = any> {
  resolver: BlockResolver;
  blocks: B;
  context?: Context;
  metadata?: Record<string, BlockConfig>;
  screenshots?: string;
}

export type InferBlocks<Options extends DirectoryOptions<any, any>> = Options extends DirectoryOptions<
  infer BlockLibraryMap,
  any
>
  ? BlockLibraryMap
  : never;
