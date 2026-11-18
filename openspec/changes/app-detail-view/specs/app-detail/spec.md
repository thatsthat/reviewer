# Spec Delta

## Purpose

Defines the per-app page: what it shows about an app group, how it lists the Google Play and App Store listings linked to that group, and how a user reaches each listing on its store.

## ADDED Requirements

### Requirement: App page shows the app title
The app page at `/apps/<appId>` SHALL show the app group's own title as its heading. The heading SHALL NOT be taken from any single linked listing.

#### Scenario: App with linked listings
- **WHEN** a user opens `/apps/<appId>` for an existing app group
- **THEN** the page heading shows that app group's title

### Requirement: App page lists every linked store listing
The app page SHALL list every Google Play and App Store listing linked to the app group, one row per listing, showing each listing's own title.

#### Scenario: Group with listings from both stores
- **GIVEN** an app group linked to one Google Play listing and one App Store listing
- **WHEN** a user opens its app page
- **THEN** the page shows two rows, each with that listing's title

#### Scenario: Group with no linked listings
- **GIVEN** an app group with no linked listings
- **WHEN** a user opens its app page
- **THEN** the page shows a "No linked store listings." message instead of rows

### Requirement: Listing rows identify their store with a logo
Each listing row SHALL show the logo of the listing's store (Google Play or App Store) next to the listing title. The logo SHALL have an accessible name naming the store.

#### Scenario: Google Play listing
- **WHEN** a Google Play listing row is shown
- **THEN** the Google Play logo appears next to its title with the accessible name "Google Play"

#### Scenario: App Store listing
- **WHEN** an App Store listing row is shown
- **THEN** the App Store logo appears next to its title with the accessible name "App Store"

### Requirement: Listing rows link to the store page
Each listing row SHALL link to the listing's page on its store, opened in a new tab, using the store URL saved for that listing.

#### Scenario: Following a listing link
- **WHEN** a user clicks a listing row's title
- **THEN** the listing's store page opens in a new browser tab

### Requirement: App page shows no listing-specific details
The app page SHALL NOT show ratings, rating counts, descriptions, icons, versions or other per-listing store details. Users get these by following the listing link to the store.

#### Scenario: Listing with stored rating data
- **GIVEN** a linked listing whose saved store data includes a rating and rating count
- **WHEN** its row is shown on the app page
- **THEN** the row shows neither the rating nor the rating count

### Requirement: Listings appear in a stable order
The app page SHALL list listings in a deterministic order that does not change between page loads or when a listing is re-imported: Google Play listings before App Store listings, then by listing title, then by store app id.

#### Scenario: Re-importing a listing
- **GIVEN** an app page showing listings in some order
- **WHEN** one of those listings is re-imported from its store URL and the page is reloaded
- **THEN** the listings appear in the same order as before

#### Scenario: Mixed stores
- **GIVEN** an app group with an App Store listing titled "Alpha" and a Google Play listing titled "Zeta"
- **WHEN** a user opens its app page
- **THEN** the Google Play listing "Zeta" is listed before the App Store listing "Alpha"

### Requirement: Listings can be unmerged from a multi-listing group
When an app group has more than one linked listing, each row SHALL offer an Unmerge action that moves that listing into its own new app group. When the group has exactly one listing, no Unmerge action SHALL be offered.

#### Scenario: Unmerging from a group of two
- **GIVEN** an app group with two linked listings
- **WHEN** a user unmerges one of them
- **THEN** the list updates to show only the remaining listing, without a full page reload, and the unmerged listing belongs to a new app group

#### Scenario: Single-listing group
- **GIVEN** an app group with exactly one linked listing
- **WHEN** a user opens its app page
- **THEN** no Unmerge action is shown

### Requirement: Unknown app ids show a not-found state
The app page SHALL show an "App not found" state when the app id in the URL is not an integer or does not match an existing app group.

#### Scenario: Nonexistent app id
- **WHEN** a user opens `/apps/999999` and no app group has that id
- **THEN** the page shows "App not found" with an explanatory message

#### Scenario: Non-numeric app id
- **WHEN** a user opens `/apps/abc`
- **THEN** the page shows "App not found" with an explanatory message
