import { block } from 'page-blocks/react';
import { z } from 'zod';

const calloutCardProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  linkLabel: z.string().optional(),
});

export const CalloutCard = block(
  {
    label: 'Callout card',
    description: 'Simple editorial card used as the base block in the Vite example.',
    props: calloutCardProps,
    examples: [
      {
        label: 'Migration card',
        display: { width: 360 },
        context: {},
        props: {
          eyebrow: 'Single package',
          title: 'page-blocks now ships from one package',
          body: 'Import the React, Node, filesystem, and editor helpers from the same published package.',
          href: '/',
          linkLabel: 'Open the example',
        },
      },
      {
        label: 'Editor card',
        display: { width: 360 },
        context: {},
        props: {
          eyebrow: 'Editable',
          title: 'Slots persist to local JSON files',
          body: 'The Vite example writes slot updates into the repository so you can inspect and iterate on the format.',
          href: '/block-archive',
          linkLabel: 'View the archive',
        },
      },
    ],
  },
  function CalloutCard(props) {
    return (
      <article className="callout-card">
        {props.eyebrow ? <p className="callout-card__eyebrow">{props.eyebrow}</p> : null}
        <h3 className="callout-card__title">{props.title}</h3>
        <p className="callout-card__body">{props.body}</p>
        {props.href && props.linkLabel ? (
          <p className="callout-card__action">
            <a href={props.href}>{props.linkLabel}</a>
          </p>
        ) : null}
      </article>
    );
  }
);
