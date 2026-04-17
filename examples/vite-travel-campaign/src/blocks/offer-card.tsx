import { block, propSource } from 'page-blocks/react';
import { z } from 'zod';

const offerCardProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  price: z.string(),
  meta: z.string(),
  href: z.string(),
  image: z.string(),
  badge: z.string().optional(),
});

const travelOfferSearch = propSource(offerCardProps, {
  type: 'search',
  url: '/api/travel-search?q={query}',
  mapToList: (response) => response.results,
});

export const OfferCard = block(
  {
    label: 'Offer card',
    description: 'Travel package card with a local prop-source search for inserting realistic offers.',
    props: offerCardProps,
    propSources: [travelOfferSearch],
    examples: [
      {
        label: 'Lisbon rooftop stay',
        context: {},
        props: {
          eyebrow: 'Lisbon city stay',
          title: 'Alfama rooftops and river club check-in',
          summary: 'Three nights with a riverside hotel, tram pass, and a private food-led walk through Alfama and Mouraria.',
          price: 'From £640',
          meta: '3 nights · breakfast · evening food tour',
          href: '/offers?country=portugal&city=lisbon',
          image: '/travel/lisbon-tram.svg',
          badge: 'Best seller',
        },
      },
      {
        label: 'Kyoto blossom edit',
        context: {},
        props: {
          eyebrow: 'Kyoto spring',
          title: 'Cherry blossom timing with quiet morning routes',
          summary: 'A blossom-season package that shifts temple visits earlier, adds garden reservations, and layers in evening kaiseki pacing.',
          price: 'From £1,420',
          meta: '5 nights · blossom timing · garden reservations',
          href: '/offers?country=japan&city=kyoto&season=spring',
          image: '/travel/kyoto-garden.svg',
          badge: 'Spring edit',
        },
      },
    ],
  },
  function OfferCard(props) {
    return (
      <article className="offer-card">
        <div className="offer-card__image">
          <img src={props.image} alt="" />
          {props.badge ? <span className="offer-card__badge">{props.badge}</span> : null}
        </div>
        <div className="offer-card__body">
          {props.eyebrow ? <p className="offer-card__eyebrow">{props.eyebrow}</p> : null}
          <h3 className="offer-card__title">{props.title}</h3>
          <p className="offer-card__summary">{props.summary}</p>
          <div className="offer-card__meta">
            <span className="offer-card__price">{props.price}</span>
            <span>{props.meta}</span>
          </div>
          <p className="offer-card__action">
            <a href={props.href}>Open package</a>
          </p>
        </div>
      </article>
    );
  }
);
