# page-blocks-example-vite

Primary example workspace for the single-package `page-blocks` migration.

## Commands

From the repository root:

```sh
pnpm --filter page-blocks-example-vite dev
pnpm --filter page-blocks-example-vite typecheck
pnpm --filter page-blocks-example-vite build
```

`dev` starts a single Vite process on `http://127.0.0.1:5173`.

The page-blocks API is provided by the native `page-blocks/vite` middleware, so there is no sidecar server or proxy configuration. Production builds are static and read-only.

The editable demo lives at `/`, and the screenshot/archive page lives at `/block-archive`.
