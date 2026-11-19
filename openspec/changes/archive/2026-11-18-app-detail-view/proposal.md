# Proposal

## Why

The `/apps/$appId` route renders `AppRelationsList` alone inside a card. Every row shows a rating and rating count read from the scraped `data` JSON, and the Google count reads the wrong field (`reviews`, the written-review count, instead of `ratings`). The page should become a proper app view: it shows what the group is, which store listings belong to it, and where each one lives, using only the typed columns on the store tables. Detailed per-version information stays on the stores themselves.

## What Changes

- Add an app detail view component that becomes the body of `/apps/$appId`. It shows the app's title as a header and contains `AppRelationsList`.
- Each listing row in `AppRelationsList` shows a store logo (`/google.svg` or `/apple.svg`) next to the listing title. This replaces the "Google Play / App Store" text line under the title.
- **BREAKING** (internal API): remove `rating` and `ratingCount` from `AppRelation` and from the row UI.
- `AppRelation.url` comes from the `url` column on `google` / `apple` instead of `data.url`. The detail loader no longer reads the `data` JSON.
- The `url` column on `google` and `apple` becomes required (`NOT NULL`). Every listing is scraped from a store page, so it always has one.
- Listings are returned in a deterministic order instead of the database's unspecified order.
- No listing-specific content (icon, description, version, etc.) appears outside the rows.
- Unmerge behavior, the empty state and the not-found state are unchanged.

## Capabilities

### New Capabilities
- `app-detail`: the per-app page at `/apps/$appId`: what it shows about an app group and its linked store listings, how listings are ordered and identified by store, and how each one links out to its store.

### Modified Capabilities
<!-- None: no specs exist yet in openspec/specs/. -->

## Impact

- `src/routes/apps.$appId.tsx`: renders the new view instead of the inline card.
- New component (e.g. `src/components/AppDetailView.tsx`) plus a Storybook story.
- `src/components/AppRelationsList.tsx` and its stories: rows show a store logo next to the title; rating text removed.
- `src/lib/apps.server.ts`: `AppRelation` loses `rating`/`ratingCount`; `loadAppDetail` selects `url` from the column, drops the JSON helpers, and sorts relations.
- Static assets: `public/google.svg`, `public/apple.svg` (already added).
- `prisma/schema.prisma` plus a new migration under `prisma/migrations/`: `url` becomes `String` on `Apple` and `Google`. Any existing rows with a NULL `url` must be re-imported or removed first.
- No new dependencies.
