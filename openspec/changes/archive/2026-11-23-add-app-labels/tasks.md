# Tasks

## 1. Database: labels and assignments

- [x] 1.1 Run `npx dotenv -e .env.local -- prisma migrate status`. Verify it reports the database is in sync before you add a migration. If it reports drift, resolve it without accepting a reset prompt.
- [x] 1.2 In `prisma/schema.prisma`, add the `Label` and `AppLabel` models and `labels AppLabel[]` on `App`, exactly as in design.md ("Explicit join table"). Run `npm run db:migrate -- --name app_labels`, then `npm run db:generate`. Verify the generated SQL creates `labels` with a unique index on `name_key`, and `app_labels` with primary key `(app_id, label_id)`, an index on `label_id` and two cascading foreign keys. Then verify `migrate status` is clean.

## 2. Server: label names and label functions

- [x] 2.1 In `src/lib/schemas.ts`, add `normalizeLabelName` and `labelNameKey` (design.md, "Case-insensitive uniqueness"). Add `assignLabelSchema` and `unassignLabelSchema` (`appId`, `labelId`, both positive integers) and `createLabelSchema` (`appId`, `name`), where `name` is normalised and must be 1-50 characters, with the message "Label names can be at most 50 characters." Verify with a new `src/lib/schemas.test.ts`: `"  Kids   games "` becomes `"Kids games"`; `labelNameKey("Kids")` equals `labelNameKey(" kids ")`; a name of only spaces and a 51-character name are rejected; a 50-character name is accepted. `npx vitest run src/lib/schemas.test.ts` passes.
- [x] 2.2 Create `src/lib/labels.server.ts` with `assignLabel`, `createAndAssignLabel` (including the one-time `P2002` retry) and `unassignLabel`, as in design.md ("Server functions" and "Concurrent creation"). Map foreign-key errors to plain messages. Verify with a new `src/lib/labels.server.test.ts` that mocks `#/db` the way `apps.server.test.ts` does:
  - assigning uses `skipDuplicates`;
  - creating "kids" when "Kids" exists reuses that label's id;
  - a `P2002` on create re-reads the label by `nameKey` and assigns it;
  - unassigning a missing assignment resolves without error.

  `npx vitest run src/lib/labels.server.test.ts` passes.
- [x] 2.3 Create `src/lib/labels.functions.ts` with POST server functions `assignLabel`, `createAndAssignLabel` and `unassignLabel`, each validated by its schema from 2.1. Verify `npx tsc --noEmit` passes.
- [x] 2.4 Extend `loadAppDetail` in `src/lib/apps.server.ts` to return `labels` and `allLabels` as `{ id, name }[]`, sorted with `localeCompare(…, 'en')`. Verify with new cases in `apps.server.test.ts`: the labels "Kids" and "Education" come back as Education, Kids; `allLabels` includes labels that no app uses. `npx vitest run src/lib/apps.server.test.ts` passes.

## 3. Server: labels through merge and unmerge

- [x] 3.1 In `mergeAppGroups`, copy the source groups' label ids onto the target with `createMany … skipDuplicates` before `app.deleteMany` (design.md, "Merge copies labels"). Verify with cases in `apps.server.test.ts`:
  - target {Kids, Education} plus source {Kids, Puzzle} calls `createMany` with Kids and Puzzle for the target and `skipDuplicates: true`, before `deleteMany`;
  - sources with no labels skip the copy;
  - the existing merge tests still pass.
- [x] 3.2 Add a test pinning that `splitAppFromGroup` creates the new app without `appLabel` writes and leaves the original group's `AppLabel` rows untouched. Verify `npx vitest run src/lib/apps.server.test.ts` passes.

## 4. UI: labels on the app page

- [x] 4.1 Add the shadcn components with `npx shadcn@latest add badge combobox`. If the base-nova registry has no `combobox`, add `popover command` instead, as in the design's fallback. Verify the files appear under `src/components/ui/` and `npx tsc --noEmit` passes.
- [x] 4.2 Create `src/components/AppLabels.tsx` (design.md, "Frontend"). It needs:
  - badges for the assigned labels, each with a remove button named "Remove label <name>";
  - a combobox offering the unassigned labels, plus `Create "<name>"` when the typed text's `labelNameKey` matches no label;
  - each action calling its server function, then `router.invalidate()`;
  - the control disabled while a request is pending;
  - server validation errors shown inline.

  Render it under the heading in `AppDetailView`, passing `app.id`, `labels` and `allLabels`. Verify `npx tsc --noEmit` passes.
- [x] 4.3 Check the page with `npm run dev` in the browser preview, on an app group with two listings. Verify each of these:
  - assigning an existing label, creating "Puzzle", and typing "puzzle" again (which offers the existing label instead of creating one) all work;
  - removing a label works, and a reload shows the same labels;
  - a 51-character name shows the limit message;
  - removing a label via its "Remove label …" name works with only the keyboard;
  - the layout holds at phone width and in dark mode.

## 5. Integration check

- [x] 5.1 In the browser preview against the dev database, give two app groups overlapping labels and merge them from the home list. Verify the merged group shows the union of their labels, once each. Then unmerge a non-main listing and verify the new group has no labels and the original group keeps all of them. Run `npx vitest run` and verify the whole suite passes.

## Workflow follow-up

- Sync the `app-labels` spec and archive the change once the implementation is reviewed.
