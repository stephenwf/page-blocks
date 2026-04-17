// ---------------------------------------------------------------------------
// Pokémon CMS layer – fetches from PokeAPI and caches in memory
// ---------------------------------------------------------------------------

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const TOTAL_ORIGINAL = 150;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PokemonListItem {
  id: number;
  name: string;
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonAbility {
  name: string;
  hidden: boolean;
}

export interface PokemonDetail {
  id: number;
  name: string;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
  height: number; // in decimetres
  weight: number; // in hectograms
  abilities: PokemonAbility[];
  sprites: {
    officialArtwork: string;
  };
  description: string;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }[];
  genera: {
    genus: string;
    language: { name: string };
  }[];
  color: { name: string };
  habitat: { name: string } | null;
  generation: { name: string };
}

// ---------------------------------------------------------------------------
// Type → colour map (all 18 types)
// ---------------------------------------------------------------------------

export const TYPE_COLORS: Record<string, string> = {
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

// ---------------------------------------------------------------------------
// Sprite / artwork helpers
// ---------------------------------------------------------------------------

export const defaultPoster =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png';

export function getSpriteUrl(id: number): string {
  return defaultPoster.replace('{id}', String(id));
}

// ---------------------------------------------------------------------------
// In-memory caches
// ---------------------------------------------------------------------------

const detailCache = new Map<string, PokemonDetail>();
const speciesCache = new Map<number, PokemonSpecies>();

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PokeAPI request failed: ${res.status} ${res.statusText} – ${url}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a lightweight list of the original 150 Pokémon (id + name).
 * No network call needed – the names follow a predictable pattern from the API
 * but we fetch the full list from PokeAPI once and cache it.
 */
let listCache: PokemonListItem[] | null = null;

export async function listAllPokemon(): Promise<PokemonListItem[]> {
  if (listCache) return listCache;

  const data = await apiFetch<{
    results: { name: string; url: string }[];
  }>(`${POKEAPI_BASE}/pokemon?limit=${TOTAL_ORIGINAL}&offset=0`);

  listCache = data.results.map((entry, index) => ({
    id: index + 1,
    name: entry.name,
  }));

  return listCache;
}

/**
 * Fetch full details for a single Pokémon (by name or national dex id).
 * Results are cached so repeated calls for the same Pokémon are free.
 */
export async function getPokemonDetail(nameOrId: string | number): Promise<PokemonDetail> {
  const key = String(nameOrId).toLowerCase();

  if (detailCache.has(key)) {
    return detailCache.get(key)!;
  }

  // Fetch pokemon data and species data in parallel
  const raw = await apiFetch<{
    id: number;
    name: string;
    types: { slot: number; type: { name: string } }[];
    stats: { base_stat: number; stat: { name: string } }[];
    height: number;
    weight: number;
    abilities: { ability: { name: string }; is_hidden: boolean }[];
    sprites: {
      other: {
        'official-artwork': {
          front_default: string;
        };
      };
    };
  }>(`${POKEAPI_BASE}/pokemon/${key}`);

  // Grab the English description while we're at it
  const description = await getPokemonDescription(raw.id);

  const statsMap = Object.fromEntries(raw.stats.map((s) => [s.stat.name, s.base_stat])) as Record<string, number>;

  const detail: PokemonDetail = {
    id: raw.id,
    name: raw.name,
    types: raw.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    stats: {
      hp: statsMap['hp'] ?? 0,
      attack: statsMap['attack'] ?? 0,
      defense: statsMap['defense'] ?? 0,
      'special-attack': statsMap['special-attack'] ?? 0,
      'special-defense': statsMap['special-defense'] ?? 0,
      speed: statsMap['speed'] ?? 0,
    },
    height: raw.height,
    weight: raw.weight,
    abilities: raw.abilities.map((a) => ({
      name: a.ability.name,
      hidden: a.is_hidden,
    })),
    sprites: {
      officialArtwork: raw.sprites.other['official-artwork'].front_default ?? getSpriteUrl(raw.id),
    },
    description,
  };

  // Cache by both name and id so either lookup hits
  detailCache.set(raw.name, detail);
  detailCache.set(String(raw.id), detail);

  return detail;
}

/**
 * Fetch species data for a Pokémon. Cached by id.
 */
export async function getPokemonSpecies(id: number): Promise<PokemonSpecies> {
  if (speciesCache.has(id)) {
    return speciesCache.get(id)!;
  }

  const species = await apiFetch<PokemonSpecies>(`${POKEAPI_BASE}/pokemon-species/${id}`);

  speciesCache.set(id, species);
  return species;
}

/**
 * Convenience: returns the first English flavour-text entry for a Pokémon,
 * with the usual PokeAPI line-break artefacts cleaned up.
 */
export async function getPokemonDescription(id: number): Promise<string> {
  const species = await getPokemonSpecies(id);

  const entry = species.flavor_text_entries.find((e) => e.language.name === 'en');

  if (!entry) return '';

  // PokeAPI flavour text contains form-feeds and odd newlines – normalise them
  return entry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}
