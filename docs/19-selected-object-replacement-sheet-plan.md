# Selected Object Replacement Sheet Plan

Research date: 2026-04-23
Design reference: Figma `CQYrNeqGjkgdp3igpFLr3k`, node `6396:317370`

## Goal

Update the bottom sheet so that selecting an object in the room changes the sheet into an object-specific edit surface:

1. The selected product appears in a fixed product card at the bottom.
2. A thin horizontal replacement rail appears above the card.
3. The rail shows alternative products from the same category as the selected object.
4. Selecting a replacement swaps the model while preserving the placed object's transform.

This should replace the current generic browse-first experience while an object is selected.

## Figma Pattern Summary

The referenced frame uses a distinct two-part edit mode:

- Top of the bottom area: horizontally scrollable thumbnail rail, each tile `72 x 72`.
- Bottom of the bottom area: dark product card with:
  - thumbnail
  - brand
  - product name + chevron
  - price row
  - bookmark action on the right

Key behavior implied by the design:

- The replacement rail is contextual, not global.
- The bottom card is for the currently selected object, not for the full catalog.
- The edit mode coexists with the 3D handlers above the selected object.

## Current Codebase State

Relevant files:

- `src/ui/CatalogSheet.tsx`
- `src/store/selectionStore.ts`
- `src/store/editorObjectsStore.ts`
- `src/constants/productCatalog.ts`
- `src/constants/manualProductCatalog.generated.ts`

Current constraints:

- `CatalogSheet` is still browse-oriented.
- `EditorObject` does not have a stable `catalogItemId` field.
- The sheet can show items currently in the room, but not a selected-object-specific replacement UI.
- Replacement logic does not yet exist. Current flow is add/remove oriented, not swap-in-place.

## Architectural Decision

Do not create a second bottom sheet.

Instead, extend `CatalogSheet` to support two modes:

1. `browse`
2. `selected-object-edit`

Mode switch rule:

- `selectedId === null` -> `browse`
- `selectedId !== null` and the selected object maps to a catalog item -> `selected-object-edit`

This keeps the bottom sheet ownership in one place and avoids a second overlapping UI system.

## Data Model Changes

### 1. Add stable catalog identity to placed objects

`EditorObject` should gain a field:

```ts
catalogItemId?: string
```

Why:

- `url` alone is not enough for reliable UI mapping.
- Multiple catalog items can point to the same source family with different sizing or naming.
- The bottom card and replacement rail should key off catalog data, not off raw model URLs.

### 2. Seed initial room objects with catalog IDs

Every curated initial object that corresponds to a catalog item should set `catalogItemId`.

Examples:

- `desk`
- `armchair`
- `bookcase-left`
- `storage-right`
- `reading-chair`
- `reading-side-table`
- `reading-lamp`

Objects that are procedural or not user-replaceable can stay without `catalogItemId`.

### 3. Add selected-object sheet view model

Inside `CatalogSheet`, derive:

```ts
selectedObject
selectedCatalogItem
replacementCandidates
```

Where:

- `selectedObject` comes from `selectionStore + editorObjectsStore`
- `selectedCatalogItem` comes from `catalogItemId`
- `replacementCandidates` are same-category items, excluding the currently selected one or marking it active

## Category Mapping Rules

Replacement candidates should come from the same catalog category as the selected item.

Examples:

- chair -> chair
- table -> table
- storage -> storage
- light -> light

Do not mix categories in edit mode.

This keeps the rail predictable and aligned with the Figma intent.

## Replace Interaction Rules

Selecting a replacement candidate should:

1. Keep the same `EditorObject.id`
2. Keep:
   - `position`
   - `rotationY`
   - `boundsRotationY`
   - `elevationM`
   - `placement`
3. Replace:
   - `catalogItemId`
   - `label`
   - `url`
   - `targetSize`
   - `dimensionsM`
   - any display metadata derived from the catalog item

This is a swap-in-place edit, not delete + add.

