# Window Source Intake - 2026-04-23

## Goal

Find higher-quality window sources than the current failed `CGTrader` intake, with emphasis on modern residential windows that can plausibly fit the Pocketroom catalog.

## Confirmed downloaded source packages

### Marvin

- Status: downloaded
- Local package:
  - `output/window-source-intake/marvin/original/Marvin-Design-Files-Zip.zip`
  - `output/window-source-intake/marvin/original/Marvin-Design-Files/marvin-modern-window-library-sketchup.zip`
- Source page:
  - `https://www.marvin.com/products/windows/casement/modern-casement-window`
- Confirmed format:
  - `SketchUp (.skp)`
- Confirmed library contents:
  - `Awning`
  - `Casement`
  - `Direct Glaze`
  - `Corner`
- Volume:
  - 44 `.skp` files in one official manufacturer library

### Pella

- Status: downloaded
- Source page:
  - `https://www.pella.com/professionals/downloads/`
- Local packages:
  - `output/window-source-intake/pella/PellaSKP_Impervia_Casement.zip`
  - `output/window-source-intake/pella/PellaSKP_PellaReserve_Contemporary_Awning.zip`
  - `output/window-source-intake/pella/PellaSKP_PellaReserve_Contemporary_Casement.zip`
- Confirmed format:
  - `SketchUp (.skp)`
- Confirmed files:
  - Impervia Casement: fixed / vent / transom
  - Reserve Contemporary Awning: fixed / vent
  - Reserve Contemporary Casement: fixed / vent

## Practical import rule

For this app, the best sources are:

1. Official manufacturer pages that expose `SketchUp` or other 3D downloads directly.
2. Manufacturer-backed BIM libraries that provide `SketchUp`, `ArchiCAD`, or at least clean `DWG`.
3. BIM portals with strong manufacturer content, used only when the object quality is clearly architectural rather than generic CAD filler.

Low-priority sources:

- game-asset marketplaces
- anonymous free-model dumps
- RFA-only sources unless there is no alternative

## Priority A - best-fit modern sources

### 1) Marvin

- Why: strongest match for modern residential style; narrow-frame contemporary lines; official design-file support.
- Best collections to target:
  - Modern Casement Window
  - Modern Direct Glaze / Picture variants
  - Vivid Casement / Direct Glaze
- Format signal:
  - Marvin lists `DWG`, `DXF`, `SketchUp`, `Revit`, and `ArchiCAD` design files on the product page.
- Import priority: highest
- Notes:
  - This is the cleanest path for minimal white / black-frame modern window families.
  - This source is already secured locally.

### 2) Andersen via BIMobject

- Why: large official catalog, strong residential coverage, multiple clean standard window types.
- Best collections to target:
  - 100 Series Awning Windows
  - 100 Series Casement Windows
  - 100 Series Gliding Windows
  - A-Series / E-Series as available
- Import priority: high
- Notes:
  - Good fallback when Marvin variants are not enough.

### 3) Sierra Pacific Windows via BIMobject

- Why: manufacturer-backed, visually stronger than generic BIM families, includes modern casement/corner options.
- Best collections to target:
  - Casement - Narrow or Wide Sash
  - Awning - Narrow or Wide Sash
  - Corner Window
  - Pushout Casement
- Import priority: high

### 4) Quaker CityLine via ARCAT

- Why: luxury aluminum window line; visually closer to high-end contemporary projects.
- Best products to target:
  - CityLine awning
  - CityLine left/right push-out casement
- Import priority: high
- Notes:
  - ARCAT is free, but format is usually `Revit` / `DWG`, so conversion risk is higher than Marvin.

## Priority B - strong manufacturer pools

### 5) AMSCO Windows & Doors via BIMobject

- Why: already has residential window types that map directly to our catalog slots.
- Best products to target:
  - Hampton Series - Awning Window
  - Hampton Series - Casement Window
  - Hampton Series - Direct Set Picture Windows
  - Hampton Series - Equal Lite Picture Window
  - Hampton Series - Horizontal Slider Windows
- Import priority: medium-high

### 6) Simonton Windows via BIMobject

- Why: broad residential catalog and several replacement/new-construction vinyl windows.
- Best products to target:
  - DaylightMax Vinyl Casement Replacement Window
  - ProFinish Brickmould / Master Vinyl window variants
- Import priority: medium-high

### 7) Reynaers via BIMobject

