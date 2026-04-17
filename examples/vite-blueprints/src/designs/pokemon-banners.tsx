import React from 'react';
import { designer } from 'page-blocks/designer';
import { directory } from '../blocks/directory.js';

const { design } = designer(directory);

const ALL_POKEMON: { id: number; name: string }[] = [
  { id: 1, name: 'bulbasaur' },
  { id: 2, name: 'ivysaur' },
  { id: 3, name: 'venusaur' },
  { id: 4, name: 'charmander' },
  { id: 5, name: 'charmeleon' },
  { id: 6, name: 'charizard' },
  { id: 7, name: 'squirtle' },
  { id: 8, name: 'wartortle' },
  { id: 9, name: 'blastoise' },
  { id: 10, name: 'caterpie' },
  { id: 11, name: 'metapod' },
  { id: 12, name: 'butterfree' },
  { id: 13, name: 'weedle' },
  { id: 14, name: 'kakuna' },
  { id: 15, name: 'beedrill' },
  { id: 16, name: 'pidgey' },
  { id: 17, name: 'pidgeotto' },
  { id: 18, name: 'pidgeot' },
  { id: 19, name: 'rattata' },
  { id: 20, name: 'raticate' },
  { id: 21, name: 'spearow' },
  { id: 22, name: 'fearow' },
  { id: 23, name: 'ekans' },
  { id: 24, name: 'arbok' },
  { id: 25, name: 'pikachu' },
  { id: 26, name: 'raichu' },
  { id: 27, name: 'sandshrew' },
  { id: 28, name: 'sandslash' },
  { id: 29, name: 'nidoran-f' },
  { id: 30, name: 'nidorina' },
  { id: 31, name: 'nidoqueen' },
  { id: 32, name: 'nidoran-m' },
  { id: 33, name: 'nidorino' },
  { id: 34, name: 'nidoking' },
  { id: 35, name: 'clefairy' },
  { id: 36, name: 'clefable' },
  { id: 37, name: 'vulpix' },
  { id: 38, name: 'ninetales' },
  { id: 39, name: 'jigglypuff' },
  { id: 40, name: 'wigglytuff' },
  { id: 41, name: 'zubat' },
  { id: 42, name: 'golbat' },
  { id: 43, name: 'oddish' },
  { id: 44, name: 'gloom' },
  { id: 45, name: 'vileplume' },
  { id: 46, name: 'paras' },
  { id: 47, name: 'parasect' },
  { id: 48, name: 'venonat' },
  { id: 49, name: 'venomoth' },
  { id: 50, name: 'diglett' },
  { id: 51, name: 'dugtrio' },
  { id: 52, name: 'meowth' },
  { id: 53, name: 'persian' },
  { id: 54, name: 'psyduck' },
  { id: 55, name: 'golduck' },
  { id: 56, name: 'mankey' },
  { id: 57, name: 'primeape' },
  { id: 58, name: 'growlithe' },
  { id: 59, name: 'arcanine' },
  { id: 60, name: 'poliwag' },
  { id: 61, name: 'poliwhirl' },
  { id: 62, name: 'poliwrath' },
  { id: 63, name: 'abra' },
  { id: 64, name: 'kadabra' },
  { id: 65, name: 'alakazam' },
  { id: 66, name: 'machop' },
  { id: 67, name: 'machoke' },
  { id: 68, name: 'machamp' },
  { id: 69, name: 'bellsprout' },
  { id: 70, name: 'weepinbell' },
  { id: 71, name: 'victreebel' },
  { id: 72, name: 'tentacool' },
  { id: 73, name: 'tentacruel' },
  { id: 74, name: 'geodude' },
  { id: 75, name: 'graveler' },
  { id: 76, name: 'golem' },
  { id: 77, name: 'ponyta' },
  { id: 78, name: 'rapidash' },
  { id: 79, name: 'slowpoke' },
  { id: 80, name: 'slowbro' },
  { id: 81, name: 'magnemite' },
  { id: 82, name: 'magneton' },
  { id: 83, name: 'farfetchd' },
  { id: 84, name: 'doduo' },
  { id: 85, name: 'dodrio' },
  { id: 86, name: 'seel' },
  { id: 87, name: 'dewgong' },
  { id: 88, name: 'grimer' },
  { id: 89, name: 'muk' },
  { id: 90, name: 'shellder' },
  { id: 91, name: 'cloyster' },
  { id: 92, name: 'gastly' },
  { id: 93, name: 'haunter' },
  { id: 94, name: 'gengar' },
  { id: 95, name: 'onix' },
  { id: 96, name: 'drowzee' },
  { id: 97, name: 'hypno' },
  { id: 98, name: 'krabby' },
  { id: 99, name: 'kingler' },
  { id: 100, name: 'voltorb' },
  { id: 101, name: 'electrode' },
  { id: 102, name: 'exeggcute' },
  { id: 103, name: 'exeggutor' },
  { id: 104, name: 'cubone' },
  { id: 105, name: 'marowak' },
  { id: 106, name: 'hitmonlee' },
  { id: 107, name: 'hitmonchan' },
  { id: 108, name: 'lickitung' },
  { id: 109, name: 'koffing' },
  { id: 110, name: 'weezing' },
  { id: 111, name: 'rhyhorn' },
  { id: 112, name: 'rhydon' },
  { id: 113, name: 'chansey' },
  { id: 114, name: 'tangela' },
  { id: 115, name: 'kangaskhan' },
  { id: 116, name: 'horsea' },
  { id: 117, name: 'seadra' },
  { id: 118, name: 'goldeen' },
  { id: 119, name: 'seaking' },
  { id: 120, name: 'staryu' },
  { id: 121, name: 'starmie' },
  { id: 122, name: 'mr-mime' },
  { id: 123, name: 'scyther' },
  { id: 124, name: 'jynx' },
  { id: 125, name: 'electabuzz' },
  { id: 126, name: 'magmar' },
  { id: 127, name: 'pinsir' },
  { id: 128, name: 'tauros' },
  { id: 129, name: 'magikarp' },
  { id: 130, name: 'gyarados' },
  { id: 131, name: 'lapras' },
  { id: 132, name: 'ditto' },
  { id: 133, name: 'eevee' },
  { id: 134, name: 'vaporeon' },
  { id: 135, name: 'jolteon' },
  { id: 136, name: 'flareon' },
  { id: 137, name: 'porygon' },
  { id: 138, name: 'omanyte' },
  { id: 139, name: 'omastar' },
  { id: 140, name: 'kabuto' },
  { id: 141, name: 'kabutops' },
  { id: 142, name: 'aerodactyl' },
  { id: 143, name: 'snorlax' },
  { id: 144, name: 'articuno' },
  { id: 145, name: 'zapdos' },
  { id: 146, name: 'moltres' },
  { id: 147, name: 'dratini' },
  { id: 148, name: 'dragonair' },
  { id: 149, name: 'dragonite' },
  { id: 150, name: 'mewtwo' },
];

