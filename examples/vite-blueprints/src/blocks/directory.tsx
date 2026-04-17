import { createDirectory } from 'page-blocks/react';
import { PokemonHero } from './pokemon-banner.js';
import { PokemonStats } from './pokemon-stats.js';

export const directory = createDirectory({
  blocks: {
    PokemonHero,
    PokemonStats,
  },
});

export const Slot: typeof directory.Slot = directory.Slot;
export const SlotContext: typeof directory.SlotContext = directory.SlotContext;
