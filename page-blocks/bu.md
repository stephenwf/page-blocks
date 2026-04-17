# Comprehensive guide to using page blocks with Vite

This guide is for end-users integrating the current `page-blocks` package into a React + Vite app.

It is based on the code in this repository, especially:

- `page-blocks/vite`
- `page-blocks/react`
- `page-blocks/react-client`
- `page-blocks/react-editor`
- `page-blocks/file-system`
- `examples/vite`

The goal is to show a complete, working setup, then explain the concepts and the runtime model in enough detail that you can adapt it to your own app.

## What page blocks is

Page blocks separates three concerns:

1. Your UI lives in React components called blocks.
2. Your editable page composition lives in slot JSON files.
3. A block directory ties those together so the renderer and the editor both know which block types exist.

The mental model is:

- A block is a typed React component with metadata.
- A slot is a named region such as `hero`, `content`, or `sidebar`.
- A page asks for a slot by name.
- page-blocks resolves the best matching slot JSON for the current context.
- The saved JSON says which blocks to render and what props they receive.

That gives you a useful split:

- Developers own components, schemas, and layout rules.
- Editors own which blocks appear in which slots.
- Context decides which saved slot data applies.

## Why the Vite integration matters

The current Vite path is intentionally small.

In development:

- `page-blocks/vite` mounts `POST /api/page-blocks` directly on the Vite dev server.
- The filesystem loader reads and writes JSON files under your `slots/` directory.
- The editor talks to that endpoint to load slots and save mutations.

In a production client build:

- the Vite plugin scans the slot files and creates a static manifest
- the client reads from that manifest instead of calling an API
- editing becomes read-only

That means the default Vite flow does not require a separate local API server just to make the basic editor work.

## What you will build

This tutorial builds a small React app with:

- a `hero` slot
- a `content` slot
- a nested-slot block named `FeatureShelf`
- a route-specific hero for `/about`
- the in-browser page-blocks editor in development

The finished project layout will look like this:

```text
my-page-blocks-app/
  slots/
    hero.json
    content.json
    @path/
      about/
        hero.json
  src/
    app.tsx
    main.tsx
    styles.css
    blocks/
      callout-card.tsx
      feature-shelf.tsx
      directory.ts
  vite.config.ts
```

## Prerequisites

- Node `>=18.14.1`
- a Vite React app
- `zod` for block prop schemas
- `react-query` because the current React client uses it for slot loading
- the editor peer dependencies if you want the visual editor

If you are starting from scratch with pnpm:

```sh
pnpm create vite my-page-blocks-app --template react-ts
cd my-page-blocks-app
pnpm install
pnpm add page-blocks react-query @nanostores/react uniforms uniforms-bridge-zod uniforms-semantic zod
```

If you prefer npm or yarn, the package list is the same.

## Step 1: configure Vite

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pageBlocks from 'page-blocks/vite';

export default defineConfig({
  plugins: [react(), pageBlocks()],
});
```

This is the smallest supported Vite integration.

Important defaults:

- `slotsDir` defaults to `slots`
- `apiPath` defaults to `/api/page-blocks`
- `contexts` defaults to `['path']`

That last point matters a lot: even with no extra configuration, page-blocks automatically treats the current URL path as context.

## Step 2: load the required CSS

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'page-blocks/react/style.css';
import 'page-blocks/react-editor/style.css';
import 'page-blocks/web-components/style.css';
import './styles.css';
import { App } from './app';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Why these styles exist:

- `page-blocks/react/style.css` covers React-side defaults
- `page-blocks/react-editor/style.css` styles the editor UI
- `page-blocks/web-components/style.css` gives the `pb-slot` and `pb-block` elements sensible display behavior and editing affordances

## Step 3: create your blocks

### `src/blocks/callout-card.tsx`

```tsx
import { block } from 'page-blocks/react';
import { z } from 'zod';

const calloutCardProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  linkLabel: z.string().optional(),
});