## UI Structure Plan

### Browse mode

Keep the existing browse sheet behavior:

- top tabs
- chips
- product grid

### Selected-object edit mode

Replace the browse content with:

1. Replacement rail
2. Selected product card

Planned structure:

```txt
CatalogSheet
  if browse:
    browse layout
  if selected-object-edit:
    replacement rail
    selected product card
```

### Replacement rail

Requirements:

- horizontal scroll
- thumbnail tiles only
- current product visibly active
- minimal top/bottom spacing, matching Figma's tighter edit surface

### Product card

Phase 1 fields:

- thumbnail
- brand
- product name
- chevron affordance
- bookmark icon

Price handling:

- Current runtime catalog likely does not have reliable pricing for all curated/manual items.
- For phase 1, price row should be hidden unless pricing exists.
- Do not invent fake live commerce data.

## State Transition Rules

### Enter edit mode

Triggered when:

- an object is selected
- and it can resolve to a catalog item

Behavior:

- bottom sheet switches to selected-object edit mode
- replacement rail is populated from same category
- product card shows selected item

### Replace item

Triggered when:

- a tile in the replacement rail is tapped

Behavior:

- selected object remains selected
- object data is replaced in place
- rail and card refresh to the new selected catalog item

### Exit edit mode

Triggered when:

- selection is cleared
- or selected object has no resolvable catalog item

Behavior:

- bottom sheet returns to browse mode

## File-Level Implementation Plan

### `src/store/editorObjectsStore.ts`

- add `catalogItemId?: string` to `EditorObject`
- seed curated initial objects with catalog IDs
- add or reuse an update path for in-place product replacement

### `src/ui/CatalogSheet.tsx`

- derive selected edit context
- add mode branch
- implement replacement rail
- implement selected product card
- preserve current browse mode unchanged when nothing is selected

### `src/constants/productCatalog.ts`

- confirm helper accessors exist for:
  - item by id
  - items by category
- add small helpers if missing

### `src/store/selectionStore.ts`

- no structural change expected
- only consumed more aggressively by `CatalogSheet`

## Validation Plan

### Logic validation

- selecting an object enters edit mode
- clearing selection returns to browse mode
- selecting a replacement swaps the object in place
- transform is preserved after replacement

### Visual validation

Use headless Playwright:

- selected chair -> replacement rail visible
- bottom card visible
- current item highlighted in rail
- replacement changes model and card content

### Regression validation

- `pnpm typecheck`
- `pnpm build`
- existing add/browse flow still works
- object selection and transform handlers remain usable

## Risks

### 1. Catalog identity gaps

Some room objects may not yet map cleanly to catalog items.

Mitigation:

- implement edit mode only when `catalogItemId` is present
- leave non-catalog objects on existing browse mode until mapped

### 2. Dimensions change on replacement

Swapping from one model to another can produce overlap or wall penetration.

Mitigation:

- preserve transform first
- rely on existing bounds sync
- in later pass, add post-replace clamp/collision correction if needed

### 3. Price data inconsistency

The Figma card shows commerce pricing, but the local catalog is mixed and may not have real prices.

Mitigation:

- phase 1 hides price row unless structured price exists

## Recommended Execution Order

1. Add `catalogItemId` to `EditorObject`
2. Seed current curated room objects with catalog IDs
3. Add selected edit mode branching in `CatalogSheet`
4. Implement replacement rail
5. Implement selected product card
6. Implement replace-in-place interaction
7. Validate with headless Playwright

## Non-Goals For Phase 1

- saved/favorite commerce behavior
- real pricing integration
- product detail page routing
- history/undo integration for replacement changes
- mixed multi-category replacement suggestions

## Success Criteria

The feature is complete when:

- selecting a replaceable object changes the bottom sheet into the Figma-style contextual edit layout
- the bottom card matches the selected object
- the rail shows same-category alternatives
- tapping an alternative swaps the selected object without moving it
- clearing selection restores the normal browse sheet
