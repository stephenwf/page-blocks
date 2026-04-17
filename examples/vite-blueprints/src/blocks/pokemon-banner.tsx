import type { CSSProperties } from 'react';
import { block } from 'page-blocks/react';
import { z } from 'zod';

const pokemonHeroProps = z.object({
  pokedexNumber: z.number(),
  name: z.string(),
  types: z.array(z.string()),
  spriteUrl: z.string(),
  description: z.string(),
  height: z.number(),
  weight: z.number(),
});

const typeColors: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

function padPokedexNumber(n: number): string {
  return String(n).padStart(3, '0');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const PokemonHero = block(
  {
    label: 'Pokemon Hero',
    description: 'Hero header section for a Pokemon detail page, displaying artwork, name, types, description, and physical measurements.',
    props: pokemonHeroProps,
    examples: [
      {
        label: 'Bulbasaur',
        context: {},
        props: {
          pokedexNumber: 1,
          name: 'bulbasaur',
          types: ['grass', 'poison'],
          spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
          description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
          height: 7,
          weight: 69,
        },
      },
    ],
  },
  function PokemonHero(props) {
    return (
      <article className="pokedex-hero">
        <div className="pokedex-hero__artwork">
          <img
            className="pokedex-hero__image"
            src={props.spriteUrl}
            alt={`Official artwork of ${capitalize(props.name)}`}
          />
        </div>

        <div className="pokedex-hero__info">
          <div className="pokedex-hero__header">
            <h1 className="pokedex-hero__name">{capitalize(props.name)}</h1>
            <span className="pokedex-hero__id">#{padPokedexNumber(props.pokedexNumber)}</span>
          </div>

          <div className="pokedex-hero__types">
            {props.types.map((type) => (
              <span
                key={type}
                className="pokedex-hero__type-badge"
                style={{ '--type-color': typeColors[type] ?? '#777' } as CSSProperties}
              >
                {capitalize(type)}
              </span>
            ))}
          </div>

          <p className="pokedex-hero__description">{props.description}</p>

          <div className="pokedex-hero__measurements">
            <div className="pokedex-hero__measurement">
              <span className="pokedex-hero__measurement-label">Height</span>
              <span className="pokedex-hero__measurement-value">{(props.height / 10).toFixed(1)} m</span>
            </div>
            <div className="pokedex-hero__measurement">
              <span className="pokedex-hero__measurement-label">Weight</span>
              <span className="pokedex-hero__measurement-value">{(props.weight / 10).toFixed(1)} kg</span>
            </div>
          </div>
        </div>
      </article>
    );
  }
);
