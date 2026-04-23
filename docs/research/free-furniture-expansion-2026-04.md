# Free Furniture Asset Expansion Research

Research date: 2026-04-22

## Current App Baseline

- Runtime models live under `public/assets/models`.
- Product catalog source is `src/constants/productCatalog.ts`.
- Current product catalog size after the latest quality-bar pass: 129 items.
  - By category: sofa 9, chair 31, table 24, storage 21, decor 30, lighting 7, appliance 0, bed 7.
  - By source: Poly Haven 111, ShareTextures 10, Khronos sample assets 2, Objaverse 6.
- Product placement uses catalog `dimensionsCm` to derive `dimensionsM` and `targetSize`; the renderer recenters each GLB and scales its largest axis to `targetSize`.
- Existing quality bar is mixed: Poly Haven assets are higher-detail CC0 models, while the current catalog uses broad category dimensions. New assets should include explicit approximate dimensions so collision and scale feel intentional.

## Source Tiers

| Source | License | Format | Fit | Decision |
| --- | --- | --- | --- | --- |
| Kenney Furniture Kit | CC0 | GLB, FBX | Simple low-poly game-style coverage | Removed from product catalog and runtime furniture assets; below hyper-realistic quality bar |
| ShareTextures | CC0 | FBX, Blend, texture zips | Recent real-material furniture, useful for simple modern chairs, stools, benches, and grey storage | Integrated as phase 2 |
| Poly Haven | CC0 | glTF packages via API | Higher-detail hero items and decor | Integrated broadly; expose more catalog items before fetching duplicates elsewhere |
| Quaternius Furniture Pack | CC0 | FBX, OBJ, Blend | 23 furniture essentials; stylized but legally clean | Next automated conversion candidate |
| CrazyDrPants Furniture Pack | Custom free license | GLB, FBX, OBJ | 50+ low-poly pieces | Only use after redistribution risk review; license blocks standalone asset-pack redistribution |
| Poly Pizza | CC0 / CC-BY | GLB/FBX per model or bundle | Good for one-off gaps | Manual model-by-model license capture |
| Sketchfab | CC licenses / Free Standard | Many | Huge selection, but API download requires auth and attribution must follow assets | Manual only, prefer CC0/CC-BY, avoid Free Standard for bundled redistribution unless terms are confirmed |
| Objaverse 1.0 | CC licenses | GLB via Hugging Face | Large Sketchfab-derived CC corpus with direct GLB paths and metadata | Integrated for CC-BY bed gap after attribution capture |
| BlenderKit | CC0 / Royalty Free | Blender-native | Good for high-quality furniture | Use CC0 only for distributable bundled app assets; RF is risky for asset-pack-like redistribution |
| CGTrader/TurboSquid/Fab free sections | Per-asset terms | Many | Possible high-quality modern furniture | Manual only; many licenses prohibit repackaging/redistribution |

## Phase 1 Integrated Set

Added two Poly Haven furniture-category gaps:

- `CoffeeCart_01`
- `chinese_screen_panels`

## Phase 2 Integrated Set

Added ShareTextures CC0 furniture models published from September 2025 through January 2026. These are a better fit for the current modern/simple direction than more stylized pack assets because they include real PBR texture sets and neutral grey/wood/metal materials.

- Sofa/seating: `sharetextures-bench-32`
- Chair: `sharetextures-chair-25`, `sharetextures-chair-26`, `sharetextures-chair-27`, `sharetextures-chair-28`, `sharetextures-chair-29`
- Stools: `sharetextures-stool-5`, `sharetextures-stool-7`, `sharetextures-stool-8`
- Storage: `sharetextures-cabinet-3`

Pipeline decisions:

- Download FBX plus 1K texture zips from ShareTextures.
- Recreate the FBX-expected texture folder layout under `raw/assets/models/sharetextures/{assetId}`.
- Convert FBX to GLB with `fbx2gltf`, then optimize with glTF-Transform.
- Skip `stool-6` for now because its converted GLB fails glTF-Transform validation/optimization.

## Phase 3 Integrated Set

Exposed already-downloaded Poly Haven decor and plant assets that had runtime GLBs and thumbnails but were not catalog-visible. This broadens room styling without adding new license risk or conversion work.

- Plants and planters: `pachira_aquatica_01`, `planter_box_01`, `planter_box_02`, `planter_box_03`, `planter_pot_clay`
- Frames and wall decor: `fancy_picture_frame_01`, `fancy_picture_frame_02`, `hanging_picture_frame_01`, `hanging_picture_frame_02`, `hanging_picture_frame_03`, `standing_picture_frame_01`, `standing_picture_frame_02`, `dartboard`
- Tabletop objects: `ceramic_vase_01`, `ceramic_vase_02`, `ceramic_vase_03`, `ceramic_vase_04`, `brass_vase_01`, `brass_vase_02`, `brass_vase_03`, `brass_vase_04`, `book_encyclopedia_set_01`
- Clocks: `alarm_clock_01`, `mantel_clock_01`, `vintage_telephone_wall_clock`

