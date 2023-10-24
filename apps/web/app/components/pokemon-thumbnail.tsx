'use client';

import { block } from '@page-blocks/react';
import { searchPokemonProps, pokemonProps } from '../sources/pokemon';

export default block(
  {
    label: 'Pokemon Thumbnail',
    props: pokemonProps,
    propSources: [searchPokemonProps],
    examples: [
      {
        label: 'Pokemon Thumbnail - ditto',
        display: { width: 300 },
        props: {
          name: 'ditto',
          image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png',
          types: ['normal'],
        },
        context: {},
      },
      {
        label: 'Pokemon Thumbnail - pikachu',
        display: { width: 300 },
        props: {
          name: 'pikachu',
          image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
          types: ['electric'],
        },
        context: {},
      },
      {
        label: 'Pokemon Thumbnail - bulbasaur',
        display: { width: 300 },
        props: {
          name: 'bulbasaur',
          image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
          types: ['grass', 'poison'],
        },
        context: {},
      },
      {
        label: 'Pokemon Thumbnail - charmander',
        display: { width: 300 },
        props: {
          name: 'charmander',
          image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
          types: ['fire'],
        },
        context: {},
      },
      {
        label: 'Pokemon Thumbnail - squirtle',
        display: { width: 300 },
        props: {
          name: 'squirtle',
          image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
          types: ['water'],
        },
        context: {},
      },
    ],
  },
  function PokemonThumbnail(props) {
    return (
      <div>
        <img src={props.image} alt="" />
        <h3>{props.name}</h3>
        <div>
          {props.types.map((t) => (
            <div key={t}>{t}</div>
          ))}
        </div>
      </div>
    );
  }
);
