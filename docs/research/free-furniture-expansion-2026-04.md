# Free Furniture Asset Expansion Research

Research date: 2026-04-22

## Current App Baseline

- Runtime models live under `public/assets/models`.
- Product catalog source is `src/constants/productCatalog.ts`.
- Product placement uses catalog `dimensionsCm` to derive `dimensionsM` and `targetSize`; the renderer recenters each GLB and scales its largest axis to `targetSize`.
- Existing quality bar is mixed: Poly Haven assets are higher-detail CC0 models, while the current catalog uses broad category dimensions. New assets should include explicit approximate dimensions so collision and scale feel intentional.

## Source Tiers

| Source | License | Format | Fit | Decision |
| --- | --- | --- | --- | --- |
| Kenney Furniture Kit | CC0 | GLB, FBX | Simple, low-poly, broad category coverage | Integrated as phase 1 |
| Poly Haven | CC0 | glTF packages via API | Higher-detail hero items and decor | Keep using; only 4 furniture-category assets were not already present |
| Quaternius Furniture Pack | CC0 | FBX, OBJ, Blend | Small filler pack, useful if we want more stylized low-poly | Next candidate, needs conversion to GLB |
| Poly Pizza | CC0 / CC-BY | GLB/FBX per model or bundle | Good for one-off gaps | Manual model-by-model license capture |
| Sketchfab | CC licenses / Free Standard | Many | Huge selection, but API download requires auth and attribution must follow assets | Manual only, prefer CC0/CC-BY, avoid Free Standard for bundled redistribution unless terms are confirmed |
| BlenderKit | CC0 / Royalty Free | Blender-native | Good for high-quality furniture | Use CC0 only for distributable bundled app assets; RF is risky for asset-pack-like redistribution |
| CGTrader/TurboSquid/Fab free sections | Per-asset terms | Many | Possible high-quality modern furniture | Manual only; many licenses prohibit repackaging/redistribution |

## Phase 1 Integrated Set

Added Kenney Furniture Kit coverage in these app categories:

- Sofa: modern lounge sofas, ottoman sofa, cushion benches
- Chair: modern cushion chairs, desk chair, lounge chairs, bar stools
- Table: desks, side tables, coffee tables, glass tables, round table
- Storage: bookcases, TV cabinets, kitchen base and upper cabinets
- Decor: rugs, plants, pillows, coat rack, room divider
- Lighting: floor/table/wall/ceiling lamps
- Electronics: TV, laptop, monitor, speakers, radio
- Appliances: fridge, microwave, stove, hood, washer/dryer
- Bed: single, double, bunk

Also added two Poly Haven furniture-category gaps:

- `CoffeeCart_01`
- `chinese_screen_panels`

## Next Expansion Plan

1. Audit generated thumbnails and in-scene scale for the 71 new runtime assets.
2. Remove or recolor any Kenney assets that read too saturated for the target modern/simple/white style.
3. Add a material override layer for Kenney models if we want a cohesive white/Japandi catalog without editing source GLBs.
4. Convert Quaternius Furniture Pack to GLB, then only keep assets that fill actual gaps after Kenney.
5. Build a manual-review sheet for Poly Pizza and Sketchfab with required fields: URL, author, license, attribution, format, tris, dimensions, category, reason to include.
6. Add higher-quality hero replacements for the most important categories: white sofa, white/minimal dining chair, modern bed, white storage, simple appliance set.

## Source Links

- Kenney Furniture Kit: https://kenney.nl/assets/furniture-kit
- Poly Haven license: https://polyhaven.com/license
- Poly Haven API: https://polyhaven.com/our-api
- Quaternius Furniture Pack: https://quaternius.com/packs/furniture.html
- Sketchfab Download API guidelines: https://sketchfab.com/developers/download-api/guidelines
- BlenderKit licenses: https://www.blenderkit.com/docs/licenses/
