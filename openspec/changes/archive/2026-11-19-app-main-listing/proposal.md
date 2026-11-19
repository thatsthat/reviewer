# Proposal

## Why

An app group combines several store listings, but the app page treats them all the same and shows nothing about what the app actually is. Users need to mark one listing as the group's main listing and see its basic store details (icon, title, description, last updated) on the app page. The choice must persist across sessions.

## What Changes

- Each app group always has a **main listing**, saved in the database. The main listing is required: an app group cannot exist without one.
- When a group is created, or its listings change through a merge, a default main listing is saved: the first listing in the page's sort order (Google Play before App Store, then by title, then by store app id). Existing app groups get their default saved by the migration.
- The app page shows a summary of the main listing above the listings list: icon, title, description and the store's last-updated date.
- Each row in the listings list has a star. A filled star marks the main listing. Clicking an outline star saves that listing as the main listing.
- **BREAKING** (behavior): the main listing cannot be unmerged. Its row shows no Unmerge action, and the server rejects the request. An unmerged listing becomes the main listing of its new app group.
- Merging app groups replaces the saved main listing with the default for the merged group, whichever groups had a chosen main listing before.
- The store's own last-updated date is stored as a typed column on the `google` and `apple` tables. It is set when a listing is scraped and filled in for existing rows from the saved store data.
- Listing title ordering uses a fixed locale, so the order and the default main listing don't depend on the server's locale.
- **Out of scope:** choosing which app group survives a merge, or which title it keeps. Today the first ticked app wins. This change does not alter that.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `app-detail`: adds the saved main listing, its summary and the star control; replaces "App page shows no listing-specific details" with details for the main listing only; blocks unmerging the main listing; merging saves the default main listing.

`app-detail` is introduced by the completed `app-detail-view` change. Archive that change before archiving this one, so `openspec/specs/app-detail/spec.md` exists for these deltas to apply to.

## Impact

- `prisma/schema.prisma` plus a new migration: `apps.primary_store` (enum `google` / `apple`) and `apps.primary_store_app_id`, both `NOT NULL` and backfilled with each app's default; `google.updated_at` and `apple.updated_at` (`timestamptz`, nullable), filled in from `data` for existing rows.
- `src/lib/google.server.ts`, `src/lib/apple.server.ts`: `toGoogleRow` / `toAppleRow` set `updatedAt` from the scraped `updated` field.
- `src/lib/apps.server.ts`:
  - `AppRelation` gains `isPrimary`, and `loadAppDetail` returns the main listing's summary.
  - `ensureGoogleAppLink` / `ensureAppleAppLink` create apps with their main listing set, and so does the new app in `splitAppFromGroup`.
  - `splitAppFromGroup` refuses to unmerge the main listing.
  - `mergeAppGroups` saves the default main listing for the merged group.
  - New `setPrimaryListing`.
  - `compareAppRelations` pins `localeCompare` to `'en'`.
- `src/lib/apps.functions.ts`, `src/lib/schemas.ts`: new POST server function and its input schema.
- `src/components/AppRelationsList.tsx` and stories: star control, no Unmerge on the main row.
- New `src/components/ListingSummary.tsx` plus stories; `src/components/AppDetailView.tsx` and stories render it above the list.
- Tests in `src/lib/*.server.test.ts` for the row mappers, choosing the default, and the add, unmerge, merge and star rules.
- No new dependencies. `Star` comes from `lucide-react`, which the project already uses.
