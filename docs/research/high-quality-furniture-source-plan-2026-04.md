# High-Quality Furniture Source Plan

Research date: 2026-04-23

## Goal

Expand the room planner from a small curated furniture set into a much larger catalog of photorealistic, modern interior assets. The target look is contemporary residential furniture: simple silhouettes, white or neutral upholstery, clean wood, matte metal, and real branded product names where the source or catalog alias supports it.

The key distinction for this project is:

- Free to download does not automatically mean safe to redistribute inside this app.
- Brand CAD/BIM libraries are valuable for realistic product shapes, but they usually need a stricter license check before bundling converted GLBs.
- For runtime shipping, every accepted asset must pass license capture, conversion, optimization, thumbnail QA, scale QA, and catalog naming.

Personal portfolio mode: this project is currently intended for personal portfolio use, not resale or public asset redistribution. For that workflow, candidates can use `redistributionStatus: "personal-local"` and still enter the local pipeline. If the app is later deployed publicly, sold, or packaged with downloadable assets, promote those rows to `approved` only after license review.

## Current App Intake State

- Runtime model format: optimized `.glb` under `public/assets/models/**`.
- Raw source assets: `raw/assets/models/{source}/{assetId}`.
- Catalog surface: `src/constants/productCatalog.ts`.
- Existing scripts:
  - `pnpm assets:fetch`
  - `pnpm assets:prepare`
  - `pnpm assets:thumbs`
  - `pnpm assets:audit-render`
  - `pnpm typecheck`
  - `pnpm build`
- Available converter: `node_modules/fbx2gltf/bin/Darwin/FBX2glTF`.
- Available converters: `node_modules/fbx2gltf/bin/Darwin/FBX2glTF` and `obj2gltf`.
- Missing local converters: Blender and Assimp. This still blocks clean automation for `.blend`, `.skp`, `.max`, `.3ds`, `.dwg`, and Revit unless the source also provides FBX, OBJ, glTF, or GLB.

## Source Triage

| Source | Fit | Download reality | App bundling decision |
| --- | --- | --- | --- |
| Design Connected Freebies | High-quality archviz furniture, many real brand/product names; good for modern chairs, sofas, tables, decor | Account/cart workflow; formats commonly include MAX, SKP, OBJ, FBX depending on item | Priority manual intake. Use only after confirming item license permits app embedding; prefer FBX/OBJ packages with complete texture folders. |
| Dimensiva Free 3D Models | Strong brand/product-name coverage, modern design furniture, many useful free items | Registered member account required; free items are downloadable without paid subscription | Priority manual intake, but do not redistribute raw/converted model files as standalone assets. License says content cannot be sold/distributed/redistributed separately. App embedding needs conservative packaging and attribution notes. |
| 3dsky free models | Huge archviz pool; useful for manufacturer-uploaded freebies and modern furniture gaps | Login; free manufacturer models have a daily free download limit | Manual review only. Prefer models explicitly marked free from manufacturer with source, dimensions, manufacturer, and product name. Avoid unknown uploader assets unless license is clear. |
| Zeel Project | Strong brand furniture library, modern filters, many FBX/OBJ/MAX product pages | Credit/account flow; some pages show daily free credits | Manual review. License allows use within creations but raw model redistribution is risky. Treat as app-embedding candidate only after exact model terms are stored. |
| Chocofur Free Products | Best legal fit among non-public-domain commercial-looking libraries when item is explicitly Free Chocofur Product | Free products may be Blender-native; exact formats vary | High priority if CC0 status is visible per item. Needs Blender installed if only `.blend` is supplied; otherwise use FBX/OBJ if available. |
| Herman Miller product models | Excellent real-brand office/lounge furniture; Revit, SketchUp, AutoCAD | Official product model library with many categories and file filters | Use as brand-reference and staging source first. Do not bundle converted files until Herman Miller terms explicitly allow runtime app embedding. |
| Vitra downloads | Excellent modern/classic design furniture; official professional download area | Public GLB ZIP downloads can be requested through the Vitra downloads API after a web session is established | Implemented as personal-local intake for GLB models. Treat "Virta" request as likely "Vitra" unless a separate Virta furniture source is identified. |
| Muuto 2D/3D/Revit files | Very strong fit for simple modern Scandinavian furniture and storage | Official digital showroom exposes ZIP packages with OBJ/SKP/DWG/3DS assets | Implemented as personal-local OBJ intake. Some official archives have missing/mismatched MTL texture references, so QA needs visual review. |
| BIMobject / manufacturer CAD libraries | Good breadth for real branded assets | Often Revit/SKP/DWG, sometimes FBX/OBJ | Research lane, not automated shipping lane. Useful for discovering brands and exact product names. |
| SketchUp 3D Warehouse | Huge quantity, inconsistent quality | SKP-heavy | Low priority for shipping unless model is official manufacturer content and can be exported cleanly with license. |
| Reddit lists | Useful lead discovery | Not authoritative license sources | Keep as lead index only; always verify official source/license. |