- Why: strong European aluminum systems, visually clean, modern language.
- Best products to target:
  - SlimLine 68
  - MasterLine 8
  - MasterLine 10
- Import priority: medium
- Notes:
  - Better for premium aluminum / European look than standard U.S. suburban windows.

### 8) GEALAN via BIMobject

- Why: turn-and-tilt and multi-panel European windows; useful to diversify forms beyond U.S. sliders/casements.
- Best products to target:
  - GEALAN-KONTUR fixed glazing / turn-tilt
  - S 9000 two-part window
  - S9000 corner / sublight variants
- Import priority: medium

## Priority C - specialized but valuable

### 9) VELUX / Vario by VELUX

- Why: roof windows and rooflights, not standard wall windows, but high-quality manufacturer content.
- Best use:
  - skylights
  - roof-window category if we add one later
- Format signal:
  - Vario by VELUX states 3D BIM objects are available for `Revit`, `ArchiCAD`, and `SketchUp`, with technical drawings in `PDF` and `DWG`.
- Import priority: medium for future category, low for current wall-window problem

### 10) Bimstore window manufacturers

- Why: manufacturer-approved BIM content, especially useful for UK/European window families.
- Best pools:
  - Keylite Roof Windows
  - Epwin Window Systems
  - Deceuninck
- Import priority: medium-low
- Notes:
  - Better as a secondary pool after Marvin / Andersen / Sierra Pacific / AMSCO.

## Portals worth keeping

### BIMobject

- Best general source pool right now.
- Strength:
  - many official manufacturers
  - broad residential and commercial window coverage
- Risk:
  - exact downloadable format varies per listing
  - some objects are BIM-clean but visually too clinical for the app

### ARCAT

- Good fallback source for free manufacturer BIM.
- Strength:
  - broad manufacturer directory
  - free access
- Risk:
  - often `Revit` / `DWG` first, so conversion cost is higher

### Bimstore

- Good for UK and European systems.
- Strength:
  - manufacturer-approved content
  - explicit “free BIM objects” positioning
- Risk:
  - less aligned with our current minimal modern residential U.S.-leaning room set than Marvin/Andersen/Sierra Pacific

## Recommended next import order

1. Marvin Modern / Vivid
2. Andersen 100 / A-Series
3. Sierra Pacific casement + corner window
4. Quaker CityLine
5. AMSCO Hampton
6. Simonton
7. Reynaers / GEALAN
8. VELUX for a later skylight pass

## Conversion preference

When multiple download formats exist, prefer:

1. `SketchUp`
2. `FBX`
3. `OBJ`
4. `DWG`
5. `Revit`

Reason:

- `SketchUp` / `FBX` / `OBJ` are materially easier to normalize to app-ready `GLB`.
- `DWG` is workable but more brittle.
- `Revit` is last resort.

## Conversion status

- The `SketchUp (.skp) -> GLB` blocker is now cleared on this machine.
- Working path:
  1. use the bundled macOS prebuilt `skp2blender` importer assets at
     `output/tools/skp2blender/macos-arch64/sketchup-importer-macos`
  2. load `sketchup.so` with Homebrew `python3.10`
  3. flatten `SketchUp` faces and instances to runtime geometry
  4. export normalized `GLB` via `trimesh`
- Conversion script:
  - `scripts/convert-skp-window-to-glb.py`

## Converted official window outputs

Generated runtime-ready `GLB` files:

- `output/window-source-intake/converted/marvin-modern-casement-picture.glb`
- `output/window-source-intake/converted/marvin-modern-casement-crank-out.glb`
- `output/window-source-intake/converted/marvin-modern-casement-crank-out-multiw-1h.glb`
- `output/window-source-intake/converted/marvin-modern-awning-crank-out.glb`
- `output/window-source-intake/converted/marvin-modern-awning-crank-out-2h.glb`
- `output/window-source-intake/converted/marvin-modern-direct-glaze-rectangle.glb`
- `output/window-source-intake/converted/pella-impervia-casement-fixed.glb`
- `output/window-source-intake/converted/pella-impervia-casement-vent.glb`
- `output/window-source-intake/converted/pella-impervia-transom.glb`

Each output also has a matching `.stats.json` with extents and material summary.

## Current remaining work

- pick the final 8-window set for the in-app catalog
- copy only the selected runtime `GLB` files into `public/assets/models/architectural`
- wire metadata, dimensions, thumbnails, and catalog entries
- delete non-selected conversion intermediates once the runtime set is finalized
