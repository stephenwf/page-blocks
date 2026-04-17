import { ContextSource } from '../core';

export function contextSource<Ctx extends string = never>(contexts: Ctx[], source: ContextSource<Record<Ctx, string>>) {
  return source;
}
