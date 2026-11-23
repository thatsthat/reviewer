# Proposal

## Why

App groups have no way to carry user-defined tags, so there is nowhere to note what an app is about or how it relates to others. Labels on app groups give users that annotation, starting with the app page only.

## What Changes

- Add shared labels that can be assigned to app groups (not to individual store listings).
- The app page shows the group's labels and lets any user:
  - assign an existing label,
  - create a new label and assign it in one step,
  - unassign a label from the group.
- Label names are trimmed, collapsed to single spaces, limited to 50 characters and unique regardless of letter case; typing an existing name reuses that label.
- A label stays in the system after it is unassigned from every group.
- Merging app groups keeps the union of all merged groups' labels.
- Unmerging a listing gives its new app group no labels; the original group keeps its labels.

Out of scope for this change: filtering or searching the app list by label, renaming or deleting labels, label colours, and per-user ownership or permissions.

## Capabilities

### New Capabilities
- `app-labels`: shared labels on app groups - how they are shown, assigned, created and unassigned on the app page, the rules for label names, and how labels carry through merging and unmerging app groups.

### Modified Capabilities

None. The `app-detail` requirements stay as they are; label behavior on the app page, including during merge and unmerge, is owned by `app-labels`.

## Impact

- **Database**: new `labels` and `app_labels` tables and a Prisma migration; `App` gains a relation to its labels.
- **Server**: new label server functions; `loadAppDetail` returns the group's labels and the labels available to assign; `mergeAppGroups` copies source labels onto the target group.
- **Frontend**: a labels section on the app page (`AppDetailView`), using shadcn components added to the project (`badge`, `combobox`).
- **Dependencies**: no new npm packages beyond what the shadcn components require.
