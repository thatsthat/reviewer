# storybook-addon-tanstack-start

Storybook addon that provides a Vite plugin to stub TanStack Start server-side imports. Companion to `storybook-addon-tanstack-router`.

## Tech stack

- TypeScript, React
- vite-plus (check/test/pack)
- knip (dead code detection)
- vitest (testing)
- pnpm (package manager)

## Feedback commands

Run in order before committing:

1. `pnpm check` — lint + type-check
2. `pnpm knip` — dead code detection
3. `pnpm test` — unit tests
4. `pnpm verify` — runs all three above

## Package structure

- `src/plugin.ts` — `tanstackStartPlugin()` Vite plugin factory
- `src/mocks/start-stubs.ts` — Mock exports for TanStack Start server APIs
- `src/index.ts` — Barrel re-exporting plugin + storybook-addon-tanstack-router
- `src/preview.ts` — Re-exports preview decorators from storybook-addon-tanstack-router

## Key conventions

- Match toolchain and patterns from storybook-addon-tanstack-router exactly
- All exports use `.js` extension in import paths (ESM convention)
- Tests colocated next to source files
- Single vite.config.ts handles test + lint + pack

## Off-limits

- Do not modify the Vite plugin name (`storybook-tanstack-start`) — consumers may depend on it
- Do not remove peer dependencies without checking downstream consumers
