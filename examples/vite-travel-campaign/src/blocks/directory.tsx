import { createDirectory } from 'page-blocks/react';
import { CampaignHero } from './campaign-hero.js';
import { DestinationCard } from './destination-card.js';
import { ExperienceShelf } from './experience-shelf.js';
import { OfferCard } from './offer-card.js';
import { PlanningNote } from './planning-note.js';
import { TestimonialCard } from './testimonial-card.js';
import { TripHighlightBanner } from './trip-highlight-banner.js';

export const directory = createDirectory({
  screenshots: '/blocks',
  blocks: {
    CampaignHero,
    DestinationCard,
    ExperienceShelf,
    OfferCard,
    PlanningNote,
    TestimonialCard,
    TripHighlightBanner,
  },
});

export const Slot: typeof directory.Slot = directory.Slot;
export const SlotContext: typeof directory.SlotContext = directory.SlotContext;
export const BlockArchive: typeof directory.BlockArchive = directory.BlockArchive;
