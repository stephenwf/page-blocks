import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Slot, SlotContext } from './blocks/directory.js';

const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// Static data – all 150 original Pokémon
// ---------------------------------------------------------------------------

interface Pokemon {
  id: number;
  name: string;
  types: string[];
}

const POKEMON_LIST: Pokemon[] = [
  { id: 1, name: 'bulbasaur', types: ['grass', 'poison'] },
  { id: 2, name: 'ivysaur', types: ['grass', 'poison'] },
  { id: 3, name: 'venusaur', types: ['grass', 'poison'] },
  { id: 4, name: 'charmander', types: ['fire'] },
  { id: 5, name: 'charmeleon', types: ['fire'] },
  { id: 6, name: 'charizard', types: ['fire', 'flying'] },
  { id: 7, name: 'squirtle', types: ['water'] },
  { id: 8, name: 'wartortle', types: ['water'] },
  { id: 9, name: 'blastoise', types: ['water'] },
  { id: 10, name: 'caterpie', types: ['bug'] },
  { id: 11, name: 'metapod', types: ['bug'] },
  { id: 12, name: 'butterfree', types: ['bug', 'flying'] },
  { id: 13, name: 'weedle', types: ['bug', 'poison'] },
  { id: 14, name: 'kakuna', types: ['bug', 'poison'] },
  { id: 15, name: 'beedrill', types: ['bug', 'poison'] },
  { id: 16, name: 'pidgey', types: ['normal', 'flying'] },
  { id: 17, name: 'pidgeotto', types: ['normal', 'flying'] },
  { id: 18, name: 'pidgeot', types: ['normal', 'flying'] },
  { id: 19, name: 'rattata', types: ['normal'] },
  { id: 20, name: 'raticate', types: ['normal'] },
  { id: 21, name: 'spearow', types: ['normal', 'flying'] },
  { id: 22, name: 'fearow', types: ['normal', 'flying'] },
  { id: 23, name: 'ekans', types: ['poison'] },
  { id: 24, name: 'arbok', types: ['poison'] },
  { id: 25, name: 'pikachu', types: ['electric'] },
  { id: 26, name: 'raichu', types: ['electric'] },
  { id: 27, name: 'sandshrew', types: ['ground'] },
  { id: 28, name: 'sandslash', types: ['ground'] },
  { id: 29, name: 'nidoran-f', types: ['poison'] },
  { id: 30, name: 'nidorina', types: ['poison'] },
  { id: 31, name: 'nidoqueen', types: ['poison', 'ground'] },
  { id: 32, name: 'nidoran-m', types: ['poison'] },
  { id: 33, name: 'nidorino', types: ['poison'] },
  { id: 34, name: 'nidoking', types: ['poison', 'ground'] },
  { id: 35, name: 'clefairy', types: ['fairy'] },
  { id: 36, name: 'clefable', types: ['fairy'] },
  { id: 37, name: 'vulpix', types: ['fire'] },
  { id: 38, name: 'ninetales', types: ['fire'] },
  { id: 39, name: 'jigglypuff', types: ['normal', 'fairy'] },
  { id: 40, name: 'wigglytuff', types: ['normal', 'fairy'] },
  { id: 41, name: 'zubat', types: ['poison', 'flying'] },
  { id: 42, name: 'golbat', types: ['poison', 'flying'] },
  { id: 43, name: 'oddish', types: ['grass', 'poison'] },
  { id: 44, name: 'gloom', types: ['grass', 'poison'] },
  { id: 45, name: 'vileplume', types: ['grass', 'poison'] },
  { id: 46, name: 'paras', types: ['bug', 'grass'] },
  { id: 47, name: 'parasect', types: ['bug', 'grass'] },
  { id: 48, name: 'venonat', types: ['bug', 'poison'] },
  { id: 49, name: 'venomoth', types: ['bug', 'poison'] },
  { id: 50, name: 'diglett', types: ['ground'] },
  { id: 51, name: 'dugtrio', types: ['ground'] },
  { id: 52, name: 'meowth', types: ['normal'] },
  { id: 53, name: 'persian', types: ['normal'] },
  { id: 54, name: 'psyduck', types: ['water'] },
  { id: 55, name: 'golduck', types: ['water'] },
  { id: 56, name: 'mankey', types: ['fighting'] },
  { id: 57, name: 'primeape', types: ['fighting'] },
  { id: 58, name: 'growlithe', types: ['fire'] },
  { id: 59, name: 'arcanine', types: ['fire'] },
  { id: 60, name: 'poliwag', types: ['water'] },
  { id: 61, name: 'poliwhirl', types: ['water'] },
  { id: 62, name: 'poliwrath', types: ['water', 'fighting'] },
  { id: 63, name: 'abra', types: ['psychic'] },
  { id: 64, name: 'kadabra', types: ['psychic'] },
  { id: 65, name: 'alakazam', types: ['psychic'] },
  { id: 66, name: 'machop', types: ['fighting'] },
  { id: 67, name: 'machoke', types: ['fighting'] },
  { id: 68, name: 'machamp', types: ['fighting'] },
  { id: 69, name: 'bellsprout', types: ['grass', 'poison'] },
  { id: 70, name: 'weepinbell', types: ['grass', 'poison'] },
  { id: 71, name: 'victreebel', types: ['grass', 'poison'] },
  { id: 72, name: 'tentacool', types: ['water', 'poison'] },
  { id: 73, name: 'tentacruel', types: ['water', 'poison'] },
  { id: 74, name: 'geodude', types: ['rock', 'ground'] },
  { id: 75, name: 'graveler', types: ['rock', 'ground'] },
  { id: 76, name: 'golem', types: ['rock', 'ground'] },
  { id: 77, name: 'ponyta', types: ['fire'] },
  { id: 78, name: 'rapidash', types: ['fire'] },
  { id: 79, name: 'slowpoke', types: ['water', 'psychic'] },
  { id: 80, name: 'slowbro', types: ['water', 'psychic'] },
  { id: 81, name: 'magnemite', types: ['electric', 'steel'] },
  { id: 82, name: 'magneton', types: ['electric', 'steel'] },
  { id: 83, name: 'farfetchd', types: ['normal', 'flying'] },
  { id: 84, name: 'doduo', types: ['normal', 'flying'] },
  { id: 85, name: 'dodrio', types: ['normal', 'flying'] },
  { id: 86, name: 'seel', types: ['water'] },
  { id: 87, name: 'dewgong', types: ['water', 'ice'] },
  { id: 88, name: 'grimer', types: ['poison'] },
  { id: 89, name: 'muk', types: ['poison'] },
  { id: 90, name: 'shellder', types: ['water'] },
  { id: 91, name: 'cloyster', types: ['water', 'ice'] },
  { id: 92, name: 'gastly', types: ['ghost', 'poison'] },
  { id: 93, name: 'haunter', types: ['ghost', 'poison'] },
  { id: 94, name: 'gengar', types: ['ghost', 'poison'] },
  { id: 95, name: 'onix', types: ['rock', 'ground'] },
  { id: 96, name: 'drowzee', types: ['psychic'] },
  { id: 97, name: 'hypno', types: ['psychic'] },
  { id: 98, name: 'krabby', types: ['water'] },
  { id: 99, name: 'kingler', types: ['water'] },
  { id: 100, name: 'voltorb', types: ['electric'] },
  { id: 101, name: 'electrode', types: ['electric'] },
  { id: 102, name: 'exeggcute', types: ['grass', 'psychic'] },
  { id: 103, name: 'exeggutor', types: ['grass', 'psychic'] },
  { id: 104, name: 'cubone', types: ['ground'] },
  { id: 105, name: 'marowak', types: ['ground'] },
  { id: 106, name: 'hitmonlee', types: ['fighting'] },
  { id: 107, name: 'hitmonchan', types: ['fighting'] },
  { id: 108, name: 'lickitung', types: ['normal'] },
  { id: 109, name: 'koffing', types: ['poison'] },
  { id: 110, name: 'weezing', types: ['poison'] },
  { id: 111, name: 'rhyhorn', types: ['ground', 'rock'] },
  { id: 112, name: 'rhydon', types: ['ground', 'rock'] },
  { id: 113, name: 'chansey', types: ['normal'] },
  { id: 114, name: 'tangela', types: ['grass'] },
  { id: 115, name: 'kangaskhan', types: ['normal'] },
  { id: 116, name: 'horsea', types: ['water'] },
  { id: 117, name: 'seadra', types: ['water'] },
  { id: 118, name: 'goldeen', types: ['water'] },
  { id: 119, name: 'seaking', types: ['water'] },
  { id: 120, name: 'staryu', types: ['water'] },
  { id: 121, name: 'starmie', types: ['water', 'psychic'] },
  { id: 122, name: 'mr-mime', types: ['psychic', 'fairy'] },
  { id: 123, name: 'scyther', types: ['bug', 'flying'] },
  { id: 124, name: 'jynx', types: ['ice', 'psychic'] },
  { id: 125, name: 'electabuzz', types: ['electric'] },
  { id: 126, name: 'magmar', types: ['fire'] },
  { id: 127, name: 'pinsir', types: ['bug'] },
  { id: 128, name: 'tauros', types: ['normal'] },
  { id: 129, name: 'magikarp', types: ['water'] },
  { id: 130, name: 'gyarados', types: ['water', 'flying'] },
  { id: 131, name: 'lapras', types: ['water', 'ice'] },
  { id: 132, name: 'ditto', types: ['normal'] },
  { id: 133, name: 'eevee', types: ['normal'] },
  { id: 134, name: 'vaporeon', types: ['water'] },
  { id: 135, name: 'jolteon', types: ['electric'] },
  { id: 136, name: 'flareon', types: ['fire'] },
  { id: 137, name: 'porygon', types: ['normal'] },
  { id: 138, name: 'omanyte', types: ['rock', 'water'] },
  { id: 139, name: 'omastar', types: ['rock', 'water'] },
  { id: 140, name: 'kabuto', types: ['rock', 'water'] },
  { id: 141, name: 'kabutops', types: ['rock', 'water'] },
  { id: 142, name: 'aerodactyl', types: ['rock', 'flying'] },
  { id: 143, name: 'snorlax', types: ['normal'] },
  { id: 144, name: 'articuno', types: ['ice', 'flying'] },
  { id: 145, name: 'zapdos', types: ['electric', 'flying'] },
  { id: 146, name: 'moltres', types: ['fire', 'flying'] },
  { id: 147, name: 'dratini', types: ['dragon'] },
  { id: 148, name: 'dragonair', types: ['dragon'] },
  { id: 149, name: 'dragonite', types: ['dragon', 'flying'] },
  { id: 150, name: 'mewtwo', types: ['psychic'] },
];