export const CalloutCard = block(
  {
    label: 'Callout card',
    description: 'Simple editorial card used for hero and supporting content.',
    props: calloutCardProps,
    examples: [
      {
        label: 'Default card',
        display: { width: 360 },
        context: {},
        props: {
          eyebrow: 'Page blocks',
          title: 'Editable content in a normal React app',
          body: 'Blocks are still just React components. The editable part is the slot data that chooses which blocks render.',
          href: '/about',
          linkLabel: 'Open the about page',
        },
      },
      {
        label: 'Secondary card',
        display: { width: 360 },
        context: {},
        props: {
          eyebrow: 'Vite',
          title: 'No sidecar server required for the basic setup',
          body: 'In development, the page-blocks Vite plugin mounts the API endpoint on Vite itself.',
        },
      },
    ],
  },
  function CalloutCard(props) {
    return (
      <article className="callout-card">
        {props.eyebrow ? <p className="callout-card__eyebrow">{props.eyebrow}</p> : null}
        <h2 className="callout-card__title">{props.title}</h2>
        <p className="callout-card__body">{props.body}</p>
        {props.href && props.linkLabel ? (
          <p className="callout-card__action">
            <a href={props.href}>{props.linkLabel}</a>
          </p>
        ) : null}
      </article>
    );
  }
);
```

What this does:

- `block(...)` attaches block metadata to a React component
- `props` is a Zod schema, so the block is typed and editor forms can be generated
- `examples` power archive previews and screenshot generation

### `src/blocks/feature-shelf.tsx`

```tsx
import { block, blockSlot } from 'page-blocks/react';
import { z } from 'zod';

const featureShelfProps = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  intro: z.string().optional(),
});

export const FeatureShelf = block(
  {
    label: 'Feature shelf',
    description: 'A block with an inner slot named items.',
    props: featureShelfProps,
    slots: ['items'],
    slotConfig: {
      items: {
        label: 'Shelf items',
        description: 'Cards rendered inside the shelf grid.',
      },
    },
    examples: [
      {
        label: 'Shelf example',
        display: { width: 960 },
        context: {},
        props: {
          eyebrow: 'Nested slots',
          title: 'Blocks can own their own local slots',
          intro: 'Use this when a block should contain a structured editable region, not just flat props.',
        },
      },
    ],
  },
  function FeatureShelf(props) {
    return (
      <section className="feature-shelf">
        <header className="feature-shelf__header">
          {props.eyebrow ? <p className="feature-shelf__eyebrow">{props.eyebrow}</p> : null}
          <h2 className="feature-shelf__title">{props.title}</h2>
          {props.intro ? <p className="feature-shelf__intro">{props.intro}</p> : null}
        </header>

        {blockSlot(
          props.items,
          { className: 'feature-shelf__items pb-grid-slot' },
          <div className="feature-shelf__empty">Add cards to the shelf.</div>
        )}
      </section>
    );
  }
);
```

The key part here is `slots: ['items']`.

That tells page-blocks this block can own a child slot. When saved slot data contains a `FeatureShelf`, its JSON can also contain a nested `slots.items` object with more blocks inside it.

## Step 4: create the block directory

Create `src/blocks/directory.ts`:

```ts
import { createDirectory } from 'page-blocks/react';
import { CalloutCard } from './callout-card';
import { FeatureShelf } from './feature-shelf';

export const directory = createDirectory({
  context: {},
  blocks: {
    CalloutCard,
    FeatureShelf,
  },
});

export const Slot: typeof directory.Slot = directory.Slot;
export const SlotContext: typeof directory.SlotContext = directory.SlotContext;
export const BlockArchive: typeof directory.BlockArchive = directory.BlockArchive;
```

Important detail: with Vite, you can usually omit `resolver`.

`createDirectory()` calls `resolveDirectoryResolver()`, which reads the runtime configuration injected by the Vite plugin. In other words, the Vite plugin decides where slot requests should go.

This directory gives you:

- `directory.Slot` for rendering named slots
- `directory.SlotContext` for injecting context values
- `directory.BlockArchive` for rendering example states of every block
- `directory.BlockEditor` as a convenience wrapper around the editor client once `page-blocks/react-editor` has been loaded
- `directory.Blocks` if you want the raw registered block map

## Step 5: render slots and the editor

Create `src/app.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from 'react-query';
import { BlockEditor as PageBlocksEditor } from 'page-blocks/react-client';
import { BlockEditorReact } from 'page-blocks/react-editor';
import { BlockArchive, Slot, directory } from './blocks/directory';

const queryClient = new QueryClient();

function resolvePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
}

function Editor() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <BlockEditorReact>
      <PageBlocksEditor options={directory} showToggle />
    </BlockEditorReact>
  );
}

function HomePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Home</h1>
        <nav className="page-nav">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/block-archive">Block archive</a>
        </nav>
      </header>

      <Slot name="hero" className="demo-slot" />
      <Slot name="content" className="demo-slot" />
    </main>
  );
}

function AboutPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>About</h1>
        <nav className="page-nav">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/block-archive">Block archive</a>
        </nav>
      </header>

      <Slot name="hero" className="demo-slot" />

      <section className="demo-slot">
        <p>
          This route exists to show path-based context matching. Its hero comes from
          <code> slots/@path/about/hero.json</code>, not from the global <code>slots/hero.json</code>.
        </p>
      </section>
    </main>
  );
}

function BlockArchivePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Block archive</h1>
        <nav className="page-nav">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/block-archive">Block archive</a>
        </nav>
      </header>

      <BlockArchive />
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Not found</h1>
      </header>

      <section className="demo-slot">
        <p>
          Try <a href="/">/</a>, <a href="/about">/about</a>, or <a href="/block-archive">/block-archive</a>.
        </p>
      </section>
    </main>
  );
}

export function App() {
  const pathname = resolvePathname(window.location.pathname);

  let page = <NotFoundPage />;
  if (pathname === '/') {
    page = <HomePage />;
  } else if (pathname === '/about') {
    page = <AboutPage />;
  } else if (pathname === '/block-archive') {
    page = <BlockArchivePage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {page}
      <Editor />
    </QueryClientProvider>
  );
}
```

Why the editor is wired this way:

- the slot renderer uses React Query, so you need a `QueryClientProvider`
- `BlockEditorReact` imports the editor web component implementation
- `PageBlocksEditor` renders the actual editor instance and mutation plumbing
- guarding with `import.meta.env.DEV` keeps the editor out of production

## Step 6: add a little CSS

Create `src/styles.css`:

```css
:root {
  color: #18202b;
  background: #f5f1e8;
  font-family: Georgia, serif;
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.page {
  width: min(1000px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 72px;
}

.page-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-nav {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.demo-slot,
.block-archive__block-container {
  margin-bottom: 20px;
}

.callout-card,
.feature-shelf,
.demo-slot {
  padding: 20px;
  border: 1px solid rgba(24, 32, 43, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
}

.callout-card__eyebrow,
.feature-shelf__eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
  color: #8c4e2c;
}

.callout-card__title,
.feature-shelf__title {
  margin: 0 0 10px;
}

.feature-shelf__items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.feature-shelf__empty {
  padding: 18px;
  border: 1px dashed rgba(24, 32, 43, 0.24);
  border-radius: 12px;
}
```

## Step 7: create slot JSON files

Create `slots/hero.json`:

```json
{
  "name": "hero",
  "blocks": [
    {
      "id": "home-hero",
      "type": "CalloutCard",
      "data": {
        "eyebrow": "Global slot",
        "title": "This hero is used on the home page",
        "body": "Because it lives at slots/hero.json, it acts as the fallback hero when no more specific match exists.",
        "href": "/about",
        "linkLabel": "See the route-specific hero"
      }
    }
  ]
}
```

Create `slots/content.json`:

```json
{
  "name": "content",
  "blocks": [
    {
      "id": "home-content",
      "type": "FeatureShelf",
      "data": {
        "eyebrow": "Nested slot example",
        "title": "This block owns an inner items slot",
        "intro": "The cards below are stored inside the FeatureShelf block, not as page-level slots."
      },
      "slots": {
        "items": {
          "slot_id": "items",
          "blocks": [
            {
              "id": "shelf-card-1",
              "type": "CalloutCard",
              "data": {
                "eyebrow": "Block directory",
                "title": "Registered block types become renderable content",
                "body": "The saved JSON says type=CalloutCard, and the directory maps that to the React component."
              }
            },
            {
              "id": "shelf-card-2",
              "type": "CalloutCard",
              "data": {
                "eyebrow": "Editor",
                "title": "Edits write back into slots/",
                "body": "Open the editor, change props, and then inspect these JSON files."
              }
            }
          ]
        }
      }
    }
  ]
}
```

Create `slots/@path/about/hero.json`:

```json
{
  "name": "hero",
  "blocks": [
    {
      "id": "about-hero",
      "type": "CalloutCard",
      "data": {
        "eyebrow": "Path context",
        "title": "This hero only renders on /about",
        "body": "The default Vite setup includes the current pathname as context, so this file beats the global hero when the path is /about.",
        "href": "/",
        "linkLabel": "Back to home"
      }
    }
  ]
}
```

## Step 8: run the app

```sh
pnpm dev
```

Then open:

- `/`
- `/about`
- `/block-archive`

What you should observe:

- `/` resolves `slots/hero.json` and `slots/content.json`
- `/about` resolves `slots/@path/about/hero.json`
- `/block-archive` renders block examples, not saved slot content
- in development, the editor toggle appears
- edits persist back into `slots/`

At this point you have a working page-blocks + Vite setup.

## Understanding slots, blocks, and defaults

There are two common ways to think about a slot:

1. A slot can be fully content-driven from JSON.
2. A slot can fall back to hardcoded React children if no saved slot exists yet.

That fallback behavior comes directly from the slot renderer. If a slot lookup does not return saved data, page-blocks renders the `children` you passed to `<Slot>`.

Example:

```tsx
<Slot name="hero">
  <Slot.CalloutCard
    id="hero-fallback"
    eyebrow="Fallback"
    title="Code-defined default content"
    body="This renders only when there is no saved slot match."
  />
</Slot>
```

That is useful when you want:

- sensible defaults in code
- editable overrides later
- a gradual adoption path instead of an all-at-once migration

## Understanding contexts

Contexts are the key to making one slot name behave differently in different situations.

Examples:

- `hero` on `/`
- `hero` on `/about`
- `hero` for `locale=fr`
- `hero` for `campaign=spring-sale`

The same slot name can resolve to different files based on context.

### Where context comes from

In the current Vite integration, slot context is merged from three places:

1. default Vite context
2. directory-level default context
3. nested `SlotContext` providers

### 1. Default Vite context

By default, the Vite plugin sets:

```ts
pageBlocks({
  contexts: ['path'],
});
```

You do not have to write that explicitly because it is the default.

That means every slot request automatically includes the current normalized pathname:

- `/` stays `/`
- `/about/` becomes `/about`

That is why this file:

```text
slots/@path/about/hero.json
```

matches the `/about` route.

### 2. Directory-level default context

You can attach default context to the directory itself:

```ts
export const directory = createDirectory({
  context: {
    locale: 'en',
  },
  blocks: {
    CalloutCard,
    FeatureShelf,
  },
});
```

This does not change file matching by itself unless the Vite plugin also knows about that context name:

```ts
pageBlocks({
  contexts: ['path', 'locale'],
});
```

### 3. Nested `SlotContext`

You can set or override context for part of the tree:

```tsx
import { Slot, SlotContext } from './blocks/directory';

function MarketingPage({ locale }: { locale: string }) {
  return (
    <SlotContext name="locale" value={locale}>
      <Slot name="hero" />
      <Slot name="content" />
    </SlotContext>
  );
}
```

Now the slot requests inside that subtree include both:

- the current `path`
- the current `locale`

### How context maps to files

If your Vite config says:

```ts
pageBlocks({
  contexts: ['path', 'locale'],
});
```

then these files mean:

| File path                                | Meaning                              |
| ---------------------------------------- | ------------------------------------ |
| `slots/hero.json`                        | global fallback                      |
| `slots/@path/about/hero.json`            | hero for `/about`                    |
| `slots/@locale/fr/hero.json`             | hero for any route where `locale=fr` |
| `slots/@path/about/@locale/fr/hero.json` | hero for `/about` when `locale=fr`   |

Advanced match folders also exist:

| Folder segment   | Meaning                                |
| ---------------- | -------------------------------------- |
| `@locale/fr`     | exact match                            |
| `@locale:all`    | match whenever that context is present |
| `@campaign:none` | match only when that context is absent |

For end-user content, exact matches are the main thing to care about.

### Important detail: context order matters

The configured `contexts` array is not just documentation. In the current implementation it affects:

- the order used when generating file paths
- the order expected when reconstructing match metadata
- match specificity weighting

So treat this as a stable contract:

```ts
pageBlocks({
  contexts: ['path', 'locale'],
});
```

If you change it later to:

```ts
pageBlocks({
  contexts: ['locale', 'path'],
});
```

you are changing how content paths are interpreted.

## How the Vite runtime actually works

Here is the runtime flow for a normal client-rendered slot:

1. You render `<Slot name="hero" />`.
2. The React client merges context from the Vite defaults, the directory, and any `SlotContext`.
3. A remote loader creates a request like this:

```json
{
  "type": "request-slots",
  "context": {
    "path": "/about"
  },
  "slots": ["hero"]
}
```

4. In development, that request is sent to `/api/page-blocks`.
5. The Vite plugin intercepts it and hands it to `createRequestHandler(...)`.
6. The filesystem loader scans `slots/`, finds the best matching file, reads the JSON, and normalizes it.
7. The response comes back as slot data.
8. The renderer looks up each block `type` in your block directory and renders the matching React component.

The editor uses the same endpoint for mutations such as:

- `create-slot`
- `create-block`
- `update-block-props`
- `reorder-blocks`
- `delete-block`

Those mutations write straight back to the filesystem loader's target directory.

## Production behavior

The current Vite plugin behaves differently in production client builds.

Instead of keeping the live API path:

- it scans the slot JSON files during build
- it creates a static slot manifest
- it injects that manifest into the client bundle

The result:

- slot rendering still works
- fetching can be avoided for slot resolution
- editing is disabled

That is why the tutorial guards the editor with `import.meta.env.DEV`.

## Nested slots

Nested slots are one of the most important features to understand.

At the page level, you might have:

- `hero`
- `content`

But a block inside `content` can also declare its own editable regions:

```ts
slots: ['items'];
```

That is what `FeatureShelf` does.

When page-blocks renders a block with inner slots:

- it passes renderer functions like `props.items`
- your component calls `blockSlot(...)`
- the saved nested slot JSON is rendered there

This keeps complex blocks self-contained.

Instead of adding more and more page-level slots, you can build a block that owns its own local structure.

## Optional: screenshots and archive previews

If you want image previews in the add-block dialog, use the screenshot generator.

Add this to `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pageBlocks from 'page-blocks/vite';
import { createScreenshotGenerator } from 'page-blocks/screenshots';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    pageBlocks({
      generateScreenshots: createScreenshotGenerator({
        host: 'http://127.0.0.1:5173',
        archivePath: '/block-archive',
        target: join(__dirname, 'public/blocks'),
      }),
    }),
  ],
});
```

Then set a screenshots public path on the directory:

```ts
export const directory = createDirectory({
  screenshots: '/blocks',
  blocks: {
    CalloutCard,
    FeatureShelf,
  },
});
```

And make sure your app exposes:

```tsx
<BlockArchive />
```

The screenshot generator reads the archive page, finds each block example, and saves JPEGs into your configured target directory.

Practical notes:

- install `playwright` if you want screenshots
- each block should have `examples`
- screenshot generation is mainly for development/editor UX

## Optional: loading slots on the server in a Vite environment

If you are using Vite SSR, or you want to resolve slots outside the client renderer, use the server helpers:

```ts
import { loadPageBlocksSlots, resolvePageBlocksContext } from 'page-blocks/vite/server';

