import { createDirectory } from 'page-blocks/react';
import { CalloutCard } from './callout-card.js';
import { FeatureShelf } from './feature-shelf.js';

export const directory = createDirectory({
  version: '1',
  contexts: { optional: ['path'] },
  slots: {
    hero: { label: 'Hero', allowedBlocks: ['CalloutCard'], maxItems: 1 },
    content: { label: 'Page content', allowedBlocks: ['CalloutCard', 'FeatureShelf'], maxItems: 20 },
  },
  context: {},
  screenshots: '/blocks',
  blocks: {
    CalloutCard,
    FeatureShelf,
  },
});

export const Slot: typeof directory.Slot = directory.Slot;
export const BlockArchive: typeof directory.BlockArchive = directory.BlockArchive;
