# Explore Feed Implementation Plan

Date: 2026-04-24

## Figma Frame

Source:

- `Portfolio-2026`
- Node: `6460:61762`
- Frame size: `375 x 812`
- Surface: bottom sheet with `Explore` tab active

## Figma Diagnosis

The Explore page is a vertical feed inside the existing bottom sheet.

Card structure:

1. Header
   - height `42`
   - horizontal padding `16`
   - author semibold `14/20`
   - timestamp regular `14/20`
   - more icon wrapper `18 x 18`

2. Preview image
   - card image area height `300`
   - side margin `16`
   - image radius `8`
   - object-fit cover

3. Reaction bar
   - top padding `16`
   - bottom padding `12`
   - side padding `16`
   - icon wrappers are `24 x 24`
   - icon artwork must be sized separately inside the wrapper:
     - heart: wrapper `24`, icon `24`
     - comment: wrapper `24`, icon inset roughly `8.33% 10.42% 10.68% 8.33%`
     - stat: wrapper `24`, icon box `13.8 x 15.8`, positioned `5.1, 4.1`
     - export: wrapper `24`, icon box `17.8 x 19.239`, positioned `3.1, 2.19`
     - remix: wrapper `24`, icon box `19 x 17.733`, positioned `3, 3`
   - numbers semibold `14/18`

4. Copy
   - title bold `15/24`
   - description medium `15/24`
   - comments summary semibold `14/18`, color `#828C94`
   - first comment username semibold `15/24`, body medium `15/24`
   - info regular `13/18`, color `#828C94`

Project note:

- The Figma file uses negative letter spacing. The local UI rules prohibit negative letter spacing, so implementation keeps letter spacing at `0`.

## Local Image Inventory

Source directory:

- `/Users/ilwonyoon/Downloads/Ohouse_22_25/Space AI/RP videos/RP rendering`

Images found:

1. `IMG_1272.png`
2. `IMG_1339.png`
3. `IMG_1340.png`
4. `IMG_1342.png`
5. `IMG_1344.png`
6. `IMG_1347.png`
7. `IMG_1414.png`
8. `IMG_2081.png`
9. `IMG_2134.png`
10. `IMG_2166.jpg`
11. `IMG_2207.jpg`

Implementation will copy optimized feed-ready images into:

- `public/assets/explore-feed`

Use all 11 images in the feed.

## Implementation Scope

1. Add Explore feed data
   - image path
   - author
   - time label
   - title
   - short room description
   - reaction counts
   - comment count
   - one representative comment
   - room size and budget metadata

2. Replace Explore empty state
   - render a vertical list of feed cards when `activeSegment === 'explore'`
   - preserve Product and Room sheet behavior

3. Add Explore card components in `CatalogSheet.tsx`
   - `ExploreFeed`
   - `ExploreFeedCard`
   - `ExploreReactionBar`
   - icon components with explicit wrapper/artwork sizing

4. Validate
   - `pnpm typecheck`
   - `pnpm build`
   - Playwright screenshot for `Explore` tab
   - DOM/style spot checks:
     - active Explore tab
     - image card radius and dimensions
     - reaction icon wrapper size `24 x 24`
     - icon inner artwork box size where applicable

## Risks

- The local images are large. They should be resized/compressed before serving in feed cards.
- The screenshot shows a full editor frame, but this implementation should fit the existing app shell and bottom sheet rather than duplicating top navigation.
- No existing `personalized feed` component was found in this repo, so the reaction bar will be implemented directly from the Figma structure and made reusable inside `CatalogSheet.tsx`.

