import { createDirectory } from '@page-blocks/react';
import { Card } from 'ui';
import PokemonThumbnail from '../components/pokemon-thumbnail';

export const directory = createDirectory({
  context: {},
  resolver: {
    type: 'tanstack-query',
    endpoint: '/api/page-blocks',
    screenshots: '/blocks',
  },
  blocks: {
    Card,
    PokemonThumbnail,
  },
});

export const Blocks = directory.Blocks;
export const Slot = directory.Slot;
export const BlockArchive = directory.BlockArchive;
export const SlotContext = directory.SlotContext;
