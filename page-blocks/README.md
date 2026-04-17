# page-blocks

Single-package migration scaffold for the Page Blocks libraries.

The primary runnable example in this repository is `examples/vite`, which uses the native `page-blocks/vite` plugin for development and a static slot manifest for production builds.

## Imports

```ts
import { block } from 'page-blocks/react';
import pageBlocks from 'page-blocks/vite';
import { loadPageBlocksSlots, resolvePageBlocksContext } from 'page-blocks/vite/server';
```

## Styles

```ts
import 'page-blocks/react/style.css';
import 'page-blocks/react-editor/style.css';
import 'page-blocks/web-components/style.css';
```

Compatibility CSS aliases are also exported for the current `dist/index.css` import shape.

## Example Flow

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createDirectory } from 'page-blocks/react';
import pageBlocks from 'page-blocks/vite';

export const directory = createDirectory({
  screenshots: '/blocks',
  blocks: {},
});

export default defineConfig({
  plugins: [react(), pageBlocks()],
});
```

In dev, the Vite plugin mounts `POST /api/page-blocks` directly onto Vite's own server. In production client builds it injects a static manifest so slots resolve without an API and editing is disabled.

If you do not want every slot payload embedded into the production bundle, opt into lazy static files instead:

```ts
export default defineConfig({
  plugins: [
    react(),
    pageBlocks({
      staticOutput: 'lazy-files',
    }),
  ],
});
```

That mode keeps the match index in the bundle, emits slot JSON files under `dist/page-blocks/slots/`, and fetches the matching slot files on demand at runtime.

For Vite SSR, use the server helpers explicitly:

```ts
const context = resolvePageBlocksContext(request);
const slots = await loadPageBlocksSlots(context, ['hero']);
```

`page-blocks/next` and `page-blocks/node` still exist for framework-specific integrations and custom servers, but the Vite example now leads with the native plugin path.
