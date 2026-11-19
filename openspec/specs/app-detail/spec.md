# app-detail Specification

## Purpose

Defines the per-app page: what it shows about an app group, how it lists the Google Play and App Store listings linked to that group, and how a user reaches each listing on its store.

## Requirements

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
When an app group has more than one linked listing, each row except the main listing's row SHALL offer an Unmerge action that moves that listing into its own new app group. When the group has exactly one listing, no Unmerge action SHALL be offered. A request to unmerge the group's main listing SHALL be rejected and leave the group unchanged.

#### Scenario: Unmerging from a group of two
- **GIVEN** an app group with two linked listings
- **WHEN** a user unmerges the listing that is not the main listing
- **THEN** the list updates to show only the remaining listing, without a full page reload, and the unmerged listing belongs to a new app group

#### Scenario: Single-listing group
- **GIVEN** an app group with exactly one linked listing
- **WHEN** a user opens its app page
- **THEN** no Unmerge action is shown

#### Scenario: Main listing row
- **GIVEN** an app group with two linked listings
- **WHEN** a user opens its app page
- **THEN** the main listing's row shows no Unmerge action

#### Scenario: Unmerge request for the main listing
- **GIVEN** a page opened before another user made one of its listings the main listing
- **WHEN** a user unmerges that listing
- **THEN** the request is rejected and the listing stays in its app group

### Requirement: Unknown app ids show a not-found state
The app page SHALL show an "App not found" state when the app id in the URL is not an integer or does not match an existing app group.

#### Scenario: Nonexistent app id
- **WHEN** a user opens `/apps/999999` and no app group has that id
- **THEN** the page shows "App not found" with an explanatory message

#### Scenario: Non-numeric app id
- **WHEN** a user opens `/apps/abc`
- **THEN** the page shows "App not found" with an explanatory message

### Requirement: Every app group has a saved main listing
Every app group SHALL have exactly one main listing, saved in the database and chosen from the group's own linked listings. The app page SHALL show the saved main listing as the main listing.

#### Scenario: Saved main listing
- **GIVEN** an app group with a Google Play listing and an App Store listing, where the App Store listing is saved as the main listing
- **WHEN** a user opens its app page
- **THEN** the App Store listing is shown as the main listing

### Requirement: The default main listing is the first listing in the page's order
Whenever this spec says the default main listing is saved, the saved listing SHALL be the group's first listing in the page's listing order: Google Play before App Store, then by listing title, then by store app id.

#### Scenario: Listings from both stores
- **GIVEN** listings: a Google Play listing "Zeta" and an App Store listing "Alpha"
- **WHEN** the default main listing is saved for their group
- **THEN** the Google Play listing "Zeta" is saved as the main listing

#### Scenario: Several listings from the same store
- **GIVEN** listings: Google Play listings "Foo Pro" and "Foo"
- **WHEN** the default main listing is saved for their group
- **THEN** "Foo" is saved as the main listing

### Requirement: New app groups start with a saved main listing
When an app group is created, its main listing SHALL be saved in the same operation. A group created by importing a listing SHALL have that listing as its main listing. A group created by unmerging a listing SHALL have the unmerged listing as its main listing.

#### Scenario: Importing a new listing
- **WHEN** a user imports a store URL whose listing is not linked to any app group yet
- **THEN** a new app group is created with that listing saved as its main listing

#### Scenario: Unmerging a listing
- **GIVEN** an app group with two linked listings
- **WHEN** a user unmerges the listing that is not the main listing
- **THEN** the unmerged listing's new app group has that listing saved as its main listing, and the original group keeps its main listing

### Requirement: Existing app groups get a saved main listing
App groups that exist before this change SHALL each have the default main listing saved when the change is deployed.

#### Scenario: Existing group with listings from both stores
- **GIVEN** an app group, created before this change, with a Google Play listing and an App Store listing
- **WHEN** the change is deployed
- **THEN** the Google Play listing is saved as its main listing

### Requirement: Listing rows show which listing is the main listing
Each listing row SHALL show a star control. The main listing's star SHALL be filled and the other rows' stars SHALL be outlined. Each star SHALL have an accessible name, and its pressed state SHALL be exposed as true only on the main listing's row.

#### Scenario: Group with two listings
- **GIVEN** an app group with two linked listings
- **WHEN** a user opens its app page
- **THEN** exactly one row shows a filled star, marked as pressed, and the other row shows an outlined star, marked as not pressed

#### Scenario: Group with one listing
- **GIVEN** an app group with exactly one linked listing
- **WHEN** a user opens its app page
- **THEN** that listing's row shows a filled star

### Requirement: Users can choose the main listing
Clicking the outlined star on a listing row SHALL save that listing as the app group's main listing, so the choice persists across page reloads and sessions, and the page SHALL update without a full page reload.

#### Scenario: Choosing a different main listing
- **GIVEN** an app group whose main listing is its Google Play listing
- **WHEN** a user clicks the outlined star on its App Store listing row
- **THEN** the App Store listing row shows a filled star, the Google Play listing row shows an outlined star, and the main listing summary shows the App Store listing

#### Scenario: Choice survives a reload
- **GIVEN** a user has made the App Store listing the main listing of an app group
- **WHEN** the user reloads the app page in a new session
- **THEN** the App Store listing is still shown as the main listing

### Requirement: Only a group's own listings can become its main listing
A request to make a listing the main listing of an app group SHALL be rejected when that listing is not currently linked to that group, and the group's saved main listing SHALL stay unchanged.

#### Scenario: Listing moved to another group
- **GIVEN** a page opened before one of its listings was unmerged into a new app group
- **WHEN** a user clicks the outlined star on that listing's row
- **THEN** the request is rejected and the original group's main listing does not change

### Requirement: App page shows a summary of the main listing
The app page SHALL show a summary of the main listing above the listings list, with the listing's icon, title, description, and the date the listing was last updated on its store. A missing icon, description or last-updated date SHALL be left out without an error.

#### Scenario: Main listing with full store data
- **GIVEN** an app group whose main listing has an icon, a description and a last-updated date
- **WHEN** a user opens its app page
- **THEN** the summary shows that icon, title, description and last-updated date

#### Scenario: Main listing without a description
- **GIVEN** an app group whose main listing has no description
- **WHEN** a user opens its app page
- **THEN** the summary shows the icon, title and last-updated date, and no description

#### Scenario: Last-updated date comes from the store
- **GIVEN** a listing last updated on its store on 2026-11-12 and imported on 2026-11-19
- **WHEN** it is the main listing on an app page
- **THEN** the summary shows 2026-11-12 as the last-updated date

### Requirement: Listing rows show no store details
Listing rows SHALL NOT show ratings, rating counts, descriptions, icons, versions or other store details. Only the main listing summary shows store details, and only those listed in its requirement.

#### Scenario: Listing with stored rating data
- **GIVEN** a linked listing whose saved store data includes a rating and rating count
- **WHEN** its row is shown on the app page
- **THEN** the row shows neither the rating nor the rating count

### Requirement: Merging app groups saves the default main listing
When app groups are merged, the merged group's saved main listing SHALL be replaced with the default main listing over all of its listings. This SHALL hold whichever groups had a chosen main listing before the merge.

#### Scenario: Merging two groups with chosen main listings
- **GIVEN** app group 1 whose saved main listing is its App Store listing "Foo", and app group 2 whose saved main listing is its Google Play listing "Foo Pro"
- **WHEN** a user merges the two groups
- **THEN** the merged group's saved main listing is the Google Play listing "Foo Pro", whichever group was selected first
