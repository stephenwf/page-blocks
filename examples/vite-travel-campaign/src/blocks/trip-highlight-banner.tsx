import { block } from 'page-blocks/react';
import { z } from 'zod';

const tripHighlightBannerProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  tone: z.enum(['teal', 'terracotta', 'sand']).optional(),
});

export const TripHighlightBanner = block(
  {
    label: 'Trip highlight banner',
    description: 'Full-width editorial banner for seasonal promotions, campaign announcements, or destination nudges.',
    props: tripHighlightBannerProps,
    examples: [
      {
        label: 'Spring season banner',
        context: {},
        props: {
          eyebrow: 'Spring 2025',
          title: 'Blossom timing in Kyoto \u2014 the best windows are already booking',
          body: 'Cherry season shifts the entire rhythm of the city. Temples open earlier, gardens need reservations, and evenings move into kaiseki pacing.',
          ctaLabel: 'See Kyoto spring offers',
          ctaHref: '/offers?country=japan&city=kyoto&season=spring',
          tone: 'teal',
        },
      },
      {
        label: 'Summer Lisbon banner',
        context: {},
        props: {
          eyebrow: 'Summer edit',
          title: 'Lisbon in summer: waterfront evenings start where the trams end',
          body: 'Protect the afternoon from the heat, keep the evening long, and let the river do the rest.',
          ctaLabel: 'View summer packages',
          ctaHref: '/offers?country=portugal&city=lisbon&season=summer',
          tone: 'terracotta',
        },
      },
    ],
  },
  function TripHighlightBanner(props) {
    const tone = props.tone || 'sand';
    return (
      <div className={`trip-highlight-banner trip-highlight-banner--${tone}`}>
        <div className="trip-highlight-banner__copy">
          {props.eyebrow ? <p className="trip-highlight-banner__eyebrow">{props.eyebrow}</p> : null}
          <h3 className="trip-highlight-banner__title">{props.title}</h3>
          <p className="trip-highlight-banner__body">{props.body}</p>
          <p className="trip-highlight-banner__action">
            <a href={props.ctaHref}>{props.ctaLabel}</a>
          </p>
        </div>
        <div className="trip-highlight-banner__accent" aria-hidden="true" />
      </div>
    );
  }
);