## Candidate Categories And Priorities

1. Beds and bedroom
   - Already started with Objaverse CC-BY bed pass.
   - Next candidates: Design Connected free beds/nightstands, Dimensiva free beds/nightstands, Zeel free bed category.
   - Target: +8 to +12 beds, +10 nightstands/dressers.

2. Sofas and lounge chairs
   - Highest visual payoff for modern interiors.
   - Candidate sources: Design Connected, Dimensiva, Muuto staging, Herman Miller staging, 3dsky free manufacturer models.
   - Target: +12 sofas, +16 lounge/accent chairs.

3. Dining and office chairs
   - Candidate sources: Design Connected, Dimensiva, Muuto, Vitra staging, Chocofur free if CC0.
   - Target: +20 chairs with neutral material variants.

4. Tables
   - Coffee, side, dining, desk.
   - Candidate sources: Design Connected, Dimensiva, Muuto, Zeel, 3dsky free manufacturer models.
   - Target: +20 tables.

5. Storage
   - White sideboards, wardrobes, modular shelving, cabinets.
   - Candidate sources: Muuto Stacked/Compile references, Dimensiva, Design Connected, Zeel, 3dsky.
   - Target: +15 to +20 storage items.

6. Lighting, rugs, mirrors, plants, decor
   - Needed to make scenes feel realistic without only adding large furniture.
   - Candidate sources: Design Connected, Dimensiva, Chocofur CC0, Poly Haven, manufacturer sites.
   - Target: +40 to +60 decor objects.

## Intake Manifest Fields

Every candidate should enter the pipeline with a manifest row before downloading or conversion:

```json
{
  "assetId": "source-product-slug",
  "source": "designconnected",
  "sourceUrl": "https://...",
  "downloadUrl": "manual",
  "licenseUrl": "https://...",
  "licenseType": "manual-review",
  "author": "Design Connected",
  "brand": "HAY",
  "productName": "Hackney Sofa",
  "category": "sofa",
  "styleTags": ["modern", "neutral", "minimal"],
  "preferredFormat": "fbx",
  "fallbackFormats": ["obj", "skp", "max"],
  "dimensionsCm": [250, 95, 75],
  "redistributionStatus": "personal-local",
  "notes": "Freebie page; personal portfolio use. Re-check before public distribution."
}
```

## Conversion Rules

| Source format | Current path | Action |
| --- | --- | --- |
| GLB / glTF | Ready | Copy to raw source folder, run `assets:prepare`, run thumbnail render and audit. |
| FBX | Ready | Convert with local `FBX2glTF`, optimize with glTF-Transform, then QA. |
| OBJ | Ready for geometry-first intake | Convert with `obj2gltf`, using the original package path so relative `.mtl`/texture references survive where the archive is valid. Visual QA is still required because some OBJ packages reference missing material files. |
| Blend | Blocked | Install Blender CLI, export to GLB, then optimize. |
| SKP | Blocked | Prefer official FBX/OBJ alternative; otherwise requires SketchUp/Blender import path. |
| MAX | Blocked | Avoid unless source also provides FBX/OBJ. |
| 3DS / DWG / Revit | Blocked/manual | Use only as research/staging until a reliable conversion path is added. |

