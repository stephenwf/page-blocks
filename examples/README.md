# Examples

`examples/vite` is the primary editor-focused demo for the single-package `page-blocks` workspace.

- Run `pnpm --filter page-blocks-example-vite dev` to start the Vite app and the local Node API sidecar.
- Run `pnpm --filter page-blocks-example-vite-travel-campaign dev` to start the contextual travel campaign demo with editable filesystem slots, nested slot contexts, prop-source search, and lazy-file static output.
- Run `pnpm --filter page-blocks-example-vite-blueprints dev` to start the Vite blueprint demo with runtime blueprint loading in development.
- Run `pnpm --filter page-blocks-example-vite-blueprints design:sync` to compile blueprint files into persisted filesystem slots.
- The legacy Next.js demo remains in `apps/web` as a reference app during the migration.
