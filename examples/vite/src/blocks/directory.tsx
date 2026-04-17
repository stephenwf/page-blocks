import { createDirectory } from 'page-blocks/react';
import { CalloutCard } from './callout-card.js';
import { FeatureShelf } from './feature-shelf.js';

export const directory = createDirectory({
  context: {},
  screenshots: '/blocks',
  blocks: {
    CalloutCard,
    FeatureShelf,
  },
});

export const Slot: typeof directory.Slot = directory.Slot;
export const BlockArchive: typeof directory.BlockArchive = directory.BlockArchive;
