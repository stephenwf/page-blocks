import { block, blockSlot } from 'page-blocks/react';
import { z } from 'zod';

const experienceShelfProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  intro: z.string().optional(),
});

export const ExperienceShelf = block(
  {
    label: 'Experience shelf',
    description: 'Editorial shelf block with an inner slot for quick picks, offers, or planning notes.',
    props: experienceShelfProps,
    slots: ['items'],
    slotConfig: {
      items: {
        label: 'Shelf items',
        description: 'Offer cards or editorial notes displayed inside the shelf.',
      },
    },
    examples: [
      {
        label: 'Editorial shelf',
        context: {},
        display: { width: 1080 },
        props: {
          eyebrow: 'Built for composition',
          title: 'Mix offer cards and planning notes inside one nested slot',
          intro: 'Use the items slot to create a destination-specific row without adding another top-level page slot.',
        },
      },
    ],
  },
  function ExperienceShelf(props) {
    return (
      <section className="experience-shelf">
        <header className="experience-shelf__header">
          {props.eyebrow ? <p className="experience-shelf__eyebrow">{props.eyebrow}</p> : null}
          <div>
            <h3 className="experience-shelf__title">{props.title}</h3>
            {props.intro ? <p className="experience-shelf__intro">{props.intro}</p> : null}
          </div>
        </header>

        {blockSlot(
          props.items,
          { className: 'experience-shelf__items pb-grid-slot' },
          <div className="experience-shelf__empty">Add quick-pick blocks to the shelf.</div>
        )}
      </section>
    );
  }
);