const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

const TYPE_COLORS: Record<string, string> = {
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
// Helpers
// ---------------------------------------------------------------------------

function padId(n: number): string {
  return String(n).padStart(3, '0');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function parseRoute(hash: string): { view: 'grid' } | { view: 'detail'; id: number } {
  const match = hash.match(/^#\/pokemon\/(\d+)$/);
  if (match) {
    const id = parseInt(match[1], 10);
    return id >= 1 && id <= 150 ? { view: 'detail', id } : { view: 'grid' };
  }
  return { view: 'grid' };
}

// ---------------------------------------------------------------------------
// Reusable: Type Badge
// ---------------------------------------------------------------------------

function TypeBadge({ type, size = 'base' }: { type: string; size?: 'sm' | 'base' | 'lg' }) {
  const sizeClass = size !== 'base' ? ` type-badge--${size}` : '';
  return (
    <span
      className={`type-badge${sizeClass}`}
      style={{ '--type-color': TYPE_COLORS[type] ?? '#777' } as CSSProperties}
    >
      {capitalize(type)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pokemon Card
// ---------------------------------------------------------------------------

function PokemonCard({ pokemon, index }: { pokemon: Pokemon; index: number }) {
  return (
    <a
      href={`#/pokemon/${pokemon.id}`}
      className="pokemon-card"
      style={{
        '--card-type-color': TYPE_COLORS[pokemon.types[0]] ?? '#777',
        '--card-delay': `${Math.min(index * 30, 600)}ms`,
      } as CSSProperties}
    >
      <span className="pokemon-card__number">#{padId(pokemon.id)}</span>
      <div className="pokemon-card__image-wrapper">
        <img
          className="pokemon-card__image"
          src={spriteUrl(pokemon.id)}
          alt={capitalize(pokemon.name)}
          loading="lazy"
          width="80"
          height="80"
        />
      </div>
      <span className="pokemon-card__name">{capitalize(pokemon.name)}</span>
      <div className="pokemon-card__types">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Type Filter Bar
// ---------------------------------------------------------------------------

function TypeFilterBar({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (type: string | null) => void;
}) {
  return (
    <div className="pokedex-filters">
      <button
        className={`pokedex-filter-btn${selected === null ? ' pokedex-filter-btn--active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {ALL_TYPES.map((type) => (
        <button
          key={type}
          className={`pokedex-filter-btn${selected === type ? ' pokedex-filter-btn--active' : ''}`}
          style={{ '--filter-type-color': TYPE_COLORS[type] } as CSSProperties}
          onClick={() => onSelect(selected === type ? null : type)}
        >
          {capitalize(type)}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pokedex Grid View
// ---------------------------------------------------------------------------

function PokedexGrid() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return POKEMON_LIST.filter((p) => {
      const matchesSearch =
        search === '' ||
        p.name.includes(search.toLowerCase()) ||
        padId(p.id).includes(search);
      const matchesType = selectedType === null || p.types.includes(selectedType);
      return matchesSearch && matchesType;
    });
  }, [search, selectedType]);

  return (
    <div className="pokedex-app">
      {/* Sticky Header */}
      <header className="pokedex-header">
        <div className="pokedex-header__inner">
          <div className="pokedex-header__top">
            <h1 className="pokedex-header__title">Pokédex</h1>
            <div className="pokedex-header__leds">
              <span className="pokedex-header__led pokedex-header__led--blue" />
              <span className="pokedex-header__led pokedex-header__led--red" />
              <span className="pokedex-header__led pokedex-header__led--green" />
            </div>
          </div>

          {/* Search */}
          <div className="pokedex-search-wrapper">
            <input
              type="text"
              className="pokedex-search"
              placeholder="Search by name or number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type filters */}
          <TypeFilterBar selected={selectedType} onSelect={setSelectedType} />
        </div>
      </header>

      {/* Main content */}
      <main className="app-shell">
        <p className="pokedex-grid__count">
          {filtered.length} Pokémon found
        </p>

        <div className="pokedex-grid">
          {filtered.map((pokemon, i) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="pokedex-empty">
            <div className="pokedex-empty__icon">?</div>
            <p className="pokedex-empty__title">No Pokémon found</p>
            <p className="pokedex-empty__text">Try a different search or filter</p>
            <button
              className="pokedex-empty__action"
              onClick={() => {
                setSearch('');
                setSelectedType(null);
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pokemon Detail View
// ---------------------------------------------------------------------------

function PokemonDetail({ id }: { id: number }) {
  const pokemon = POKEMON_LIST.find((p) => p.id === id);
  const prevId = id === 1 ? 150 : id - 1;
  const nextId = id === 150 ? 1 : id + 1;

  if (!pokemon) {
    return (
      <div className="pokedex-app">
        <main className="app-shell" style={{ paddingTop: '60px', textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: '1.2rem' }}>Pokémon not found.</p>
          <a href="#/" className="pokedex-empty__action" style={{ marginTop: '16px', display: 'inline-block' }}>
            Back to Pokédex
          </a>
        </main>
      </div>
    );
  }

  return (
    <div
      className="pokedex-detail"
      style={{ '--detail-type-color': TYPE_COLORS[pokemon.types[0]] ?? '#777' } as CSSProperties}
    >
      {/* Navigation bar */}
      <nav className="pokedex-nav">
        <div className="pokedex-nav__inner">
          <a href="#/" className="pokedex-nav__btn pokedex-nav__btn--back" aria-label="Back to Pokédex">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>

          <div className="pokedex-nav__title-area">
            <span className="pokedex-nav__name">{capitalize(pokemon.name)}</span>
            <span className="pokedex-nav__id">#{padId(pokemon.id)}</span>
          </div>

          <div className="pokedex-nav__arrows">
            <a
              href={`#/pokemon/${prevId}`}
              className="pokedex-nav__btn pokedex-nav__btn--prev"
              aria-label={`Previous Pokémon (#${padId(prevId)})`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </a>
            <a
              href={`#/pokemon/${nextId}`}
              className="pokedex-nav__btn pokedex-nav__btn--next"
              aria-label={`Next Pokémon (#${padId(nextId)})`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

      {/* Detail Content */}
      <div className="pokedex-detail__inner">
        {/* Type badges */}
        <div className="pokedex-detail__types">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} size="lg" />
          ))}
        </div>

        {/* page-blocks Slot integration */}
        <SlotContext name="pokemon" value={pokemon.name} slots={['pokemon_hero', 'pokemon_stats']}>
          <div className="pokedex-detail__slots">
            <section className="pokedex-detail__section pokedex-detail__section--hero">
              <Slot name="pokemon_hero" className="pokemon-slot" />
            </section>
            <section className="pokedex-detail__section pokedex-detail__section--stats">
              <Slot name="pokemon_stats" className="pokemon-slot" />
            </section>
          </div>
        </SlotContext>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App (router)
// ---------------------------------------------------------------------------

export function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  const route = parseRoute(hash);

  let page;
  if (route.view === 'detail') {
    page = <PokemonDetail id={route.id} />;
  } else {
    page = <PokedexGrid />;
  }

  return <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>;
}