## Quality Bar

Accept only assets that pass all of these:

- License captured with source URL, license URL, author/source, brand, product name, and redistribution status.
- Realistic geometry and PBR/material detail. No game-style low-poly models.
- Modern residential fit: simple, neutral, white, grey, natural wood, black metal, or subtle fabric/leather.
- Runtime GLB under the app size budget after texture cap and Meshopt optimization.
- Thumbnail is not black, blank, overcropped, or visually misleading.
- Bounds and dimensions are plausible in room scale.
- Product card shows a brand/product-like name, not a file slug.
- Source attribution is added to `public/assets/ASSET_SOURCES.md`.

## Execution Plan

### Phase A: Source Ledger

Create `docs/research/high-quality-furniture-source-plan-2026-04.md` as the living source ledger and keep all official links, license notes, and download blockers in one place.

### Phase B: Manual Intake Folder

Add a manual drop workflow:

- `raw/inbox/{source}/{assetId}/`
- `raw/inbox/{source}/{assetId}/manifest.json`
- source archive or extracted source files beside the manifest

The importer should reject candidates missing `sourceUrl`, `licenseUrl`, `brand`, `productName`, `category`, `dimensionsCm`, or `redistributionStatus`. Accepted statuses are `approved` and `personal-local`; `review-required` needs the explicit `ASSET_IMPORT_ALLOW_REVIEW_REQUIRED=1` staging override.

### Phase C: Import Script

Add `scripts/import-manual-assets.mjs` to normalize accepted manual downloads into `raw/assets/models/manual/{assetId}`. It should:

- Validate the manifest.
- Choose the best available format in order: GLB, glTF, FBX, OBJ.
- Convert FBX to GLB through `FBX2glTF`.
- Write source metadata next to the raw asset.
- Emit a catalog-ready JSON summary for accepted candidates.

Implemented command:

```bash
pnpm assets:import-manual
ASSET_PREPARE_SCOPE=manual pnpm assets:prepare
```

### Phase D: Candidate Batch 1

Start with sources most likely to pass quality:

1. Chocofur explicitly free/CC0 products with FBX/OBJ/GLB, or install Blender for `.blend`.
2. Design Connected recent freebies with FBX/OBJ.
3. Dimensiva free items with strong modern product fit.
4. Zeel free-credit products only after a license note is attached.
5. 3dsky manufacturer-free models with full manufacturer/product metadata.

### Phase E: Brand Staging

Stage Herman Miller, Vitra, and Muuto separately as `redistributionStatus: review-required`.

Do not ship these converted assets in `public/assets/models` until terms explicitly allow app embedding and redistribution in compiled/runtime form. They can still be used to improve product naming, dimensions, and visual target references.

### Phase F: QA And Catalog Merge

For every accepted batch:

1. Run conversion/optimization.
2. Run thumbnail generation.
3. Run render audit.
4. Add product aliases and category dimensions.
5. Run `pnpm typecheck`.
6. Run `pnpm build`.
7. Browser-check each affected catalog category.

## Import Status - 2026-04-23

