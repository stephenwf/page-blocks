import { z } from 'zod';
import { block, propSource, contextSource } from '@page-blocks/react';

export const pokemonProps = z.object({
  name: z.string(),
  types: z.array(z.string()),
  image: z.string(),
});
export const searchPokemonProps = propSource(pokemonProps, {
  type: 'search',
  url: '/api/pokemon?q={query}',
  mapToList: (response) => {
    return response.results;
  },
});

export const searchPokemonContext = contextSource(['pokemon'], {
  type: 'search',
  url: '/api/pokemon?q={query}',
  mapToList: (response, list) => {
    list.push({
      label: 'Ditto',
      thumbnail: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png',
      context: { pokemon: 'ditto' },
    });

    return list;
  },
});
