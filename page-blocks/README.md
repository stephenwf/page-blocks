# page-blocks

`page-blocks` is a template-owned content layer for React sites. A template defines its blocks, schemas, contexts, and slot policies once; content can then be edited through local Vite middleware, baked into a static artifact, or supplied by an authorized remote draft service in a deployed preview.

> [!WARNING]
> This package is working toward its first stable release. Breaking API and behavior changes are expected until then.

## Entry points

```ts
import { createDirectory, block } from 'page-blocks/react';
import { createPageBlocksRemoteClient, getPageBlocksRuntime } from 'page-blocks/client';
import { createPageBlocksHandler, createPageBlocksService } from 'page-blocks/server';
import { createFileSystemStore, exportPageBlocksSnapshot } from 'page-blocks/file-system';
import pageBlocks from 'page-blocks/vite';
```

The principal subpaths are `core`, `react`, `client`, `editor`, `server`, `file-system`, `vite`, `vite/server`, `designer`, and `screenshots`. Compatibility integrations remain at `react-client`, `react-editor`, `node`, and `next`.

## Directory and rendering

```tsx
import { block, createDirectory } from 'page-blocks/react';
import { z } from 'zod';

const Callout = block(
  {
    label: 'Callout',
    props: z.object({
      heading: z.string().min(1),
      body: z.string(),
    }),
  },
  ({ heading, body }) => <aside><h2>{heading}</h2><p>{body}</p></aside>
);

export const directory = createDirectory({
  version: '1',
  contexts: { optional: ['path', 'locale'] },
  slots: {
    hero: { allowedBlocks: ['Callout'], maxItems: 1 },
  },
  blocks: { Callout },
});

export const Slot = directory.Slot;
export const SlotContext = directory.SlotContext;
```

```tsx
<SlotContext name="locale" value="en">
  <Slot name="hero"><h1>Fallback hero</h1></Slot>
</SlotContext>
```

`directory.manifest` is the serializable template contract. It includes the directory version, contexts, block metadata, top-level and nested-slot policies, aliases, migration metadata, and presets. `directory.contract` validates complete documents with the declared Zod prop schemas; pass it to the service.

Nested slots are declared with `slots` and `slotConfig` on a block and rendered with `blockSlot()`. Server and client paths use the same recursive renderer, preserving nested content and fallback children.

Base styles:

```ts
import 'page-blocks/react/style.css';
import 'page-blocks/web-components/style.css';
```

Load `page-blocks/react-editor/style.css` only in local editing or behind the preview editor boundary.

## Vite

```ts
import pageBlocks from 'page-blocks/vite';

pageBlocks({
  mode: 'auto',
  slotsDir: 'slots',
  contexts: ['path', 'locale'],
  staticOutput: 'inline',
});
```

- `auto`: editable filesystem middleware while serving, static snapshot while building.
- `local`: filesystem service and edit capability.
- `static`: baked read-only content.
- `preview`: baked read-only content plus an application bootstrap that can activate a remote session.

Use `staticOutput: 'lazy-files'` to emit matched documents under `page-blocks/slots/` instead of embedding them in the main bundle. Configure the directory with `staticAssetDir` if required.

For SSR/prerendering:

```ts
import { loadPageBlocksSlots, resolvePageBlocksContext } from 'page-blocks/vite/server';

const context = resolvePageBlocksContext(request);
const slots = await loadPageBlocksSlots(context, ['hero', 'content']);
```

TanStack Start integrations should set `ssr.noExternal: ['page-blocks']` so Vite's static definitions are available to the server build.

## Deployed preview

```ts
// preview-bootstrap.ts
import {
  createPageBlocksRemoteClient,
  type PageBlocksPreviewBootstrap,
} from 'page-blocks/client';

const bootstrap: PageBlocksPreviewBootstrap = async ({ runtime, loadEditor }) => {
  const token = await exchangeApplicationLaunchToken();
  if (!token) return;

  runtime.useRemote({
    client: createPageBlocksRemoteClient({
      endpoint: '/api/page-blocks',
      headers: { authorization: `Bearer ${token}` },
    }),
    capabilities: { read: true, edit: true },
  });

  const editor = await loadEditor();
  mountApplicationEditor(editor);
  return () => runtime.useStatic();
};

export default bootstrap;
```