const context = resolvePageBlocksContext(request);
const slots = await loadPageBlocksSlots(context, ['hero', 'content']);
```

What these helpers do:

- in development, they read from the filesystem loader created from the Vite runtime config
- in static mode, they read from the injected manifest

That keeps your slot resolution logic aligned with the normal client path.

## Reference: `pageBlocks(...)` Vite options

These are the public Vite plugin options exposed by the current source:

| Option                | Type                  | Default              | What it does                                                       |
| --------------------- | --------------------- | -------------------- | ------------------------------------------------------------------ |
| `slotsDir`            | `string`              | `'slots'`            | Filesystem directory used for slot JSON                            |
| `apiPath`             | `string`              | `'/api/page-blocks'` | Dev endpoint mounted on the Vite server                            |
| `contexts`            | `string[]`            | `['path']`           | Ordered context names used for file matching                       |
| `screenshots`         | `string`              | `undefined`          | Public path for block screenshot thumbnails                        |
| `designs`             | `string \| string[]`  | `undefined`          | Enables blueprint/design mode instead of direct filesystem editing |
| `generateScreenshots` | `() => Promise<void>` | `undefined`          | Called by the editor when screenshot generation is requested       |

Notes:

- `designs` switches the runtime into blueprint-backed mode
- blueprint runtime is read-only
- the tutorial in this file focuses on the editable filesystem flow, because that is the simplest Vite setup

## Reference: `createDirectory(...)` options

The current `DirectoryOptions` type contains:

| Option        | Type                          | What it does                                          |
| ------------- | ----------------------------- | ----------------------------------------------------- |
| `blocks`      | `Record<string, Block>`       | Required block registry                               |
| `resolver`    | block resolver                | Usually omitted in Vite because the plugin injects it |
| `context`     | `Record<string, string>`      | Default context merged into slot requests             |
| `metadata`    | `Record<string, BlockConfig>` | Advanced override metadata map                        |
| `screenshots` | `string`                      | Public screenshot path used by the editor             |

The current resolver type is:

```ts
{
  type: 'tanstack-query';
  endpoint?: string;
  screenshots?: string;
}
```

In practice, for Vite you normally let `createDirectory()` resolve this automatically from the runtime config created by `pageBlocks(...)`.

## Reference: `block(...)` config options

These are the main fields exposed by the current `BlockConfig` type.

### Common fields

| Option         | What it does                                                   |
| -------------- | -------------------------------------------------------------- |
| `label`        | Human-readable block name used by the editor                   |
| `description`  | Optional explanatory text                                      |
| `props`        | Zod schema for the block props                                 |
| `examples`     | Example states used by archive previews and screenshots        |
| `slots`        | Names of inner slots owned by the block                        |
| `slotConfig`   | Labels, descriptions, and limits for inner slots               |
| `propSources`  | Search/source definitions for adding blocks from external data |
| `mapToProps`   | Maps stored data into component props                          |
| `mapFromProps` | Maps component props into stored data                          |

### Editor and metadata fields

| Option            | What it does                                       |
| ----------------- | -------------------------------------------------- |
| `data`            | Per-prop editor metadata for data fields           |
| `ui`              | Per-prop editor metadata for UI fields             |
| `groups`          | Groups props into data, UI, or tab sections        |
| `hideTabs`        | Hides the data or UI tabs in the editor            |
| `blockStylesheet` | Optional stylesheet metadata attached to the block |

### Context and advanced fields

| Option            | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `requiredContext` | Context keys the block expects to be present      |
| `optionalContext` | Context keys that may be present                  |
| `contextSources`  | Source definitions for discovering context values |
| `preload`         | Async server-side preload hook                    |

For most Vite apps, you can get very far with just:

- `label`
- `description`
- `props`
- `examples`
- `slots`
- `slotConfig`

## Reference: `propSource(...)` and `contextSource(...)`

The helper types exist for searchable sources in block and context workflows.

A `propSource(...)` looks like this:

```ts
import { propSource } from 'page-blocks/react';
import { z } from 'zod';

