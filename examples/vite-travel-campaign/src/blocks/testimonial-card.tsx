import { block } from 'page-blocks/react';
import { z } from 'zod';

const testimonialCardProps = z.object({
  quote: z.string(),
  traveler: z.string(),
  trip: z.string(),
  stars: z.number().min(1).max(5).optional(),
});

export const TestimonialCard = block(
  {
    label: 'Testimonial card',
    description: 'A traveler quote with attribution and trip reference. Use inside shelves or as a standalone content block.',
    props: testimonialCardProps,
    examples: [
      {
        label: 'Kyoto review',
        context: {},
        display: { width: 420 },
        props: {
          quote: "Arashiyama at dawn was the first time I'd ever felt genuinely alone in a travel destination. Worth every early start.",
          traveler: 'Margot D.',
          trip: 'Kyoto, 5 nights \u00b7 spring',
          stars: 5,
        },
      },
      {
        label: 'Lisbon review',
        context: {},
        display: { width: 420 },
        props: {
          quote: 'The Alfama walking route was so good we did it twice. The food tour picks were genuinely local \u2014 no tourist traps.',
          traveler: 'James K.',
          trip: 'Lisbon, 3 nights \u00b7 summer',
          stars: 5,
        },
      },
    ],
  },
  function TestimonialCard(props) {
    const stars = props.stars ? Math.min(5, Math.max(1, Math.round(props.stars))) : null;
    return (
      <article className="testimonial-card">
        {stars ? (
          <p className="testimonial-card__stars" aria-label={`${stars} out of 5 stars`}>
            {'\u2605'.repeat(stars)}
          </p>
        ) : null}
        <blockquote className="testimonial-card__quote">{props.quote}</blockquote>
        <footer className="testimonial-card__footer">
          <span className="testimonial-card__traveler">{props.traveler}</span>
          <span className="testimonial-card__trip">{props.trip}</span>
        </footer>
      </article>
    );
  }
);
