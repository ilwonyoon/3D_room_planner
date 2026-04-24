# White Modern Home Office Asset Plan

Date: 2026-04-24

## Current Default Room Upgrade

The default home office scene now uses existing high-quality manual assets before starting another download batch:

- Desk: `designconnected-dita-desk-with-drawer-10712` with a warm-white runtime material tuning
- Work chair: `vitra-mikado-armchair-5-star-base-9343625`
- Desk lamp: `designconnected-quille-desk-lamp-8203`
- Desktop detail: `muuto-arrange-dekstop-series-878326222384693`, procedural slim monitor, procedural open laptop
- File pedestal: `dimensiva-next-desk-body-by-mobimex`
- Reading lamp: `dimensiva-hello-floor-lamp-by-normann-copenhagen`
- Reading chair: `dimensiva-oyster-light-armchair-by-i4marini`
- Table decor: `dimensiva-lotus-vase-by-101-copenhagen`, `dimensiva-stop-bookend-by-e15`

Visual QA notes:

- The room reads cleaner and more office-specific than the previous Poly Haven desk/chair setup.
- The warm-white Dita desk, white Mikado task chair, white file pedestal, Muuto stacked storage, and sculptural reading chair are the strongest current improvements.
- `dimensiva-wire-basket-by-ferm-living` was tested but removed from the default layout because it reads as visual clutter at the current camera scale.
- The former dark/brown shelving mismatch has been replaced with Muuto Stacked storage, and the wire chair has been replaced with a downloaded Vitra 5-star task-chair model. The remaining weak point is now the lack of downloaded electronics models; monitor and laptop are currently procedural because the available download sources did not expose a clean usable laptop/monitor candidate.

## Download Attempts

- `dimensiva-eur-modular-kids-bookcase-by-magis`: downloaded and converted successfully, but rejected for this room. The thumbnail reads as orange kids furniture rather than white/light-oak modern office storage, so it should remain a raw candidate only and not be exposed in the app catalog.
- `muuto-stacked-storage-system-324705387045373`: downloaded from Muuto's official digital showroom, converted from OBJ, thumbnailed, exposed in the storage catalog, and promoted into the default room as the replacement for the dark Poly Haven shelving.
- `muuto-compile-shelving-system-744664385479914`, `muuto-mini-stacked-storage-system-319877859001690`, and `muuto-stacked-storage-system-690014956308565`: downloaded and converted for comparison, but not exposed. The selected OBJ variants were either too minimal, too small, or not the right visible shelf configuration for this default room.
- Muuto desk/table batch: downloaded 12 table-oriented candidates (`70/70`, `Base`, `Base High`, `Airy`, `Around`, `Couple`, `Earnest`, `Beam`, and the already-used `Arrange`). These are useful raw references, but they are dining, meeting, coffee-table, or lamp/accessory models rather than a better residential writing desk for the current room, so they were not exposed in the app catalog.
- `designconnected-dita-desk-with-drawer-10712`: promoted from existing manual assets into the default room as the desk replacement. It reads more residential and compact than the Vitra Scout Work desk, and the scene applies a warm-white material tuning so it stays aligned with the white modern home office direction.
- Vitra task-chair batch: downloaded 30 official Vitra GLB candidates with a chair/work filter. `ACX Pad High` and `ACX Softknit High` were converted for comparison but rejected because each GLB contains multiple chair variants as one model. `vitra-mikado-armchair-5-star-base-9343625` was converted, thumbnailed, exposed in the chair catalog, and promoted into the default room.

## Next Download Priorities

1. Downloaded laptop or monitor models
   - Target: 2 to 4 models.
   - Need: single-object laptop, monitor, keyboard, and small desk speaker with complete metadata.
   - Reason: the room now has procedural electronics, but downloaded models would improve close-up realism.

2. Better white office desks
   - Target: 3 models.
   - Need: rectangular desk with white top, desk with integrated drawer, softer residential writing desk.
   - Reason: Dita is the current best fit, but a purpose-made white work desk with cleaner tabletop geometry would still be stronger.

3. Light task chairs
   - Target: 3 to 5 models.
   - Need: white, pale grey, or mesh task chairs with office ergonomics.
   - Reason: Mikado is a strong current fit, but a single-object mesh ergonomic chair would make the office read more professional.

4. Window treatment and soft goods
   - Target: 2 to 4 models or procedural assets.
   - Need: sheer curtain, roller blind, woven rug variants.
   - Reason: the room needs softer residential cues beyond hard furniture.

5. Desk accessories
   - Target: 8 to 12 small models.
   - Need: laptop, monitor, notebook stack, pen cup, books, tray, small clock, minimal plant.
   - Reason: small objects make the scene feel used without adding large visual weight.

## Source Order

Use this order for the next batch:

1. Chocofur free/CC0 if a usable modern shelf, desk, chair, or decor model is available.
2. Design Connected freebies for office desks, desk lamps, shelves, and small decor.
3. Dimensiva free models for storage, chairs, and modern decor.
4. Muuto and Vitra only as personal-local intake unless redistribution is reviewed again.
5. 3dsky manufacturer-free models only when product/source/license metadata is complete.

## Acceptance Bar

Every new home-office asset should pass:

- White, light grey, natural oak, chrome, or restrained black material fit.
- Clear office or residential office use.
- Thumbnail is readable at current mobile camera scale.
- Bounds are plausible after runtime normalization.
- Source URL, license URL, brand, product name, category, dimensions, and redistribution status are captured.
- `pnpm typecheck` and `pnpm build` pass after catalog/default-room integration.
