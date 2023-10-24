import { NextRequest, NextResponse } from 'next/server';

const cache = { value: null } as { value: any };

async function pokemonCache() {
  if (cache.value) {
    return cache.value;
  }

  const allPokemon = fetch('https://pokeapi.co/api/v2/pokemon?limit=251');
  const pokemon = await allPokemon.then((r) => r.json());
  cache.value = pokemon;
  return pokemon;
}

export const GET = async (req: NextRequest) => {
  const cached = await pokemonCache();

  const query = req.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = cached.results.filter((r) => r.name.includes(query));

  return NextResponse.json({
    results: results.map((r) => {
      const id = r.url.split('/').filter(Boolean).pop();
      return {
        label: r.name,
        thumbnail: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        context: { pokemon: r.name },
        props: {
          name: r.name,
          types: [],
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        },
      };
    }),
  });
};
