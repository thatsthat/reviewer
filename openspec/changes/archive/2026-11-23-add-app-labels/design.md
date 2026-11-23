# Design

## Context

See proposal.md for motivation and specs/app-labels/spec.md for the required behavior.

- App groups live in `App`. Store listings attach to groups through explicit join tables (`AppsAppleLink`, `AppsGoogleLink`) whose rows cascade away when their `App` is deleted.
- `mergeAppGroups` repoints the source groups' links at the target and then deletes the source `App` rows inside one transaction. `splitAppFromGroup` creates a new `App` for the unmerged listing.
- App page data comes from one route loader (`getAppDetail` → `loadAppDetail`). Mutations are made with `useServerFn` and followed by `router.invalidate()`. TanStack Query is not used, per AGENTS.md.
- The shadcn setup uses the `base-nova` (Base UI) style. Only basic primitives are installed today.

## Goals / Non-Goals

**Goals:**
- Model labels so that duplicate assignments and duplicate names are impossible at the database level, not only in application code.
- Keep label mutations idempotent so stale pages do not produce errors.
- Make merge carry labels without the transaction failing on overlapping labels.

**Non-Goals:**
- Indexes or query shapes for filtering the app list by label. The `labelId` index is added only because it is cheap.
- Batch label edits, such as assigning several labels in one request.

## Decisions

### Explicit join table `AppLabel` with a composite primary key

```prisma
model Label {
  id        Int        @id @default(autoincrement())
  name      String
  nameKey   String     @unique @map("name_key")
  createdAt DateTime   @default(now()) @map("created_at") @db.Timestamptz()
  apps      AppLabel[]
  @@map("labels")
}

model AppLabel {
  appId     Int      @map("app_id")
  labelId   Int      @map("label_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
  app   App   @relation(fields: [appId], references: [id], onDelete: Cascade, onUpdate: NoAction)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade, onUpdate: NoAction)
  @@id([appId, labelId])
  @@index([labelId])
  @@map("app_labels")
}
```

`App` gains `labels AppLabel[]`.

- The explicit table matches the existing link tables and leaves room for metadata such as `createdAt`. A Prisma implicit many-to-many relation was rejected because its generated `_AppToLabel` table differs from the project's conventions and cannot carry extra columns.
- `@@id([appId, labelId])` makes a duplicate assignment impossible.
- `onDelete: Cascade` on `app` means deleting a group removes its assignments. Unmerge and merge depend on this, as described below.

### Case-insensitive uniqueness through a stored `nameKey` column

`name` keeps the spelling the user typed. `nameKey` holds the normalised name in lower case and carries the unique constraint.

- Alternatives considered: a Postgres `citext` column, or a unique index on `lower(name)`. Both need raw SQL in the migration and fit Prisma's model poorly. AGENTS.md asks to avoid raw SQL. A stored key column does not.
- One shared `normalizeLabelName(raw)` helper (trim, collapse whitespace) and `labelNameKey(name)` (normalise, then lower-case) live in `src/lib/schemas.ts`. Both the zod validator and the client use them, so the picker shows "Kids" instead of offering `Create "kids"`.

### Server functions

All label persistence goes in a new `src/lib/labels.server.ts`. The thin `createServerFn` wrappers go in `src/lib/labels.functions.ts`, and the zod schemas in `src/lib/schemas.ts`.

| Function | Input | Implementation |
|---|---|---|
| `assignLabel` | `appId`, `labelId` | `appLabel.createMany({ data: [...], skipDuplicates: true })` |
| `createAndAssignLabel` | `appId`, `name` | Transaction: `label.upsert` on `nameKey` (create with `name`, `nameKey`; update `{}`), then `createMany … skipDuplicates` for the assignment |
| `unassignLabel` | `appId`, `labelId` | `appLabel.deleteMany({ where: { appId, labelId } })` |

`loadAppDetail` additionally returns:
- `labels`: the group's labels as `{ id, name }`, sorted by `name` with `localeCompare(…, 'en')`. This is the same comparison the listing order uses.
- `allLabels`: every label as `{ id, name }`, in the same order. The picker hides the ones already assigned.

A foreign-key violation, such as an app or label that no longer exists, is caught and turned into a plain error message ("That app no longer exists."). This matches the style of `setPrimaryListing`.

### Concurrent creation of the same name

Two simultaneous `upsert`s on the same `nameKey` can both miss and both insert, so one fails with Prisma `P2002`. `createAndAssignLabel` catches `P2002` once, re-reads the label by `nameKey` and assigns it. This gives the outcome the spec's "Two users create the same label at once" scenario requires.

### Merge copies labels instead of repointing them

The link tables can be repointed with `updateMany`, because a listing belongs to only one group. Labels can't: if the target and a source share a label, repointing creates a second `(targetId, labelId)` row and violates the primary key. Inside the existing merge transaction, before the source apps are deleted, the code will:

1. `appLabel.findMany({ where: { appId: { in: sourceAppIds } }, select: { labelId: true } })`
2. `appLabel.createMany({ data: labelIds.map(labelId => ({ appId: targetAppId, labelId })), skipDuplicates: true })`
3. Run the existing `app.deleteMany`, which cascades away the source groups' `AppLabel` rows.

### Unmerge needs no label code

`splitAppFromGroup` creates a new `App` with no `AppLabel` rows and never touches the original group's rows. That is exactly the required behavior. A test pins it, so a future refactor that copies labels would be caught.

### Frontend

- Add shadcn `badge` and `combobox` with `npx shadcn@latest add`. Base UI's Combobox supports filtering, chips and a custom "create" item.
- A new `src/components/AppLabels.tsx`, rendered in `AppDetailView` under the heading, receives `appId`, `labels` and `allLabels` from the loader data. It shows:
  - one `Badge` per label, each with a remove button whose `aria-label` is "Remove label <name>";
  - a combobox listing `allLabels` minus the assigned ones. When the typed text's `labelNameKey` matches no label, it offers an extra item: `Create "<normalised text>"`.
- Each action calls its server function through `useServerFn`, then `router.invalidate()`. A pending flag disables the combobox while a request is running, the same way `AppRelationsList` handles unmerge. Validation errors, such as an empty or too-long name, are shown inline under the field.

## Risks / Trade-offs

- **`allLabels` grows without limit, because labels can't be deleted.** Mitigation: the combobox filters as the user types. If the list gets large, move to a server-side search function. That would change only the design, not the spec.
- **`nameKey` is derived data that could drift from `name`.** Mitigation: only `labels.server.ts` writes labels, always through `labelNameKey`. Labels can't be renamed, so it is only ever written once.
- **The base-nova registry may not provide `combobox`.** Mitigation: build the picker from `popover` plus `command`. The component's API to the page stays the same.
- **Last write wins between concurrent editors.** Two users editing the same group see each other's changes only after their next action or a reload. This is acceptable because there are no permissions or conflict rules for labels.

## Migration Plan

1. Update `prisma/schema.prisma` and run `prisma migrate dev --name app_labels`. This creates both tables and needs no backfill, since existing groups start with no labels.
2. Deploy as usual. Rolling back means a follow-up migration that drops `app_labels` and `labels`, which loses only label data.
