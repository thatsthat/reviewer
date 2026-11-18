# Design

## Context

`/apps/$appId` loads data through `getAppDetail` → `loadAppDetail` (`src/lib/apps.server.ts`). That returns `{ app: { id, title }, relations: AppRelation[] }`. Each `AppRelation` is built from the link tables joined to `google` / `apple`. Today `url`, `rating` and `ratingCount` come from the `data` JSON through `getStoredUrl`, `getStoredRating` and `getStoredRatingCount`. Apple links are concatenated before Google links, and neither query has an `orderBy`.

Since the last commit, the store tables have typed `title`, `description`, `url`, `iconUrl` and `scrapedAt` columns. This view needs only `title` and `url`. `url` is declared `String?` even though `toGoogleRow` / `toAppleRow` always set it from the scraper's non-optional `url`. `prisma/migrations/` holds only `20260824102445_initial`, which predates these columns, so they were most likely applied with `db push`. The migration history may therefore not match the live database. The logos are static files at `public/google.svg` and `public/apple.svg` (Illustrator exports with an 800x800 `viewBox`).

Requirements live in `specs/app-detail/spec.md`.

## Goals / Non-Goals

**Goals:**
- The detail loader reads only typed columns, never `data`.
- Listing order is decided in one place, on the server.
- `AppRelationsList` stays a self-contained, reusable component with its own stories.

**Non-Goals:**
- No app-level icon, description, rating or aggregate summary.
- No schema change other than making `url` required. In particular, no `linked_at` column for "first added" ordering, and `iconUrl` / `description` stay nullable because this view doesn't use them.
- No change to merge/unmerge semantics or to the app list on `/`.
- Optimizing or cleaning up the SVG files.

## Decisions

### 1. A new `AppDetailView` component owns the page body
`src/components/AppDetailView.tsx` takes `{ app, relations }` (the loader's return shape) and renders the title heading plus `AppRelationsList`. The route's `component` becomes a thin wrapper that passes loader data into it; the route keeps its `loader` and `errorComponent`.
- *Why:* it can be tested in Storybook without the router loader, and the route file stays focused on loading and errors.
- *Alternative:* keep the markup inline in the route. Rejected because it can't be put in a story and would grow as the view grows.

### 2. `AppRelation` shrinks to `{ store, storeAppId, name, url }`
Remove `rating` and `ratingCount`. `url` comes from the `url` column. Delete `getStoredUrl`, `getStoredRating` and `getStoredRatingCount`, and stop selecting `data` in `loadAppDetail`.
- *Why:* the spec forbids per-listing details on this page, and the Google count read the wrong field anyway. Not loading the JSON also makes the payload smaller.
- `url` is a plain `string`. See Decision 3.

### 3. Make `url` required in the database
Change `url String?` to `url String` on `Apple` and `Google`, with a Prisma migration.
- *Why:* every listing comes from a store page, so a listing without a URL is invalid data. Making the column `NOT NULL` lets the database enforce that. The type stays `string` from Prisma through `AppRelation` to the row, so the UI needs no null branch and the spec needs no "missing URL" case.
- *Alternative:* keep `String?` and render a link-less title when it is null. Rejected because it handles a state that shouldn't exist and leaves the database able to store it.
- *Before migrating:* check for NULLs (`SELECT count(*) FROM google WHERE url IS NULL`, same for `apple`). Rows left over from before the column existed get re-imported from their store URL, or removed, before the migration runs.

### 4. Sort on the server, in TypeScript, after combining
`loadAppDetail` builds the combined array and sorts it with a comparator: store rank (`google` = 0, `apple` = 1), then `name` using `localeCompare`, then `storeAppId`.
- *Why:* the sort has to span two queries (one per link table), so a per-query `orderBy` can't produce it. Groups are small (a handful of rows), so sorting in memory costs nothing. A single exported comparator (or a `STORE_ORDER` constant) gives one place to change the store order.
- *Alternatives:* `ORDER BY` in each query plus concatenation. That only orders within a store and still hard-codes the store order by concatenation order. A `linked_at` column was ruled out (see Non-Goals).

### 5. Store logo rendered with `<img>` from `/public`
In `AppRelationRow`, render `<img src={STORE_LOGO[store]} alt={STORE_LABEL[store]} className="size-5 shrink-0" />` before the title, in the same flex row. `STORE_LOGO` maps `google` → `/google.svg` and `apple` → `/apple.svg`. Remove the secondary text line (store label · rating).
- *Why:* the files already exist in `public/`, an `<img>` is cached and doesn't add the SVG bytes to the JS bundle, and `alt` satisfies the accessible-name requirement.
- *Alternative:* import the SVGs as React components (needs an SVGR plugin, a new dependency) or inline them. Not worth it for two static logos that don't need to change color with the theme.

## Risks / Trade-offs

- [Logos may not stand out on dark theme] → Check both themes in Storybook. If one fails, add a subtle background or ring around the `<img>`, without editing the SVG.
- [Removing fields from `AppRelation` breaks the existing stories and their `play` assertions on rating text] → Update `AppRelationsList.stories.tsx` in the same task. Assertions move to checking logo `alt` text and titles.
- [Hard-coding "Google first" may not match what users expect] → It lives in one comparator. Changing it doesn't affect anything else.
- [Rating data stays in `data` but isn't shown] → Intended. It's still available if a future change wants it.
- [Migration history out of sync with the database: if earlier schema changes went through `db push`, `prisma migrate dev` detects drift and offers to **reset the database**, deleting all data] → Run `prisma migrate status` first. If it reports drift, baseline before adding the new migration: generate the missing migration with `prisma migrate diff` and mark it applied with `prisma migrate resolve --applied`. Never accept the reset prompt.
- [Existing NULL `url` rows make the `ALTER COLUMN ... SET NOT NULL` fail] → Run the NULL check from Decision 3 first. The migration fails without changing anything, so nothing is half-applied.

## Migration Plan

1. Check `prisma migrate status`. If it shows drift, baseline as described under Risks.
2. Count NULL `url` rows in `google` and `apple`. Re-import or remove any that exist.
3. Change the schema and run `npm run db:migrate` to create and apply the migration (`url` → `NOT NULL`), then `npm run db:generate`.
4. Rollback: a follow-up migration with `ALTER COLUMN url DROP NOT NULL`, which loses no data.
