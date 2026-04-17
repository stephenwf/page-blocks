import { block } from 'page-blocks/react';
import { z } from 'zod';

const destinationCardProps = z.object({
  destination: z.string(),
  country: z.string(),
  tagline: z.string(),
  image: z.string(),
  href: z.string(),
  badge: z.string().optional(),
  duration: z.string().optional(),
});

export const DestinationCard = block(
  {
    label: 'Destination card',
    description: 'A compact destination showcase card with image, location info, and a booking link.',
    props: destinationCardProps,
    examples: [
      {
        label: 'Lisbon destination',
        context: {},
        props: {
          destination: 'Lisbon',
          country: 'Portugal',
          tagline: 'Hillside trams, tiled facades, and waterfront evenings',
          image: '/travel/lisbon-tram.svg',
          href: '/guides?country=portugal&city=lisbon',
          badge: 'Top pick',
          duration: 'From 3 nights',
        },
      },
      {
        label: 'Kyoto destination',
        context: {},
        props: {
          destination: 'Kyoto',
          country: 'Japan',
          tagline: 'Temple walks, tea houses, and early-morning garden routes',
          image: '/travel/kyoto-garden.svg',
          href: '/guides?country=japan&city=kyoto',
          duration: 'From 4 nights',
        },
      },
    ],
  },
  function DestinationCard(props) {
    return (
      <article className="destination-card">
        <a href={props.href} className="destination-card__link">
          <div className="destination-card__image">
            <img src={props.image} alt="" />
            {props.badge ? <span className="destination-card__badge">{props.badge}</span> : null}
          </div>
          <div className="destination-card__body">
            <p className="destination-card__location">{props.country}</p>
            <h3 className="destination-card__title">{props.destination}</h3>
            <p className="destination-card__tagline">{props.tagline}</p>
            {props.duration ? <p className="destination-card__duration">{props.duration}</p> : null}
          </div>
        </a>
      </article>
    );
  }
);
