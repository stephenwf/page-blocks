# Milestone A — trustworthy core

This plan implements Milestone A from the iiif.site Page Blocks brief. It is intentionally limited to the current single-package API; the versioned store/service and fetch-native authorization boundary begin in Milestone B.

## 1. Establish one release gate

- Add one package `verify` command covering a clean build, source and public type checks, Node tests, ESM/CJS smoke imports, and strict export validation.
- Make CI run that command on the minimum supported Node release and current LTS.
- Compile against Vite's real public types and remove the local type shim.

## 2. Validate the domain and protocol

- Define bounded Zod schemas for JSON values, contexts, locators, blocks, nested slots, every current request, and every current response.
- Derive wire types from those schemas and validate both dispatch input and output.
- Classify operations as read, write, or privileged for the authorization boundary in Milestone B.
- Add a typed client error, reject unsuccessful or malformed responses, and emit mutation callbacks only after successful writes.

## 3. Harden filesystem persistence

- Treat public document IDs as opaque index keys; never decode a caller-provided ID into a path.
- Validate contexts and locators before building paths, enforce root containment, and keep browser source metadata relative.
- Use same-directory temporary files and atomic replacement; reject create collisions.
- Detect duplicate and potentially ambiguous locators at initialization.
- Fix root paths, dotted slot names, sub-context lookup, nested slot option updates, exact reorder permutations, and deterministic query ordering.

## 4. Stabilize matching and prove parity

- Centralize normalization, canonical locator keys, precedence, ambiguity checks, and sub-context discovery in pure core functions.
- Support `exact`, `all`, and `none`; reject incomplete `filter` locators.
- Add table-driven fixtures for root and nested paths, trailing slashes, dotted slots, precedence, duplicates, and ambiguity.
- Run the same fixtures through static and filesystem adapters, plus focused filesystem and client regressions.

## Acceptance gate

Milestone A is complete when `pnpm --dir page-blocks verify` passes from a clean `dist/`, CI invokes that gate, and the regression/conformance tests cover each item above.