```ts
pageBlocks({
  mode: process.env.SITE_CHANNEL === 'preview' ? 'preview' : 'static',
  slotsDir: 'page-blocks',
  staticOutput: 'lazy-files',
  preview: { bootstrap: './src/preview-bootstrap.ts' },
});
```

Anonymous previews use baked content without an API request. A source switch increments the runtime generation, gives remote queries distinct keys, and invalidates live consumers. Static production artifacts contain no preview bootstrap or editor code.

`loadEditor()` returns the `page-blocks/editor` module. Its `mountPageBlocksEditor()` function returns an `unmount()` handle. Editor state is exported from `page-blocks/client` as `editorStatus` (`idle`, `saving`, `saved`, `offline`, `expired`, `conflict`, or `error`) and `editorError`. Failed requests preserve pending form values; successful mutation events are emitted only after the server confirms the write.

## Authorized service

```ts
import { createFileSystemStore } from 'page-blocks/file-system';
import { createPageBlocksHandler, createPageBlocksService } from 'page-blocks/server';
import { directory } from './directory';

const store = createFileSystemStore({
  path: './slots',
  contexts: ['path'],
  scope: 'site-123',
});

const service = createPageBlocksService({
  store,
  directory: directory.contract,
});

export const handler = createPageBlocksHandler({
  service,
  scope: (request) => resolveSiteScope(request),
  authorize: async ({ request, operation, scope }) => {
    const session = await authenticate(request);
    return operation === 'read'
      ? canRead(session, scope)
      : canEdit(session, scope);
  },
});
```

The handler accepts a standard `Request` and returns a standard `Response`. Input is schema-validated before store access, bodies are bounded, errors use stable envelopes, and writes default closed. Omitting `authorize` allows reads and rejects writes.

Documents carry integer versions. Every mutation/delete supplies `expectedVersion`; a stale write returns `409` and cannot overwrite newer content. Mutations can target any nested slot with `{ documentId, path: [{ blockId, slot }, ...] }`.

Custom database adapters implement `PageBlocksStore`: `query`, `list`, `get`, `create`, compare-and-swap `save`, and compare-and-swap `delete`. The application owns authentication, tenant isolation, sessions, and database transactions.

## Snapshot import/export

```ts
import {
  exportPageBlocksSnapshot,
  importPageBlocksDirectory,
} from 'page-blocks/file-system';

await exportPageBlocksSnapshot({
  documents: await store.list('site-123'),
  contexts: ['path'],
  targetDirectory: './build-input/page-blocks',
  directoryVersion: directory.manifest.version,
  sourceRevision: 'revision-42',
});

const { manifest, documents } = await importPageBlocksDirectory({
  sourceDirectory: './build-input/page-blocks',
  expectedDirectoryVersion: directory.manifest.version,
  scope: 'site-123',
});
```

Exports are deterministic, validate all locators before writing, record SHA-256 checksums, and publish through an atomic directory rename. The target must not already exist. Imports verify safe paths, regular files, checksums, schemas, and directory version before returning documents.

## Security checklist

- Client `capabilities.edit` is UI state, not authorization.
- Derive scope/tenant from the authenticated request rather than request JSON.
- Authorize every deployed read and write according to application policy.
- Preserve compare-and-swap behavior in database stores.
- Validate content with `directory.contract` before persistence.
- Treat filesystem document IDs as opaque.
- Keep launch-token exchange, expiry recovery, and dashboard routes application-owned.

## Filesystem format

With contexts `['path', 'locale']`, an unqualified fallback is `slots/hero.json`, an exact path match is `slots/@path/collections/hero.json`, and an exact locale match is `slots/@locale/en/hero.json`. Context segments are ordered by configuration. The supported match kinds are `exact`, `all`, and `none`; ambiguous/equal-specificity locators fail during initialization or build.

## Verification

The repository gate is:

```sh
pnpm verify
```

It runs package build/typecheck/tests, ESM and CommonJS smoke imports, strict package lint, and every maintained example build. See the repository README and `examples/vite-preview` for the complete deployment walkthrough.
