# Design

## Context

`loadAppDetail` (`src/lib/apps.server.ts`) returns `{ app: { id, title }, relations: AppRelation[] }`, with relations sorted by `compareAppRelations` (store rank, then `name.localeCompare`, then `storeAppId`). Listings live in two link tables, `apps_google_links` and `apps_apple_links`, each pointing a store row at an app. So no single foreign key can point at "a listing". Apps are created in three places: `ensureGoogleAppLink` / `ensureAppleAppLink` (import) and `splitAppFromGroup` (unmerge). `mergeAppGroups` moves links into the first ticked app (`AppList`: `Array.from(selectedIds)`) and deletes the others.

The store tables already have typed `title`, `description`, `url`, `icon_url` and `scraped_at` columns. The store's own update date exists only inside `data` (`jsonb`), in a different format per store: Google's `updated` is a number of milliseconds, Apple's `updated` is an ISO string.

Checked against the local database (PostgreSQL 18.3): the `en-x-icu` collation is available; 3 apps, none without listings; all `google` rows have a numeric `data.updated` and all `apple` rows a string one, and both convert correctly.

Requirements: `specs/app-detail/spec.md`. Motivation: `proposal.md`.

## Goals / Non-Goals

**Goals:**
- The database always holds each app's main listing. Reads never have to invent one.
- One TypeScript function picks the default (`compareAppRelations`). The migration's SQL backfill matches it.
- Loaders keep reading only typed columns, never `data`.
- `ListingSummary` and `AppRelationsList` stay prop-driven and testable in Storybook without the router.

**Non-Goals:**
- No foreign key from the main-listing pair to a listing (see Decision 1).
- No change to how a merge picks the surviving group or its title.
- No other store fields (rating, installs, screenshots) in the summary.

## Decisions

### 1. Save the main listing as a required `(store, storeAppId)` pair on `apps`
Add `primaryStore Store @map("primary_store")` and `primaryStoreAppId String @map("primary_store_app_id")` to `App`, both required, with a new Prisma enum `Store { google apple }`.
- *Why required:* every app always has at least one listing (unmerge deletes apps it leaves empty), so it always has a main listing. `NOT NULL` lets the database enforce that, as with `url` in the previous change. No code needs a "no main listing" branch.
- *Why a pair:* listings are split across two tables, so any representation needs a store discriminator. One pair on `apps` keeps the choice in one place.
- *Alternatives:* (a) two FK columns (`primary_google_app_id`, `primary_apple_app_id`) plus a hand-written CHECK. They can't both be required, and the FK only catches store-row deletion, not a link moving to another app. (b) An `is_primary` flag on each link table. "Exactly one per app" can't be enforced across two tables. (c) Merging the link tables into one `app_listings` table. That's the clean model, but it's a refactor well beyond this change.
- *Integrity without an FK:* every write path below keeps the pair pointing at one of the app's own listings. Nothing in the app deletes store rows.

