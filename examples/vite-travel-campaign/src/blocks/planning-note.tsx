import { block } from 'page-blocks/react';
import { z } from 'zod';

const planningNoteProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string(),
  detail: z.string().optional(),
  tone: z.enum(['sand', 'sea', 'ink']).optional(),
});

export const PlanningNote = block(
  {
    label: 'Planning note',
    description: 'Context-aware editorial note for seasonal guidance, neighborhood pacing, or offer prompts.',
    props: planningNoteProps,
    examples: [
      {
        label: 'Editorial guidance',
        context: {},
        display: { width: 420 },
        props: {
          eyebrow: 'Planning signal',
          title: 'Shift the day before you change the hotel',
          body: 'Treat city days as a sequence of neighborhoods so your meals and museum windows feel clustered instead of rushed.',
          detail: 'Works well as a banner, sidebar note, or supporting card inside a shelf.',
          tone: 'sea',
        },
      },
      {
        label: 'Offer prompt',
        context: {},
        display: { width: 420 },
        props: {
          eyebrow: 'Season chooser',
          title: 'Choose a season to unlock the sharper offer set',
          body: 'Exact seasonal files can narrow the product mix once spring, summer, or winter is part of the current context.',
          detail: 'This example uses `@season:none` to show the prompt only when no season is selected.',
          tone: 'sand',
        },
      },
    ],
  },
  function PlanningNote(props) {
    const tone = props.tone || 'ink';

    return (
      <article className={`planning-note planning-note--${tone}`}>
        {props.eyebrow ? <p className="planning-note__eyebrow">{props.eyebrow}</p> : null}
        <h3 className="planning-note__title">{props.title}</h3>
        <p className="planning-note__body">{props.body}</p>
        {props.detail ? <p className="planning-note__detail">{props.detail}</p> : null}
      </article>
    );
  }
);