Excluded from product catalog for now:

- `large_castle_door`, `rollershutter_door`, `rollershutter_window_01`, `rollershutter_window_02`, `rollershutter_window_03`: these belong in room settings or architecture, not furniture/decor.

## Phase 4 Integrated Set

Added six Objaverse 1.0 CC-BY bed models to close the largest catalog gap. These were selected from a broader search of bed-related Objaverse annotations, then filtered for direct GLB availability, permissive attribution license, modern bedroom fit, and non-game-like modeling.

- Beds: `objaverse-messy-bed-2`, `objaverse-soho-bed`, `objaverse-chelsea-storage-bed`, `objaverse-bed-0101`, `objaverse-king-floor-bed`, `objaverse-large-grantham-bed`

Pipeline decisions:

- Download direct GLBs from the AllenAI Objaverse Hugging Face dataset paths.
- Store `source.json` per model with original Sketchfab URL, author, author profile, Objaverse UID, and CC-BY-4.0 license.
- Re-optimize every model through glTF-Transform with Meshopt, WebP texture compression, and a 1024px texture cap.
- Expose them under the Bed category with explicit dimensions and retail-style product aliases.
- Excluded during thumbnail QA: `objaverse-bed-agape`, `objaverse-twin-bed`, and `objaverse-bed-version-03` produced black thumbnails after optimization; `objaverse-simple-bed` rendered as duplicated metal-frame beds and did not match the modern residential quality bar.

## How To Grow The Free Pool Much Further

The limiting factor is not asset availability; it is redistribution safety, visual consistency, and automated QA. A scalable expansion pipeline should use three lanes:

1. CC0 automated lane: Poly Haven, ShareTextures, Quaternius, and CC0-only Poly Pizza. These can be fetched, converted, optimized, thumbnailed, and cataloged with low legal overhead.
2. Attribution/manual lane: Sketchfab CC-BY or selected artist packs. These need source URL, author, license, attribution text, and per-model review before bundling.
3. Non-bundled marketplace lane: BlenderKit Royalty Free, CGTrader/Fab/Free3D free sections, and manufacturer CAD assets. These can inform styling or be used only if the exact license permits redistribution inside this app.

Detailed high-quality source ledger and manual intake plan: `docs/research/high-quality-furniture-source-plan-2026-04.md`.

Recommended next batches:

1. Modern hero replacements: white sofa, white lounge chair, white storage cabinet, minimal bed, neutral dining table, simple appliance set.
2. Decor depth: 20 to 40 more vases, books, lamps, framed art, mirrors, plants, and rugs because these make rooms feel furnished without needing many large hero models.
3. Style normalization: material override presets only for high-quality CC0 models that are worth keeping; no Kenney Furniture Kit recoloring.
4. Source automation: add `ASSET_IMPORT_SOURCE=polyhaven|sharetextures|quaternius|polypizza`, then make candidate lists fail if license, model URL, thumbnail, dimensions, or glTF validation is missing.
5. Catalog QA: add scripts that report per-category count, missing thumbnail/model files, file size, triangle count, bounds, and suspicious orientation before a model can ship.

## Next Expansion Plan

1. Audit generated thumbnails and in-scene scale for the 71 new runtime assets.
2. Keep Kenney Furniture Kit excluded from product catalog and runtime furniture assets unless the quality bar changes.
3. Add a material override layer only for high-quality assets that pass model QA.
4. Add a source-specific QA rule for FBX conversions: fail the candidate if `gltf-transform inspect` or thumbnail render fails.
5. Convert Quaternius Furniture Pack only as an experiment; ship none unless visual QA proves it is not game-like.
6. Build a manual-review sheet for Poly Pizza and Sketchfab with required fields: URL, author, license, attribution, format, tris, dimensions, category, reason to include.
7. Add higher-quality hero replacements for the most important categories: white sofa, white/minimal dining chair, modern bed, white storage, simple appliance set.

## Source Links

- ShareTextures: https://www.sharetextures.com/
- ShareTextures furniture example, Chair 26: https://www.sharetextures.com/models/furniture/chair-26
- Objaverse 1.0 API docs: https://objaverse.allenai.org/docs/objaverse-1.0
- Objaverse Hugging Face dataset: https://huggingface.co/datasets/allenai/objaverse
- Poly Haven license: https://polyhaven.com/license
- Poly Haven API: https://polyhaven.com/our-api
- Quaternius Furniture Pack: https://quaternius.com/packs/furniture.html
- CrazyDrPants Free Furniture Pack: https://crazydrpants.itch.io/free-furniture-pack-set-models
- Sketchfab Download API guidelines: https://sketchfab.com/developers/download-api/guidelines
- BlenderKit licenses: https://www.blenderkit.com/docs/licenses/