### 2. Save the default whenever an app is created or merged
An exported pure function, e.g. `pickDefaultPrimary(relations)`, returns the first relation by `compareAppRelations`. Every path that creates an app or changes its set of listings saves a main listing in the same transaction:
- `ensureGoogleAppLink` / `ensureAppleAppLink`: `tx.app.create({ data: { title, primaryStore, primaryStoreAppId } })` with the listing being linked (it is the app's only listing).
- `splitAppFromGroup`: the new app is created with the unmerged listing as its main listing. The source app's main listing is unchanged, because the main listing can't be unmerged (Decision 7).
- `mergeAppGroups`: after moving the links, load the target's relations and save `pickDefaultPrimary(relations)` (Decision 7).
- *Why:* the main listing then changes only on a star click or a merge. An unchosen default no longer shifts when a re-scrape renames a listing.
- *Alternative:* compute the default at read time and never write it. Rejected by the user: the main listing should always be in the database as if a user had chosen it.

### 3. A shared loader for relations
Factor the two link-table queries plus sort out of `loadAppDetail` into a helper that takes a `Prisma.TransactionClient | PrismaClient`, e.g. `loadRelations(db, appId)`. `loadAppDetail`, `setPrimaryListing`, `splitAppFromGroup` and `mergeAppGroups` all use it, so they all see the same listings in the same order.

### 4. Reading the main listing
`loadAppDetail` reads `primaryStore` / `primaryStoreAppId`, sets `isPrimary` on the matching `AppRelation`, and fetches `title`, `iconUrl`, `description`, `updatedAt` for that listing from `google` or `apple`. It returns `primary: ListingSummary | null`, where `ListingSummary = { store, storeAppId, title, iconUrl: string | null, description: string | null, updatedAt: Date | null }`. Relations stay lean (no description sent for every row).
- *Safety net:* if the saved pair matches none of the relations, which only a manual database edit can cause, `loadAppDetail` marks `pickDefaultPrimary(relations)` as main for display and writes nothing. It returns `null` only for an app with no relations, which the page already handles with its empty state. This is defensive code, not spec behavior.
- *Alternative:* select those columns for every relation. It's simpler (one query), but it sends every listing's description to render one.

### 5. Promote the store's update date to `updated_at` on `google` and `apple`
Add `updatedAt DateTime? @map("updated_at") @db.Timestamptz()` to both models. `toGoogleRow` / `toAppleRow` set it with a small normalizer: `new Date(details.updated)` for both (number of ms for Google, ISO string for Apple), or `null` if the result is not a valid date.
- *Why:* keeps the previous change's "loaders read typed columns only" rule. The format differences are handled once, at write time, instead of in every reader.
- *Nullable:* a scrape may lack `updated`. The spec allows a missing date.
- *Alternative:* read `data->updated` in the loader for the main listing only. No migration, but every reader then deals with two formats and the JSON contract.

### 6. `setPrimaryListing` POST server function
Input `{ appId: number, store: 'google' | 'apple', storeAppId: string }` (zod schema in `schemas.ts`). In a transaction: load relations for `appId`, reject if the pair isn't among them, else update `primaryStore` / `primaryStoreAppId` (and `updatedAt`). The client calls it from the star and then `router.invalidate()`, the same pattern as Unmerge.

### 7. Server-side rules for unmerge and merge
- `splitAppFromGroup`: after finding the link's `sourceAppId`, read the source app's saved pair. If it's the listing being unmerged, throw `Error('The main listing cannot be unmerged. Choose another main listing first.')`, which rolls back the transaction. The unmerged listing becomes the new app's main listing (Decision 2).
- `mergeAppGroups`: after the `updateMany` calls move the links, load the target's relations and set `primaryStore` / `primaryStoreAppId` to `pickDefaultPrimary(relations)` in the same `tx.app.update` that bumps `updatedAt`.

### 8. Migration and backfill
One migration, in one transaction:
1. Create enum `Store`. Add `primary_store` and `primary_store_app_id` as nullable columns, and `updated_at` to `google` and `apple`.
2. Backfill the main listing: for each app, union its Google and Apple listings with a store rank (Google 0, Apple 1), order by `rank, title COLLATE "en-x-icu", store_app_id COLLATE "C"`, and save the first. `en-x-icu` matches `localeCompare(…, 'en')`, which also uses ICU English collation. `"C"` matches the JS `<` / `>` tie-break on `storeAppId`.
3. `ALTER COLUMN … SET NOT NULL` on both `apps` columns. If any app is still NULL, the migration fails and nothing is applied.
4. Backfill `updated_at`: `google`: `to_timestamp((data->>'updated')::bigint / 1000.0)` where `jsonb_typeof(data->'updated') = 'number'`; `apple`: `(data->>'updated')::timestamptz` where it is a non-empty string.

Prisma generates step 1 and the `NOT NULL` from the schema, so the migration is created with `--create-only` and steps 2–4 are added to its SQL by hand, with the `SET NOT NULL` after the backfill. This SQL lives in the migration file only. Application code stays on Prisma.

### 9. Star control in `AppRelationRow`
A ghost icon `Button` with lucide `Star`, always visible, placed before the Unmerge button. When `relation.isPrimary`: `fill="currentColor"`, `aria-pressed="true"`, and non-interactive (the click does nothing). Otherwise it's outlined with `aria-pressed="false"`, and clicking it calls `setPrimaryListing`. Accessible name: "Main listing" / "Make main listing". Unmerge is not rendered when `relation.isPrimary`, so `canUnmerge` becomes `relations.length > 1 && !relation.isPrimary`. A star click must not trigger the row's link or long-press reveal, so it follows the existing `consumeLongPress` handling.
- *Alternative:* reveal the star on hover/long-press like Unmerge. Rejected: the filled star is also the indicator of which listing is main, so it has to be visible.

### 10. Pin `localeCompare` to `'en'`
`a.name.localeCompare(b.name, 'en')` in `compareAppRelations`.
- *Why:* the comparator decides the saved default, and the migration has to reproduce it in SQL, so it shouldn't depend on the server runtime's default locale.

### 11. Page composition
`AppDetailView({ app, relations, primary })` renders the title, then `ListingSummary` when `primary` is not null, then `AppRelationsList`. `ListingSummary` shows the icon (`<img>` with empty `alt`, since the title next to it names the listing), the title, the description (preserving line breaks with `whitespace-pre-line`) and "Updated <date>", formatted with `toLocaleDateString('en', { dateStyle: 'medium' })`. Dates cross the server-function boundary as `Date`, which TanStack Start serializes.

## Risks / Trade-offs

- [A future code path creates an app without setting the main listing] → `NOT NULL` makes Prisma reject `app.create` without `primaryStore` / `primaryStoreAppId` at compile time.
- [A future code path deletes a store row or moves a link without updating the main listing] → The read-time safety net (Decision 4) keeps the page working, and that path should use `pickDefaultPrimary` like merge does.
- [Merging always replaces chosen main listings, even when only one group had one] → Accepted for predictability. The first-ticked rule for the surviving group isn't visible in the UI.
- [The SQL backfill picks a different default than the JS comparator for some titles] → Both use ICU English collation. Task 1.4 compares the backfilled pairs with `pickDefaultPrimary` for every app.
- [`en-x-icu` missing on another database] → Task 1.1 checks it before migrating. Without ICU, use `lower(title) COLLATE "C"` and accept that a few defaults may differ.
- [Unmerge from a stale page fails for a listing that has since become main] → The server error is surfaced like other unmerge failures. The list refreshes after `router.invalidate()`.
- [Long scraped descriptions make the page very long] → Acceptable for a first version. A line clamp can be added later without changing the spec.
- [Migration drift, as in the previous change] → Run `prisma migrate status` before `migrate dev`, and never accept a reset prompt.

## Migration Plan

1. `prisma migrate status`; resolve any drift as in the previous change, without resetting.
2. Check that `en-x-icu` exists (`select 1 from pg_collation where collname = 'en-x-icu'`) and that no app has zero listings. Delete or fix any empty app first.
3. Edit `schema.prisma` and create the migration with `--create-only`. Rearrange and extend its SQL as in Decision 8, then apply it and run `npm run db:generate`.
4. Rollback: a follow-up migration dropping the four columns and the enum. Saved main-listing choices are lost, and nothing else is.

## Open Questions

- Should the summary clamp long descriptions, with an option to expand? This can be decided while reviewing the stories, and doesn't affect the spec.