- Dimensiva: 41 free candidates downloaded, imported, converted to runtime GLB, thumbnailed, and exposed through `manualProductCatalog.generated.ts`.
- Design Connected: login-assisted freebie flow confirmed. 82 relevant candidates were staged, 81 produced FBX/OBJ locally, and 79 converted to runtime GLB plus thumbnails. A metadata refresh pass now replaces bad `Quick View` card labels with detail-page brand/designer/product names.
- 3dsky: manufacturer-free bed intake is now wired through `scripts/download-3dsky-free-assets.mjs`. Two bed packages from mebelrika were downloaded; `Cherry Single Bed for Children and Teens` converted, optimized, thumbnailed, and exposed in the app. `Olivia bed with lifting mechanism` shipped a zero-byte OBJ, and `Oscar sofa bed with roll-out drawer` returned a secure download URL whose archive fetch resolved to 404.
- Muuto: 12 official digital showroom candidates attempted; 11 OBJ packages downloaded, converted through `obj2gltf`, optimized, thumbnailed, and exposed. `muuto-ambit-pendant-943052121460012` failed ZIP extraction because of filename encoding.
- Vitra: 10 official GLB packages downloaded through the downloads API, optimized, thumbnailed, and exposed.
- App catalog: 142 manual models are now exposed under `models/manual/*.optimized.glb` with real source brand/product names.
- Runtime category expansion: 1 sofa, 2 beds, 19 chairs, 40 tables, 4 storage pieces, 26 decor pieces, and 50 lighting pieces.
- Blocked/failed rows: `designconnected-fuwl-cage-table-8851` did not generate a download after repeated logged-in attempts; `designconnected-rosa-rosa-rosas-wall-light-9791` and `designconnected-shaker-vases-set-9478` exceeded the FBX conversion timeout and remain in raw failure logs; `3dsky-om-oficial-model-krovat-olivia-odnospalnaia-dlia-detei-i-podrostkov` shipped a zero-byte OBJ; `3dsky-om-oficial-model-krovat-divan-oskar-s-vykatnym-iashchikom` exposed a secure download URL but the archive fetch returned 404; several Muuto OBJ packages converted with default materials because their official archives reference missing or mismatched `.mtl`/texture paths.

## Immediate Next Batch

The first practical batch should be manual but small enough to validate the pipeline:

- 3 to 5 modern sofas.
- 3 to 5 beds/nightstands.
- 5 modern chairs.
- 3 storage/cabinet pieces.
- 5 decor/lighting pieces.

Recommended source order:

1. 3dsky free manufacturer models: requires browser login; use the daily limit for verified manufacturer entries and prefer GLB/FBX/OBJ.
2. Zeel: currently blocked by browser verification/account flow; use only if the license note supports app embedding.
3. Chocofur free/CC0: static store pages did not expose direct model archives; use manually after finding explicit free product downloads, or install Blender first for `.blend`.
4. Herman Miller/MillerKnoll official libraries: strong product naming and shapes, but many files are Revit/SKP/DWG and need a converter or manual export path.
5. Continue Muuto/Vitra in curated batches, but visually QA Muuto material quality because OBJ archives can be inconsistent.

## Source Links

- Reddit lead: IndustrialDesign free furniture models: https://www.reddit.com/r/IndustrialDesign/comments/dwaqmh/websites_that_provide_free_furniture_3d_models/
- Reddit lead: archviz furniture brands with free 3D models: https://www.reddit.com/r/archviz/comments/1hm0o08/furniture_brands_that_provide_free_3d_models/
- Reddit lead: SketchUp high-quality plants/furniture/textures: https://www.reddit.com/r/Sketchup/comments/1n8hu6y/where_to_get_free_high_quality_3d_models_plants/
- Design Connected Freebies: https://www.designconnected.com/freebies
- Design Connected FAQ: https://www.designconnected.com/faq
- Dimensiva Free 3D Models: https://dimensiva.com/free-3d-models/
- Dimensiva License: https://dimensiva.com/license/
- Dimensiva User Terms: https://dimensiva.com/user-terms/
- 3dsky free manufacturer model rules: https://3dsky.org/faq/163/show
- 3dsky: https://3dsky.org/
- Zeel Project models: https://zeelproject.com/3d-models/
- Zeel Project license: https://zeelproject.com/legal/3d-model-license/
- Chocofur license: https://academy.chocofur.com/p/chocofur-license-agreement
- Herman Miller 3D models and planning tools: https://www.hermanmiller.com/resources/3d-models-and-planning-tools/
- Herman Miller product models: https://www.hermanmiller.com/resources/3d-models-and-planning-tools/product-models/
- Vitra downloads: https://www.vitra.com/en-us/professionals/downloads
- Muuto 2D, 3D and Revit files: https://professionals.muuto.com/toolbox/product-information/download-AD-files/
- Muuto pCon FAQ: https://professionals.muuto.com/faq/files--planning/pcon/
