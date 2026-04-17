import { block } from 'page-blocks/react';
import { z } from 'zod';

const pokemonStatsProps = z.object({
  hp: z.number(),
  attack: z.number(),
  defense: z.number(),
  specialAttack: z.number(),
  specialDefense: z.number(),
  speed: z.number(),
});

export const PokemonStats = block(
  {
    label: 'Pokemon Stats',
    description: 'Displays a Pokemon\'s base stats as labeled visual bars with a total.',
    props: pokemonStatsProps,
    examples: [
      {
        label: 'Bulbasaur stats',
        context: {},
        props: {
          hp: 45,
          attack: 49,
          defense: 49,
          specialAttack: 65,
          specialDefense: 65,
          speed: 45,
        },
      },
    ],
  },
  function PokemonStats(props) {
    const stats: { label: string; value: number }[] = [
      { label: 'HP', value: props.hp },
      { label: 'Attack', value: props.attack },
      { label: 'Defense', value: props.defense },
      { label: 'Sp. Atk', value: props.specialAttack },
      { label: 'Sp. Def', value: props.specialDefense },
      { label: 'Speed', value: props.speed },
    ];

    const total = stats.reduce((sum, s) => sum + s.value, 0);

    return (
      <section className="pokedex-stats__panel">
        <h3 className="pokedex-stats__title">Base Stats</h3>
        <ul className="pokedex-stats__list">
          {stats.map((stat) => (
            <li key={stat.label} className="pokedex-stats__row">
              <span className="pokedex-stats__label">{stat.label}</span>
              <span className="pokedex-stats__value">{stat.value}</span>
              <div className="pokedex-stats__bar-track">
                <div
                  className="pokedex-stats__bar-fill"
                  style={{ '--stat-percent': `${(stat.value / 255) * 100}%` } as React.CSSProperties}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="pokedex-stats__total">
          <span className="pokedex-stats__label">Total</span>
          <span className="pokedex-stats__value">{total}</span>
        </div>
      </section>
    );
  }
);
