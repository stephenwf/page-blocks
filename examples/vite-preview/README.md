# Deployed preview example

This small conformance fixture demonstrates the dual-source runtime without adding an application framework:

- `pnpm build` emits a static artifact with baked slot data and no editor code.
- `pnpm build:preview` emits the same baked data plus the preview bootstrap and a lazy editor boundary.
- An anonymous preview makes no content API request.
- Visiting the preview with `?edit=TOKEN` lets the application bootstrap create an authenticated remote client, activate editing capabilities, and lazy-load the editor.
- Calling the bootstrap cleanup (for example when a session expires) returns every live query to baked content.

The token and endpoint are deliberately application-owned. A real integration exchanges the launch token before calling `runtime.useRemote()`; Page Blocks neither issues nor interprets sessions.
