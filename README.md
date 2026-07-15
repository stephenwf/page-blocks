# Page Blocks

Page Blocks is a template-owned content layer for React sites. A template defines the blocks, schemas, contexts, and slot policies it supports; content can then be edited locally, baked into a static build, or supplied by an authorized draft service during a deployed preview.

> [!WARNING]
> This repository is working toward its first stable release. The new single-package API is intentionally allowed to make breaking changes until that release.

## What is supported

The same block directory can be used in four situations:

| Situation | Content source | Editing |
| --- | --- | --- |
| Vite development | JSON files in `slots/` through local middleware | Yes |
| Static production | Snapshot embedded in the build or emitted as JSON files | No |
| Anonymous deployed preview | The same baked snapshot as production | No |
| Authorized deployed preview | A remote versioned service activated in the browser | Yes, when the server authorizes it |

Static and preview builds are separate artifacts. A static build does not include the preview bootstrap, editor JavaScript, or editor CSS. A preview build includes only a small application-owned bootstrap initially and lazy-loads the editor after the application has established an authorized session.

Page Blocks does not manage users, issue sessions, define tenant rules, or connect directly to a database. Those remain application responsibilities.

## Install and imports

Node.js 24 is the recommended development runtime; Node.js 22 is the supported floor. The repository pins pnpm 11.13.0 through `packageManager`, so Corepack can select the same package-manager version locally and in CI:

```sh
corepack enable
pnpm install
pnpm build
```

The repository is one publishable package at its root. The applications under `examples/` are workspace consumers of that package, which keeps their imports representative of a real installation while allowing one command to verify the entire repository.

For an application, install `page-blocks` plus the peer dependencies required by the integration you use. The main public entry points are:

| Import | Responsibility |
| --- | --- |
| `page-blocks/core` | Protocol schemas, slot documents, matching, directory manifests |
| `page-blocks/react` | React block declarations, directories, slots, shared rendering |
| `page-blocks/client` | Typed remote client, runtime source controller, editor state |
| `page-blocks/editor` | Lazy editor entry and mount/unmount lifecycle |
| `page-blocks/server` | Store/service boundary and fetch-native authorized handler |
| `page-blocks/file-system` | Local JSON loader/store and snapshot import/export |
| `page-blocks/vite` | Local middleware, static emission, preview bootstrap injection |
| `page-blocks/vite/server` | Vite SSR slot-loading helpers |
| `page-blocks/designer` | Build-time blueprint compilation |
| `page-blocks/screenshots` | Block archive screenshot generation |

`page-blocks/react-client`, `page-blocks/react-editor`, `page-blocks/node`, and `page-blocks/next` remain available for compatibility. New deployed integrations should prefer the fetch-native `client` and `server` APIs.

## Define a block directory

A block is a React component paired with metadata and, normally, a Zod props schema:

```tsx
// src/page-blocks/blocks/callout.tsx
import { block } from 'page-blocks/react';
import { z } from 'zod';

export const Callout = block(
  {
    label: 'Callout',
    description: 'A short heading and message.',
    props: z.object({
      heading: z.string().min(1),
      body: z.string(),
      tone: z.enum(['neutral', 'accent']).default('neutral'),
    }),
  },
  function Callout({ heading, body, tone }) {
    return (
      <aside data-tone={tone}>
        <h2>{heading}</h2>
        <p>{body}</p>
      </aside>
    );
  }
);
```

The directory is both the React registry and the server-side content contract:

```tsx
// src/page-blocks/directory.tsx
import { createDirectory } from 'page-blocks/react';
import { Callout } from './blocks/callout';
import { FeatureShelf } from './blocks/feature-shelf';

export const directory = createDirectory({
  version: '1',
  contexts: {
    required: [],
    optional: ['path', 'locale'],
  },
  slots: {
    hero: {
      label: 'Hero',
      allowedBlocks: ['Callout'],
      maxItems: 1,
    },
    content: {
      label: 'Page content',
      allowedBlocks: ['Callout', 'FeatureShelf'],
      maxItems: 20,
    },
  },
  aliases: {
    OldCallout: 'Callout',
  },
  migrations: [
    { from: '0', to: '1', description: 'Rename OldCallout to Callout.' },
  ],
  blocks: { Callout, FeatureShelf },
});

export const Slot = directory.Slot;
export const SlotContext = directory.SlotContext;
```

