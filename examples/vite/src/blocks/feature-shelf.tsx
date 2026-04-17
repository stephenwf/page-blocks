import { block, blockSlot } from 'page-blocks/react';
import { z } from 'zod';

const featureShelfProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  intro: z.string().optional(),
});

export const FeatureShelf = block(
  {
    label: 'Feature shelf',
    description: 'Nested-slot block that owns an editable row of child cards.',
    props: featureShelfProps,
    slots: ['items'],
    slotConfig: {
      items: {
        label: 'Shelf items',
        description: 'Cards rendered inside the shelf grid.',
      },
    },
    examples: [
      {
        label: 'Shelf layout',
        display: { width: 960 },
        context: {},
        props: {
          eyebrow: 'Nested slot block',
          title: 'A block can own a local slot',
          intro: 'Use the inner items slot to compose a row of cards without adding extra page-level slots.',
        },
      },
    ],
  },
  function FeatureShelf(props) {
    return (
      <section className="feature-shelf">
        <header className="feature-shelf__header">
          {props.eyebrow ? <p className="feature-shelf__eyebrow">{props.eyebrow}</p> : null}
          <div>
            <h3 className="feature-shelf__title">{props.title}</h3>
            {props.intro ? <p className="feature-shelf__intro">{props.intro}</p> : null}
          </div>
        </header>

        {blockSlot(
          props.items,
          { className: 'feature-shelf__items pb-grid-slot' },
          <div className="feature-shelf__empty">Add callout cards to the shelf.</div>
        )}
      </section>
    );
  }
);
