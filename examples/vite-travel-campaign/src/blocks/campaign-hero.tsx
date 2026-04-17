import { block } from 'page-blocks/react';
import { z } from 'zod';

const campaignHeroProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string(),
  image: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  statOneLabel: z.string(),
  statOneValue: z.string(),
  statTwoLabel: z.string(),
  statTwoValue: z.string(),
  statThreeLabel: z.string(),
  statThreeValue: z.string(),
});

export const CampaignHero = block(
  {
    label: 'Campaign hero',
    description: 'Primary travel hero with a visual, editorial copy, and three planning stats.',
    props: campaignHeroProps,
    examples: [
      {
        label: 'Lisbon city campaign',
        context: {},
        props: {
          eyebrow: 'Portugal launch',
          title: 'Build a waterfront city break around Lisbon’s slowest hours',
          body: 'Start with old-town tram lines, shift into museum shade after lunch, and reserve your long dinner for the river breeze.',
          image: '/travel/lisbon-tram.svg',
          ctaLabel: 'View Lisbon offers',
          ctaHref: '/offers?country=portugal&city=lisbon',
          statOneLabel: 'Base',
          statOneValue: 'Santos',
          statTwoLabel: 'Best for',
          statTwoValue: 'Rooftops',
          statThreeLabel: 'Trip length',
          statThreeValue: '3-4 nights',
        },
      },
      {
        label: 'Kyoto spring campaign',
        context: {},
        props: {
          eyebrow: 'Japan seasonal edit',
          title: 'Time Kyoto around blossom windows, garden pauses, and first-entry mornings',
          body: 'Treat the city like a sequence of quiet starts and late lunches so the most visited districts still feel deliberate.',
          image: '/travel/kyoto-garden.svg',
          ctaLabel: 'Open Kyoto guide',
          ctaHref: '/guides?country=japan&city=kyoto&season=spring',
          statOneLabel: 'Base',
          statOneValue: 'Higashiyama',
          statTwoLabel: 'Best for',
          statTwoValue: 'Temple routes',
          statThreeLabel: 'Trip length',
          statThreeValue: '4-5 nights',
        },
      },
    ],
  },
  function CampaignHero(props) {
    return (
      <article className="campaign-hero">
        <div className="campaign-hero__copy">
          {props.eyebrow ? <p className="campaign-hero__eyebrow">{props.eyebrow}</p> : null}
          <h2 className="campaign-hero__title">{props.title}</h2>
          <p className="campaign-hero__body">{props.body}</p>
          <p className="campaign-hero__action">
            <a href={props.ctaHref}>{props.ctaLabel}</a>
          </p>
          <dl className="campaign-hero__stats">
            <div>
              <dt>{props.statOneLabel}</dt>
              <dd>{props.statOneValue}</dd>
            </div>
            <div>
              <dt>{props.statTwoLabel}</dt>
              <dd>{props.statTwoValue}</dd>
            </div>
            <div>
              <dt>{props.statThreeLabel}</dt>
              <dd>{props.statThreeValue}</dd>
            </div>
          </dl>
        </div>

        <div className="campaign-hero__media">
          <img src={props.image} alt="" />
        </div>
      </article>
    );
  }
);