const articleProps = z.object({
  title: z.string(),
  body: z.string(),
});

export const articleSearch = propSource(articleProps, {
  type: 'search',
  url: '/api/articles?q={query}',
  mapToList(response, list) {
    for (const article of response.results) {
      list.push({
        label: article.title,
        props: {
          title: article.title,
          body: article.summary,
        },
      });
    }

    return list;
  },
});
```

Attach it to a block with:

```ts
propSources: [articleSearch];
```

A `contextSource(...)` has the same broad shape, but returns `context` objects instead of `props`. The type is exposed in the current package and the request protocol supports context queries, but the main Vite example in this repository focuses on direct `SlotContext` usage and filesystem matching.

## Troubleshooting

### The slot renders nothing

Check these first:

- the slot name in React matches the JSON file name
- the block `type` string in JSON matches the key in `blocks`
- the required CSS imports are present
- the current context really matches the file path you created

### The editor appears but saves fail

Check:

- you are running the app in development
- the Vite plugin is enabled
- the slot directory exists or is writable
- you did not build into static read-only mode and then expect mutations to work

### The wrong slot file wins

Check:

- whether a more specific contextual file exists
- whether your trailing slashes differ from the normalized path
- whether your `contexts` array order changed

### My custom context is ignored

Make sure all of these line up:

1. the Vite plugin lists the context name in `contexts`
2. you actually set that context with `directory.context` or `SlotContext`
3. the file path uses the same context name

## Recommended starting point

If you are adopting page-blocks in a real app, the lowest-friction sequence is:

1. Start with `pageBlocks()` and the default `path` context only.
2. Build one or two simple blocks with good Zod schemas.
3. Put real content into `slots/*.json`.
4. Add one path-specific slot file to confirm contextual matching.
5. Add nested slots only when a block genuinely owns structured child content.
6. Add screenshot generation later, once the block library is stable enough to benefit from previews.

That path keeps the system understandable:

- components stay normal
- content stays inspectable
- context stays explicit
- Vite stays simple

Once that foundation is solid, adding more contexts or more advanced block metadata is much easier.
