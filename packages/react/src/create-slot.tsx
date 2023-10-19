import { DirectoryOptions } from '@page-blocks/core';
import { FC, HTMLAttributes } from 'react';
import { TypeOf } from 'zod';
import { BlockType } from './types';
import { Slot, SlotProps } from '@page-blocks/react-client';

export type ComputeSlot<Blocks extends Record<string, BlockType>> = FC<SlotProps> & {
  [K in keyof Blocks]: Blocks[K] extends BlockType<infer Props> ? FC<TypeOf<Props> & { id?: string }> : never;
};

export function createSlot(options: DirectoryOptions<any>) {
  return function CustomSlot(props: SlotProps & HTMLAttributes<'div'>) {
    return <Slot {...props} options={options} />;
  };
}