`directory.manifest` is serializable and contains the directory version, context vocabulary, block metadata, top-level slot policies, nested-slot policies, aliases, migration metadata, and presets. `directory.contract` validates complete slot documents with the original Zod schemas. Pass that contract to the service so invalid props and illegal block placement are rejected before persistence.

The `aliases` and `migrations` fields describe compatibility; application migration code is still responsible for rewriting stored documents when a schema change needs data transformation.

### Nested slots

Blocks declare the inner slots they own. The same policy rules work at either level:

```tsx
import { block, blockSlot } from 'page-blocks/react';
import { z } from 'zod';

export const FeatureShelf = block(
  {
    label: 'Feature shelf',
    props: z.object({ title: z.string() }),
    slots: ['items'],
    slotConfig: {
      items: {
        label: 'Shelf items',
        allowedBlocks: ['Callout'],
        maxItems: 6,
      },
    },
  },
  function FeatureShelf(props) {
    return (
      <section>
        <h2>{props.title}</h2>
        {blockSlot(props.items, { className: 'feature-grid' }, <p>No features yet.</p>)}
      </section>
    );
  }
);
```

Server and client rendering use the same recursive renderer, including nested slots and fallback children.

## Render slots

Render a top-level slot anywhere in the application:

```tsx
import { Slot, SlotContext } from './page-blocks/directory';

export function Page() {
  return (
    <SlotContext name="locale" value="en">
      <main>
        <Slot name="hero">
          <h1>This remains visible when no hero document matches.</h1>
        </Slot>
        <Slot name="content" />
      </main>
    </SlotContext>
  );
}
```

The Vite integration supplies a normalized `path` context from the current request or browser location. Additional `SlotContext` values are merged with it. More exact locators win; invalid duplicate or equal-specificity locators fail during initialization/build rather than being selected nondeterministically.

Import the base styles once in the application:

```ts
import 'page-blocks/react/style.css';
import 'page-blocks/web-components/style.css';
```

Only a local editor or authorized preview should load editor code and CSS:

```ts
import 'page-blocks/react-editor/style.css';
```

## Filesystem interchange format

Local development and static builds read JSON slot documents. With contexts `['path', 'locale']`, examples include:

```text
slots/
  hero.json
  content.json
  @path/
    collections/
      hero.json
  @locale/
    en/
      content.json
```

`hero.json` is an unqualified fallback. `@path/collections/hero.json` is an exact `path=/collections` match. Match segments are emitted in the configured context order; `@context:all` and `@context:none` represent the other supported match kinds.

A document contains blocks and may contain slot options:

```json
{
  "name": "hero",
  "version": 1,
  "blocks": [
    {
      "id": "home-callout",
      "type": "Callout",
      "data": {
        "heading": "Welcome",
        "body": "This content can be local, baked, or remote.",
        "tone": "accent"
      }
    }
  ]
}
```

Document IDs returned by the loader/store are opaque. Do not construct them or treat them as filesystem paths. File reads and writes are contained beneath the configured root, duplicate locators are rejected, and writes use same-directory temporary files plus atomic rename.

## Vite modes

Configure the plugin after the framework plugins that establish the Vite application:

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pageBlocks from 'page-blocks/vite';

export default defineConfig({
  plugins: [
    react(),
    pageBlocks({
      mode: 'auto',
      slotsDir: 'slots',
      contexts: ['path', 'locale'],
      staticOutput: 'inline',
    }),
  ],
});
```

| Mode | Serve behavior | Build behavior |
| --- | --- | --- |
| `auto` | Local editable filesystem service | Static read-only snapshot |
| `local` | Local editable filesystem service | Local mode; normally use only for development |
| `static` | Baked read-only content | Baked read-only content |
| `preview` | Baked content plus preview bootstrap | Baked content plus preview bootstrap |

`staticOutput: 'inline'` embeds the normalized manifest and documents in the application bundle. `staticOutput: 'lazy-files'` embeds only the match index and emits documents beneath `page-blocks/slots/` (or `staticAssetDir`) for on-demand fetching.

Useful options are:

- `apiPath`: local/preview endpoint path; defaults to `/api/page-blocks`.
- `contexts`: deterministic context order; defaults to `['path']`.
- `slotsDir`: filesystem source; defaults to `slots`.
- `staticAssetDir`: output directory for `lazy-files`.
- `designs`: blueprint module paths; local output is read-only when designs own it.
- `screenshots` and `generateScreenshots`: block archive screenshot integration.
- `preview.bootstrap`: application module injected only into preview builds.

For Vite SSR or prerendering, load the same baked source on the server:

```ts
import {
  loadPageBlocksSlots,
  resolvePageBlocksContext,
} from 'page-blocks/vite/server';

