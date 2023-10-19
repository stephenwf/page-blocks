import type { BlockConfig } from '@page-blocks/core';
import type { TypeOf, ZodTypeAny } from 'zod';
import type { FC, ReactNode } from 'react';
import { blockSymbol } from '@page-blocks/core';
import { BlockType } from './types';



export function block<
  Props extends ZodTypeAny = ZodTypeAny,
  DataProps = TypeOf<Props>,
  Preload extends Record<string, any> = Record<string, never>,
  InnerSlots extends string = never,
  RequiredCtx extends string = never,
  OptionalCtx extends string = never,
>(
  config: BlockConfig<Props, DataProps, Preload, InnerSlots, RequiredCtx, OptionalCtx, ReactNode>,
  component: FC<TypeOf<Props> &
    Partial<Record<InnerSlots, React.ReactNode>> & {
    context: Record<RequiredCtx, string> & Partial<Record<OptionalCtx, string>>;
  }
  >
): BlockType<Props> {
  return Object.assign(component, {
    [blockSymbol]: config,
  }) as any;
}
