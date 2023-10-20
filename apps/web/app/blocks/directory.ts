import { createDirectory } from '@page-blocks/react';
import { Card } from 'ui';

export const directory = createDirectory({
  context: {},
  resolver: {
    type: 'tanstack-query',
    endpoint: '/api/page-blocks',
    screenshots: '/blocks',
  },
  blocks: {
    Card,
  },
});

export const Blocks = directory.Blocks;

export const BlockArchive = directory.BlockArchive;
export const SlotContext = directory.SlotContext;