export async function loadSlots(request: Request) {
  const context = resolvePageBlocksContext(request);
  return loadPageBlocksSlots(context, ['hero', 'content']);
}
```

TanStack Start builds should include `page-blocks` in `ssr.noExternal` so Vite's compile-time definitions are visible to the server/prerender environment.

## Dual-source deployed previews

A preview starts on baked content and does not call the content API anonymously. The application bootstrap decides how to exchange or validate a launch token, creates an authenticated client, and then activates the remote source:

```ts
// src/page-blocks/preview-bootstrap.ts
import {
  createPageBlocksRemoteClient,
  type PageBlocksPreviewBootstrap,
} from 'page-blocks/client';

const bootstrap: PageBlocksPreviewBootstrap = async ({ runtime, loadEditor }) => {
  const launchToken = new URL(location.href).searchParams.get('edit');
  if (!launchToken) return;

  // A production application can exchange this one-time launch token first.
  runtime.useRemote({
    client: createPageBlocksRemoteClient({
      endpoint: '/api/page-blocks',
      headers: { authorization: `Bearer ${launchToken}` },
    }),
    capabilities: { read: true, edit: true },
  });

  const editor = await loadEditor();
  document.dispatchEvent(
    new CustomEvent('page-blocks:editor-ready', { detail: editor })
  );

  return () => runtime.useStatic();
};

export default bootstrap;
```

Select the artifact from environment configuration:

```ts
pageBlocks({
  mode: process.env.SITE_CHANNEL === 'preview' ? 'preview' : 'static',
  slotsDir: 'page-blocks',
  contexts: ['path'],
  staticOutput: 'lazy-files',
  preview: {
    bootstrap: './src/page-blocks/preview-bootstrap.ts',
  },
});
```

Source switches increment a runtime generation and use distinct query keys, so live consumers do not confuse baked and remote results. Call `runtime.useStatic()` when authorization expires or the editor closes; rendered content remains available from the baked source.

The lazy module exposes `mountPageBlocksEditor()` and returns an `unmount()` handle. Unmounting removes the element, custom-element subscriptions, Nanostore subscriptions, editing mode, and the in-flight-save unload warning. The editor exposes `idle`, `saving`, `saved`, `offline`, `expired`, `conflict`, and `error` through `editorStatus` from `page-blocks/client`; `editorError` holds the associated failure. Failed writes keep pending form props intact, and mutation success events are emitted only after a successful response.

The application should present its own recovery UI for `expired` and `conflict`, including a route back to its dashboard and reload/compare actions appropriate to its revision model.

## Versioned remote service

The service owns commands and mutations; stores only load and compare-and-swap whole documents. A filesystem-backed service is useful locally and as a reference implementation:

```ts
import { createFileSystemStore } from 'page-blocks/file-system';
import {
  createPageBlocksHandler,
  createPageBlocksService,
} from 'page-blocks/server';
import { directory } from './page-blocks/directory';

const store = createFileSystemStore({
  path: './slots',
  contexts: ['path'],
  scope: 'site-123',
});

const service = createPageBlocksService({
  store,
  directory: directory.contract,
});

export const handlePageBlocks = createPageBlocksHandler({
  service,
  scope: async (request) => getSiteIdFromRequest(request),
  authorize: async ({ request, operation, scope }) => {
    const session = await authenticate(request);
    if (operation === 'read') return canRead(session, scope);
    return canEdit(session, scope);
  },
});
```

`handlePageBlocks` accepts a standard `Request` and returns a standard `Response`, so route glue is deliberately small:

```ts
export async function POST(request: Request) {
  return handlePageBlocks(request);
}
```

Requests are runtime-validated before store access, bodies default to a 1 MiB limit, responses use stable error envelopes, and writes are forbidden unless an `authorize` callback explicitly allows them. Omitting `authorize` permits reads and denies writes.

Every saved document has an integer version. Mutations and deletes require `expectedVersion`; a stale version receives `409` and does not overwrite newer content. Nested targets are explicit paths:

```ts
const target = {
  documentId: 'opaque-document-id',
  path: [
    { blockId: 'feature-shelf', slot: 'items' },
  ],
};

await client.mutate(target, 7, {
  type: 'update-block-props',
  blockId: 'item-one',
  props: { heading: 'Updated', body: '...', tone: 'neutral' },
});
```

Create clients with static or refreshable request headers:

```ts
import { createPageBlocksRemoteClient } from 'page-blocks/client';

