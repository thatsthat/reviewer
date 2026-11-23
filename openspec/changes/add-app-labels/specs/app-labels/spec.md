# Spec Delta

## Purpose

Lets users tag app groups with shared labels from the app page, and defines how those labels are named and how they carry through merging and unmerging app groups.

## ADDED Requirements

### Requirement: App page shows the app group's labels
The app page SHALL show every label assigned to the app group, ordered by label name. Labels SHALL belong to the app group, not to any individual store listing. When the group has no labels, the page SHALL show no label chips and still offer a way to add one.

#### Scenario: Group with labels
- **GIVEN** an app group with the labels "Kids" and "Education"
- **WHEN** a user opens its app page
- **THEN** the page shows "Education" and "Kids", in that order

#### Scenario: Group without labels
- **GIVEN** an app group with no labels
- **WHEN** a user opens its app page
- **THEN** the page shows no labels and offers a control to add a label

### Requirement: Users can assign an existing label
The app page SHALL let a user pick an existing label that is not yet assigned to the app group and assign it. The assignment SHALL persist across page reloads and sessions, and the page SHALL update without a full page reload.

#### Scenario: Assigning an existing label
- **GIVEN** a label "Kids" that exists but is not assigned to an app group
- **WHEN** a user picks "Kids" on that group's app page
- **THEN** "Kids" is shown among the group's labels, and still shown after a reload in a new session

#### Scenario: Assigned labels are not offered again
- **GIVEN** an app group that has the label "Kids"
- **WHEN** a user opens the label picker on its app page
- **THEN** "Kids" is not offered as a label to add

#### Scenario: Assigning a label that is already assigned
- **GIVEN** a page opened before another user assigned "Kids" to the same app group
- **WHEN** the user assigns "Kids" from that page
- **THEN** the group has "Kids" exactly once and no error is shown

### Requirement: Users can create a label while assigning it
The app page SHALL let a user type a label name that matches no existing label and create it, which SHALL assign the new label to the app group in the same operation.

#### Scenario: Creating a new label
- **GIVEN** no label named "Puzzle" exists
- **WHEN** a user types "Puzzle" on an app page and chooses to create it
- **THEN** a label "Puzzle" exists and is assigned to that app group

#### Scenario: Two users create the same label at once
- **GIVEN** no label named "Puzzle" exists
- **WHEN** two users create "Puzzle" at the same moment on two different app pages
- **THEN** exactly one label "Puzzle" exists and it is assigned to both app groups

### Requirement: Label names are normalised and unique regardless of case
Before a label is saved or matched, its name SHALL be trimmed and runs of whitespace collapsed to one space. A name that is empty after this, or longer than 50 characters, SHALL be rejected. Two names that differ only in letter case SHALL refer to the same label, which keeps the spelling it was created with.

#### Scenario: Name with extra spaces
- **WHEN** a user creates a label typed as "  Kids   games "
- **THEN** the label is saved as "Kids games"

#### Scenario: Name differing only in case
- **GIVEN** a label "Kids" exists and is not assigned to an app group
- **WHEN** a user types "kids" on that group's app page and confirms it
- **THEN** the existing label "Kids" is assigned and no new label is created

#### Scenario: Empty name
- **WHEN** a user tries to create a label whose name is only spaces
- **THEN** the request is rejected and no label is created or assigned

#### Scenario: Name too long
- **WHEN** a user tries to create a label with a 51-character name
- **THEN** the request is rejected with a message about the 50-character limit, and no label is created or assigned

### Requirement: Users can unassign a label
Each label shown on the app page SHALL offer an action, with an accessible name that includes the label's name, that removes the label from the app group. The removal SHALL persist and the page SHALL update without a full page reload. Unassigning a label that is no longer assigned SHALL succeed without changes.

#### Scenario: Unassigning a label
- **GIVEN** an app group with the labels "Kids" and "Education"
- **WHEN** a user activates the action named "Remove label Kids"
- **THEN** only "Education" is shown, and still only "Education" after a reload

#### Scenario: Unassigning a label someone else already removed
- **GIVEN** a page opened before another user unassigned "Kids" from the same app group
- **WHEN** the user unassigns "Kids" from that page
- **THEN** no error is shown and the group does not have "Kids"

### Requirement: Labels outlive their assignments
A label SHALL remain available after it has been unassigned from every app group, and SHALL be offered for assignment on any app page where it is not assigned. Labels SHALL NOT be renamed or deleted.

#### Scenario: Label no longer used by any group
- **GIVEN** a label "Kids" assigned to only one app group
- **WHEN** a user unassigns "Kids" from that group and opens another group's label picker
- **THEN** "Kids" is offered as a label to add

### Requirement: Labels are shared by all users
Labels SHALL be shared across all users: a label created by one user SHALL be available to every user, and any user SHALL be able to assign and unassign any label on any app group.

#### Scenario: Label created by another user
- **GIVEN** one user created the label "Kids"
- **WHEN** a different user opens the label picker on any app page
- **THEN** "Kids" is offered as a label to add

### Requirement: Merging app groups keeps the union of their labels
When app groups are merged, the merged group SHALL have every label that any of the merged groups had, with each label appearing once.

#### Scenario: Merging groups with overlapping labels
- **GIVEN** app group 1 with the labels "Kids" and "Education", and app group 2 with the labels "Kids" and "Puzzle"
- **WHEN** a user merges the two groups
- **THEN** the merged group has exactly the labels "Education", "Kids" and "Puzzle"

#### Scenario: Merging into a group without labels
- **GIVEN** app group 1 with no labels and app group 2 with the label "Kids"
- **WHEN** a user merges the two groups
- **THEN** the merged group has the label "Kids"

### Requirement: Unmerging a listing does not carry labels
When a listing is unmerged into a new app group, the new group SHALL start with no labels, and the original group SHALL keep all of its labels.

#### Scenario: Unmerging from a labelled group
- **GIVEN** an app group with two linked listings and the labels "Kids" and "Education"
- **WHEN** a user unmerges the listing that is not the main listing
- **THEN** the new app group has no labels, and the original group still has "Education" and "Kids"
