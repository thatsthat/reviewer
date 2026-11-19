# Tasks

## 1. Database: make `url` required

- [x] 1.1 Run `npx dotenv -e .env.local -- prisma migrate status`. If it reports drift or unapplied schema changes, baseline first (design.md, Risks): generate the missing migration with `prisma migrate diff` and mark it applied with `prisma migrate resolve --applied`. Never accept a reset prompt. Verify `migrate status` reports the database is in sync with the migration history.
- [x] 1.2 Count rows where `url IS NULL` in `google` and `apple`, and re-import (via the app's URL form) or remove any that exist. Verify both counts are 0.
- [x] 1.3 In `prisma/schema.prisma`, change `url String?` to `url String` on `Apple` and `Google`. Run `npm run db:migrate` (name it e.g. `require_store_url`), then `npm run db:generate`. Verify the new migration under `prisma/migrations/` contains only the two `SET NOT NULL` statements, `migrate status` is clean, and `npx vitest run src/lib/google.server.test.ts src/lib/apple.server.test.ts` still passes.

## 2. Server: column-only relations in a stable order

- [x] 2.1 In `src/lib/apps.server.ts`, change `AppRelation` to `{ store, storeAppId, name, url: string }`. Delete `getStoredUrl`, `getStoredRating` and `getStoredRatingCount`. In `loadAppDetail`, select `title` and `url` (not `data`) from `apple` / `google`. Verify `npx tsc --noEmit` reports errors only in `AppRelationsList` and its stories (fixed in group 3).
- [x] 2.2 Add and export a `compareAppRelations` comparator (store rank `google` before `apple`, then `name` via `localeCompare`, then `storeAppId`) and use it to sort `relations` in `loadAppDetail`. Verify with a new `src/lib/apps.server.test.ts` (mock `#/db` as the existing tests do) covering: Google before Apple regardless of title, ordering by title within a store, and the `storeAppId` tie-breaker. `npx vitest run src/lib/apps.server.test.ts` passes.

## 3. Listing rows: store logo, no ratings

- [x] 3.1 In `src/components/AppRelationsList.tsx`, add a `STORE_LOGO` map (`google` → `/google.svg`, `apple` → `/apple.svg`). Render `<img src={STORE_LOGO[store]} alt={STORE_LABEL[store]} />` (about `size-5`, `shrink-0`) before the title on one line, and remove the secondary store/rating line. Verify `npx tsc --noEmit` passes for this file.
- [x] 3.2 Update `src/components/AppRelationsList.stories.tsx`: drop `rating`/`ratingCount` from the fixtures. Change the `play` assertions to check `getByRole('img', { name: 'App Store' })` / `{ name: 'Google Play' }` and the listing titles, and to check that no `★` text is shown. Keep the existing Unmerge assertions. Verify with `npm run storybook`: the stories' `play` functions pass in the Storybook test panel, and the rows look right in both light and dark themes. (`vitest.config.ts` has no Storybook project, so `npx vitest run` does not run stories.)

## 4. App detail view and route

- [x] 4.1 Create `src/components/AppDetailView.tsx` that takes `{ app, relations }` (the `loadAppDetail` return type) and renders the app title as the heading plus `AppRelationsList`, in the existing `page-wrap` / `Card` layout. Verify `npx tsc --noEmit` passes.
- [x] 4.2 Add `src/components/AppDetailView.stories.tsx` with stories for a two-store group (asserts the heading is the app title, both logos show, Google row first), a single-listing group (no Unmerge button), and an empty group ("No linked store listings."). Verify with `npm run storybook` that their `play` functions pass in the Storybook test panel.
- [x] 4.3 Change `src/routes/apps.$appId.tsx` so its `component` renders `<AppDetailView {...Route.useLoaderData()} />`, keeping `loader` and `errorComponent` as they are. Verify `npx tsc --noEmit` passes.

## 5. Integration check

- [x] 5.1 Run `npm run dev`, open `/apps/<id>` for a merged Google + Apple group, a single-listing group, `/apps/999999` and `/apps/abc`. Confirm against `specs/app-detail/spec.md`: title heading, logo next to each title, Google row first, links open the store in a new tab, no ratings shown, Unmerge works and the list updates without a full page reload, and the not-found state appears for both bad ids. Also import a new store URL and confirm it saves (the `url` column is now required). Run `npx vitest run` and confirm the unit tests (`src/**/*.test.ts`) pass. Stories are not covered by this command; they were checked in 3.2 and 4.2.

## Workflow follow-up

- Archive the change once implemented and reviewed, which creates `openspec/specs/app-detail/spec.md`.