const client = createPageBlocksRemoteClient({
  endpoint: '/api/page-blocks',
  headers: async () => ({
    authorization: `Bearer ${await getAccessToken()}`,
  }),
});
```

The `PageBlocksStore` interface is intentionally small: `query`, `list`, `get`, `create`, `save`, and `delete`, with an optional transaction wrapper. Database adapters should enforce scope/tenant isolation and compare-and-swap in the same database statement or transaction.

## Deterministic snapshots

Snapshots materialize a database revision into the exact directory format consumed by Vite:

```ts
import {
  exportPageBlocksSnapshot,
  importPageBlocksDirectory,
} from 'page-blocks/file-system';

const documents = await databaseStore.list('site-123');

const manifest = await exportPageBlocksSnapshot({
  documents,
  contexts: ['path'],
  targetDirectory: './build-input/page-blocks',
  directoryVersion: directory.manifest.version,
  sourceRevision: 'design-revision-42',
});

const imported = await importPageBlocksDirectory({
  sourceDirectory: './build-input/page-blocks',
  expectedDirectoryVersion: directory.manifest.version,
  scope: 'site-123',
});
```

Export validates every locator and document before writing, sorts paths deterministically, formats JSON consistently, records SHA-256 checksums, writes into a sibling temporary directory, and atomically renames it into place. The target directory must not already exist. Import rejects unsafe paths, non-files, checksum failures, unsupported manifest data, and unexpected directory versions.

The root `page-blocks.snapshot` records format version, directory version, source revision, contexts, paths, and checksums. Keep the snapshot beside the build input; it is the audit record connecting an artifact to an editorial revision.

## Security responsibilities

- Treat client capability flags as presentation state, never authorization.
- Authenticate and authorize every remote request on the server.
- Derive the content scope/tenant from the authenticated request, not request JSON.
- Keep preview launch-token exchange and dashboard URLs in the application.
- Do not expose the filesystem store as a deployed multi-tenant database.
- Preserve compare-and-swap semantics in custom stores.
- Validate documents with the template's directory contract before saving.
- Never interpolate opaque document IDs into paths or SQL.

## Examples

| Example | Purpose |
| --- | --- |
| `examples/vite` | Primary local filesystem editor, nested slots, path matching, screenshots |
| `examples/vite-travel-campaign` | Multi-context route content and lazy static files |
| `examples/vite-blueprints` | Build-time blueprint generation and static matching |
| `examples/vite-preview` | Separate static/preview artifacts and authorized runtime switching |

From the repository root:

```sh
pnpm --filter page-blocks-example-vite dev
pnpm --filter page-blocks-example-vite-travel-campaign dev
pnpm --dir examples/vite-preview build
pnpm --dir examples/vite-preview build:preview
```

The Exhibition template in `iiif.site` is the TanStack Start/SSR pilot. Keep `page-blocks` in `ssr.noExternal`, use the baked Vite helpers during prerender, and activate the remote runtime only after hydration and authorization.

## Migrating from the legacy API

The first-release work deliberately changes several contracts:

1. Install one `page-blocks` package and use its subpath exports instead of separate workspace packages.
2. Prefer `auto`, `local`, `static`, or `preview` Vite modes. “Production” no longer means “a remote read-only endpoint.”
3. Move deployed mutations to `PageBlocksStore` + `createPageBlocksService()` + `createPageBlocksHandler()`.
4. Send typed service commands through `createPageBlocksRemoteClient()`; do not expose raw loader mutation methods over HTTP.
5. Supply `expectedVersion` for every mutation/delete and handle `409` explicitly.
6. Pass `directory.contract` to the service and treat `directory.manifest.version` as the template content-contract version.
7. Treat filesystem IDs as opaque and use snapshot helpers instead of hand-copying database exports.
8. Put editor imports behind the preview bootstrap's `loadEditor()` boundary.

Compatibility exports still exist while examples and downstream projects move, but new work should target the surfaces documented above.

## Verification and development

Run the complete package and example gate:

```sh
pnpm verify
```

That command builds the package, typechecks source and export smoke fixtures, runs the protocol/service/filesystem/runtime/rendering tests, loads both ESM and CommonJS exports, runs strict `publint`, and typechecks/builds every maintained example including both static and preview artifacts.

Useful narrower commands are:

```sh
pnpm verify:package
pnpm --dir examples/vite typecheck
pnpm --dir examples/vite build
pnpm --dir examples/vite-preview build:preview
```

The release workflow runs the same verification gate before publishing.
