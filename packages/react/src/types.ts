import { TypeOf, ZodTypeAny } from 'zod';
import { FC } from 'react';
import { BlockConfig, blockSymbol } from '@page-blocks/core';

export type BlockType<P extends ZodTypeAny = ZodTypeAny> = FC<TypeOf<P>> & {
  [blockSymbol]: BlockConfig<P>;
};

export type Blocks = Record<string, BlockType<any>>;
