import { createDirectory } from 'page-blocks/react';
import { PokemonHero } from './pokemon-banner.js';
import { PokemonStats } from './pokemon-stats.js';

export const directory = createDirectory({
  version: '1',
  contexts: { required: ['pokemon'] },
  slots: {
    pokemon_hero: { allowedBlocks: ['PokemonHero'], maxItems: 1 },
    pokemon_stats: { allowedBlocks: ['PokemonStats'], maxItems: 1 },
  },
  blocks: {
    PokemonHero,
    PokemonStats,
  },
});

export const Slot: typeof directory.Slot = directory.Slot;
export const SlotContext: typeof directory.SlotContext = directory.SlotContext;
