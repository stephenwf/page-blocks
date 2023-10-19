import { DirectoryOptions, FullSlotLoader } from '@page-blocks/core';
import { TypeOf } from 'zod';

export type ComputeRaw<A extends any> = A extends Function ? A : { [K in keyof A]: A[K] } & unknown;
export type InferServerContext<Options extends DirectoryOptions<any, any>> = ComputeRaw<
  TypeOf<Options extends DirectoryOptions<any, any, infer ServerContext> ? ServerContext : never>
>;

export interface ServerOptions<D extends DirectoryOptions> {
  loader: FullSlotLoader;
  directory: D;
  serverContext?: (req: Request) => InferServerContext<D>;
  canEdit?: (ctx: InferServerContext<D>, req: Request) => boolean;
  invalidateSlots?: () => Promise<void>;
  generateScreenshots?: () => Promise<void>;
}
