# Pokédex — page-blocks blueprint example

A modern Pokédex for the original 150 Pokémon, built with **page-blocks** blueprints and the [PokéAPI](https://pokeapi.co/).

This example demonstrates how the **designer / blueprint** system can generate context-aware page content at build time by fetching data from an external API and producing typed slot data for every Pokémon.

![Pokédex screenshot placeholder](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png)

---

## What it shows

| Concept                  | How it's used                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Blueprints / Designs** | `src/designs/pokemon-banners.tsx` fetches all 150 Pokémon from PokéAPI and generates `pokemon_hero` + `pokemon_stats` slots for each one |
| **Context matching**     | Each Pokémon page sets `<SlotContext name="pokemon" value={name}>` so the correct slot data is resolved automatically                    |
| **Typed blocks**         | `PokemonHero` and `PokemonStats` blocks use Zod schemas for compile-time prop safety                                                     |
| **Static generation**    | `design:sync` pre-compiles all slot data to JSON; in dev mode, slots are compiled on the fly via Vite SSR                                |

---

## Quick start

```sh
# From the repo root
pnpm install
pnpm --filter page-blocks build

# Run the dev server (blueprints compile live)
cd examples/vite-blueprints
pnpm dev
```

Open **http://127.0.0.1:5174** to browse the Pokédex.

---

## Project structure

```
src/
├── main.tsx                    # React entry point
├── app.tsx                     # Pokédex grid + detail views (hash router)
├── styles.css                  # Full Pokédex theme (dark mode, type colors, animations)
├── blocks/
│   ├── directory.tsx            # Block registry (PokemonHero, PokemonStats)
│   ├── pokemon-banner.tsx       # PokemonHero block — artwork, name, types, description
│   └── pokemon-stats.tsx        # PokemonStats block — base stat bars
├── cms/
│   └── pokemon.ts               # PokéAPI client with caching, type colors, helpers
└── designs/
    └── pokemon-banners.tsx      # Blueprint: fetches all 150 from PokéAPI → slot data

slots-generated/                 # Output of design:sync (committed or gitignored)
scripts/
└── design-sync.ts               # CLI script to compile blueprints → JSON files
```

---

## How it works

### 1. The grid (client-side only)

`app.tsx` contains a hardcoded list of all 150 Pokémon with their names and types. The grid view renders them with official artwork sprites, search, and type filtering — no API calls needed.

### 2. The detail page (page-blocks slots)

When you click a Pokémon card, the app navigates to `#/pokemon/{id}`. The detail view wraps its content in:

```tsx
<SlotContext name="pokemon" value={pokemon.name}>
  <Slot name="pokemon_hero" />
  <Slot name="pokemon_stats" />
</SlotContext>
```

The `Slot` components resolve their data from the blueprint-generated manifest, finding the exact match for the current Pokémon name.

### 3. The blueprint (build-time data fetching)

`src/designs/pokemon-banners.tsx` runs at build time (or in dev via Vite SSR). It:

1. Iterates through all 150 Pokémon in batches of 10
2. Fetches each Pokémon's data and species description from PokéAPI
3. Calls `slots.add()` for each Pokémon to create `pokemon_hero` and `pokemon_stats` slot entries
4. The JSX elements are **serialized** (not rendered) into typed JSON

### 4. Context resolution

Each slot entry is keyed by `{ pokemon: "bulbasaur" }`, `{ pokemon: "pikachu" }`, etc. When the `<SlotContext>` sets the pokemon context value, the matching slot data is found and the block component is rendered with the correct props.

---

## Scripts

| Script             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Start Vite dev server with live blueprint compilation |
| `pnpm build`       | Run `design:sync` then `vite build` for production    |
| `pnpm design:sync` | Compile blueprints → JSON files in `slots-generated/` |
| `pnpm preview`     | Preview the production build                          |
| `pnpm typecheck`   | Type-check both client and server configs             |

---

## API usage

This example uses the free [PokéAPI](https://pokeapi.co/) (no API key required). During `design:sync` or dev server startup, it makes ~300 requests (2 per Pokémon: `/pokemon/{id}` and `/pokemon-species/{id}`). The results are cached in memory during a single run.

---

## Credits

- Pokémon data from [PokéAPI](https://pokeapi.co/)
- Pokémon artwork from the [PokéAPI sprites repository](https://github.com/PokeAPI/sprites)
- Pokémon is © Nintendo / Game Freak / The Pokémon Company
