# Tasks

## 1. Database: main listing and store update date

- [ ] 1.1 Run `npx dotenv -e .env.local -- prisma migrate status`. If it reports drift, resolve it as in the previous change (`prisma migrate diff` + `prisma migrate resolve --applied`) and never accept a reset prompt. With `psql`, check that `select 1 from pg_collation where collname = 'en-x-icu'` returns a row and that no app has zero listings in `apps_google_links` and `apps_apple_links` combined. Verify `migrate status` is in sync, the collation exists, and the empty-app count is 0 (delete or fix any empty app first).
- [ ] 1.2 In `prisma/schema.prisma`, add enum `Store { google apple }`, required `primaryStore Store @map("primary_store")` and `primaryStoreAppId String @map("primary_store_app_id")` on `App`, and `updatedAt DateTime? @map("updated_at") @db.Timestamptz()` on `Google` and `Apple`. Create the migration with `npm run db:migrate -- --create-only --name app_main_listing`. Verify the generated SQL creates the enum and the four columns.
- [ ] 1.3 Edit the generated SQL as in design.md Decision 8: add the two `apps` columns as nullable, backfill each app's main listing (`rank, title COLLATE "en-x-icu", store_app_id COLLATE "C"`), then `SET NOT NULL`. Backfill `google.updated_at` (numeric ms) and `apple.updated_at` (ISO string) from `data`. Apply with `npm run db:migrate`, then `npm run db:generate`. Verify `migrate status` is clean, `apps` has no NULL in either column, and existing `google` / `apple` rows have `updated_at` matching their `data->>'updated'`.

## 2. Scrapers: store the update date

- [ ] 2.1 Add a small exported normalizer (e.g. `toStoreUpdatedAt(value: unknown): Date | null`) that returns `new Date(value)` for a number or non-empty string when the result is a valid date, else `null`. Use it in `toGoogleRow` (`src/lib/google.server.ts`) and `toAppleRow` (`src/lib/apple.server.ts`) to set `updatedAt`. Verify with new cases in `src/lib/google.server.test.ts` and `src/lib/apple.server.test.ts`: a Google ms timestamp and an Apple ISO string both map to the expected `Date`, and a missing or invalid value maps to `null`. `npx vitest run src/lib/google.server.test.ts src/lib/apple.server.test.ts` passes.

## 3. Server: saving and reading the main listing

- [ ] 3.1 In `src/lib/apps.server.ts`, pin `compareAppRelations` to `localeCompare(b.name, 'en')`, add `isPrimary: boolean` to `AppRelation`, and export a pure `pickDefaultPrimary(relations)` (design.md Decision 2). Verify with new cases in `src/lib/apps.server.test.ts`: Google before Apple; two Google listings "Foo Pro" and "Foo" → "Foo"; empty list → `null`. `npx vitest run src/lib/apps.server.test.ts` passes.
- [ ] 3.2 After the migration from group 1, write a one-off check (a test against the dev database or a script run once, not committed) that loads every app's relations with the JS comparator and compares `pickDefaultPrimary` to the backfilled `primaryStore` / `primaryStoreAppId`. Verify they match for every app. If any differs, fix the backfill before going further.
- [ ] 3.3 Make `ensureGoogleAppLink` / `ensureAppleAppLink` create the app with the linked listing as its main listing, and make `splitAppFromGroup` create the new app with the unmerged listing as its main listing (Decision 2). Verify `npx tsc --noEmit` passes for `src/lib` and tests show: a newly imported listing's app has it as main; an unmerged listing's new app has it as main and the source app's main is unchanged.
- [ ] 3.4 Factor the link-table queries and sort into a `loadRelations(db, appId)` helper that accepts a transaction client (Decision 3). Change `loadAppDetail` to mark the saved main listing `isPrimary`, return `primary: ListingSummary | null` loaded from its store row (`title`, `iconUrl`, `description`, `updatedAt`), and fall back to `pickDefaultPrimary` for display without writing when the saved pair matches no relation (Decision 4). Verify with tests in `apps.server.test.ts` (mocking `#/db` as the existing tests do): `isPrimary` is set on exactly the saved relation, `primary` matches it, a saved pair matching nothing falls back to the first relation with no write, and `primary` is `null` for an app with no relations.
- [ ] 3.5 Add `setPrimaryListing(appId, store, storeAppId)` in `apps.server.ts` (Decision 6), a `setPrimaryListingSchema` in `src/lib/schemas.ts`, and a POST `setPrimaryListing` server function in `src/lib/apps.functions.ts`. Verify with tests: a listing linked to the app is saved; a listing not linked to the app throws and nothing is written.
- [ ] 3.6 In `splitAppFromGroup`, reject unmerging the saved main listing. In `mergeAppGroups`, save `pickDefaultPrimary` over the merged relations (Decision 7). Verify with tests: unmerging the main listing throws and nothing changes; unmerging a non-main listing still works; merging two groups with chosen main listings saves the default over the combined listings, whichever group is the target.

## 4. UI: star control in the listings list

- [ ] 4.1 In `src/components/AppRelationsList.tsx`, add the star `Button` with lucide `Star` to each row (Decision 9): filled and `aria-pressed="true"` with name "Main listing" on the main row; outlined, `aria-pressed="false"`, name "Make main listing", calling `setPrimaryListing` then `router.invalidate()` on the others. Hide Unmerge on the main row (`relations.length > 1 && !relation.isPrimary`). Make sure a star click doesn't follow the row link or trigger the long-press reveal. Verify `npx tsc --noEmit` passes.
- [ ] 4.2 Update `src/components/AppRelationsList.stories.tsx` fixtures with `isPrimary`, and add `play` assertions: exactly one star button with `aria-pressed="true"`; the main row has no Unmerge button; a single-listing story shows a pressed star and no Unmerge. Verify with `npm run storybook` that the `play` functions pass in the Storybook test panel and the stars look right in light and dark themes and at phone width.

## 5. UI: main listing summary and page composition

- [ ] 5.1 Create `src/components/ListingSummary.tsx` taking a `ListingSummary` (Decision 11): icon (`alt=""`), title, description with `whitespace-pre-line`, and "Updated <date>" via `toLocaleDateString('en', { dateStyle: 'medium' })`. Leave out any missing icon, description or date. Add `src/components/ListingSummary.stories.tsx` with full data, no description, no icon, and no date. Verify their `play` functions pass in Storybook.
- [ ] 5.2 Change `AppDetailView` to take `{ app, relations, primary }` and render `ListingSummary` above `AppRelationsList` when `primary` is not `null`. Update `AppDetailView.stories.tsx` fixtures with `isPrimary` and `primary`, asserting the summary shows the main listing's title and the empty-group story shows no summary. Verify `npx tsc --noEmit` passes and the stories pass in Storybook.

## 6. Integration check

- [ ] 6.1 Run `npm run dev` and check against `specs/app-detail/spec.md`:
  - An existing Google + Apple group shows its backfilled main listing (Google), starred and summarized.
  - Starring the Apple listing updates the summary without a full reload and persists after a reload.
  - The main row has no Unmerge. Unmerging the other listing works, and its new app shows it as main.
  - Merging two groups with chosen main listings saves the default.
  - Importing a new store URL creates an app with that listing starred and its `updated_at` set.
  - The "Updated" date matches the store page, not the import date.

  Run `npx vitest run` and confirm all unit tests pass.

## Workflow follow-up

- Archive the completed `app-detail-view` change before archiving this one, so `openspec/specs/app-detail/spec.md` exists for this change's MODIFIED and REMOVED deltas.
- Archive this change once implemented and reviewed.