async function fetchPokemon(id: number) {
  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);

  if (!pokemonRes.ok) {
    throw new Error(`Failed to fetch pokemon ${id}: ${pokemonRes.status}`);
  }
  if (!speciesRes.ok) {
    throw new Error(`Failed to fetch pokemon-species ${id}: ${speciesRes.status}`);
  }

  const pokemon = await pokemonRes.json();
  const species = await speciesRes.json();

  const flavorEntry = species.flavor_text_entries?.find(
    (e: any) => e.language.name === 'en'
  );
  const description = flavorEntry?.flavor_text?.replace(/[\n\f\r]/g, ' ') || '';

  return {
    id: pokemon.id as number,
    name: pokemon.name as string,
    types: pokemon.types.map((t: any) => t.type.name as string),
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    description,
    height: pokemon.height as number,
    weight: pokemon.weight as number,
    stats: {
      hp: pokemon.stats[0].base_stat as number,
      attack: pokemon.stats[1].base_stat as number,
      defense: pokemon.stats[2].base_stat as number,
      specialAttack: pokemon.stats[3].base_stat as number,
      specialDefense: pokemon.stats[4].base_stat as number,
      speed: pokemon.stats[5].base_stat as number,
    },
  };
}

export const pokemonPokedex = design('Pokemon Pokedex', async ({ Blocks, slots }) => {
  const batchSize = 10;

  for (let i = 0; i < ALL_POKEMON.length; i += batchSize) {
    const batch = ALL_POKEMON.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((p) => fetchPokemon(p.id)));

    for (const pokemon of results) {
      slots.add(
        'pokemon_hero',
        { pokemon: pokemon.name },
        <Blocks.PokemonHero
          id={`hero-${pokemon.name}`}
          pokedexNumber={pokemon.id}
          name={pokemon.name}
          types={pokemon.types}
          spriteUrl={pokemon.spriteUrl}
          description={pokemon.description}
          height={pokemon.height}
          weight={pokemon.weight}
        />
      );

      slots.add(
        'pokemon_stats',
        { pokemon: pokemon.name },
        <Blocks.PokemonStats
          id={`stats-${pokemon.name}`}
          hp={pokemon.stats.hp}
          attack={pokemon.stats.attack}
          defense={pokemon.stats.defense}
          specialAttack={pokemon.stats.specialAttack}
          specialDefense={pokemon.stats.specialDefense}
          speed={pokemon.stats.speed}
        />
      );
    }
  }
});
