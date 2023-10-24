import { TypeOf, ZodTypeAny } from 'zod';
import { FC } from 'react';
import { BlockConfig, blockSymbol } from '@page-blocks/core';

// This is because "children" in a block are technically a slot. They are shown here as always optional, which
// might annoy some if it doesn't indicate that you are NOT allowed children in a component - but you cannot type
// a component with zod with children. The types are pretty complex already - so this is a small escape hatch.
export type BlockType<P extends ZodTypeAny = ZodTypeAny> = FC<{ children?: any } & TypeOf<P>> & {
  [blockSymbol]: BlockConfig<P>;
};

export type Blocks = Record<string, BlockType<any>>;
