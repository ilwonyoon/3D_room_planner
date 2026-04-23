# Asset Sources

- `../basis/basis_transcoder.{js,wasm}`
  - Source: Three.js r184 Basis Universal transcoder files
  - License: MIT
  - https://github.com/mrdoob/three.js/tree/r184/examples/jsm/libs/basis
  - Runtime use: `KTX2Loader` transcoding for GLB files using `KHR_texture_basisu`

- `textures-runtime/wood-floor-051/*`
  - Source: ambientCG WoodFloor051
  - License: CC0 / Public Domain
  - https://ambientcg.com/view?id=WoodFloor051

- `textures-runtime/painted-plaster-017/*`
  - Source: ambientCG PaintedPlaster017
  - License: CC0 / Public Domain
  - https://ambientcg.com/view?id=PaintedPlaster017

- `textures-runtime/walls/{assetId}/*`
  - Source: ambientCG PBR wall and wallpaper materials
  - License: CC0 / Public Domain
  - Source URL pattern: `https://ambientcg.com/view?id={assetId}`
  - Runtime format: 1K JPG material maps copied into per-material folders
  - Included wall material assets: `Wallpaper001A`, `Wallpaper002A`, `Wallpaper001B`, `Wallpaper001C`, `Wallpaper002B`, `Wallpaper002C`, `Plaster001`, `Plaster002`, `Plaster003`, `Plaster007`

- `textures-runtime/floors/{assetId}/*`
  - Source: ambientCG PBR floor materials
  - License: CC0 / Public Domain
  - Source URL pattern: `https://ambientcg.com/view?id={assetId}`
  - Runtime format: 1K JPG material maps copied into per-material folders
  - Included floor material assets: `WoodFloor051`, `WoodFloor064`, `Concrete048`, `Concrete047A`, `Carpet016`, `WoodFloor070`, `WoodFloor071`, `WoodFloor069`, `WoodFloor007`, `WoodFloor062`

- `models/sheen-chair.optimized.glb`
  - Source: Khronos glTF Sample Models, SheenChair
  - License: see KhronosGroup/glTF-Sample-Models repository
  - https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/SheenChair

- `models/sheen-wood-leather-sofa.optimized.glb`
  - Source: Khronos glTF Sample Assets, SheenWoodLeatherSofa
  - License: CC-BY 4.0
  - https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenWoodLeatherSofa

- `hdri/poly_haven_studio_1k.hdr`
  - Source: Poly Haven, poly_haven_studio
  - License: CC0 / Public Domain
  - https://polyhaven.com/a/poly_haven_studio

- `models/polyhaven/*.optimized.glb`
  - Source: Poly Haven public API, 1K glTF model packages
  - License: CC0 / Public Domain
  - Source URL pattern: `https://polyhaven.com/a/{assetId}`
  - Runtime format: glTF-Transform optimized `.glb` with Meshopt, WebP textures, and 1024px texture cap
  - Source of truth: `scripts/fetch-assets.mjs`
  - Included room-planner assets:
    - Seating: `ArmChair_01`, `BarberShopChair_01`, `GreenChair_01`, `Ottoman_01`, `Rockingchair_01`, `SchoolChair_01`, `Sofa_01`, `WoodenChair_01`, `bar_chair_round_01`, `chinese_armchair`, `chinese_sofa`, `chinese_stool`, `dining_chair_02`, `folding_wooden_stool`, `gallinera_chair`, `metal_stool_01`, `metal_stool_02`, `mid_century_lounge_chair`, `modern_arm_chair_01`, `outdoor_table_chair_set_01`, `painted_wooden_bench`, `painted_wooden_chair_01`, `painted_wooden_chair_02`, `painted_wooden_sofa`, `painted_wooden_stool`, `plastic_monobloc_chair_01`, `sofa_02`, `sofa_03`, `wooden_picnic_table`, `wooden_stool_01`, `wooden_stool_02`
    - Tables and desks: `ClassicConsole_01`, `ClassicNightstand_01`, `CoffeeTable_01`, `SchoolDesk_01`, `WoodenTable_01`, `WoodenTable_02`, `WoodenTable_03`, `chinese_console_table`, `chinese_tea_table`, `coffee_table_round_01`, `gallinera_table`, `gothic_coffee_table`, `industrial_coffee_table`, `metal_office_desk`, `modern_coffee_table_01`, `modern_coffee_table_02`, `painted_wooden_nightstand`, `painted_wooden_table`, `round_wooden_table_01`, `round_wooden_table_02`, `side_table_01`, `side_table_tall_01`, `small_wooden_table_01`, `vintage_wooden_drawer_01`, `wooden_table_02`
    - Storage: `GothicCabinet_01`, `GothicCommode_01`, `Shelf_01`, `chinese_cabinet`, `chinese_commode`, `drawer_cabinet`, `modern_wooden_cabinet`, `painted_wooden_cabinet`, `painted_wooden_cabinet_02`, `painted_wooden_shelves`, `steel_frame_shelves_01`, `steel_frame_shelves_02`, `steel_frame_shelves_03`, `vintage_cabinet_01`, `wooden_bookshelf_worn`, `wooden_display_shelves_01`
    - Lighting, decor, plants: `caged_hanging_light`, `desk_lamp_arm_01`, `hanging_industrial_lamp`, `industrial_pipe_lamp`, `industrial_wall_lamp`, `industrial_wall_sconce`, `modern_ceiling_lamp_01`, `ornate_mirror_01`, `potted_plant_01`, `potted_plant_02`, `potted_plant_04`
    - Environment additions: `fancy_picture_frame_01`, `fancy_picture_frame_02`, `hanging_picture_frame_01`, `hanging_picture_frame_02`, `hanging_picture_frame_03`, `standing_picture_frame_01`, `standing_picture_frame_02`, `vintage_telephone_wall_clock`, `mantel_clock_01`, `alarm_clock_01`, `book_encyclopedia_set_01`, `ceramic_vase_01`, `ceramic_vase_02`, `ceramic_vase_03`, `ceramic_vase_04`, `brass_vase_01`, `brass_vase_02`, `brass_vase_03`, `brass_vase_04`, `planter_box_01`, `planter_box_02`, `planter_box_03`, `planter_pot_clay`, `pachira_aquatica_01`, `dartboard`, `large_castle_door`, `rollershutter_door`, `rollershutter_window_01`, `rollershutter_window_02`, `rollershutter_window_03`
  - Expansion additions: `CoffeeCart_01`, `chinese_screen_panels`

- `models/sharetextures/*.optimized.glb`
  - Source: ShareTextures furniture models
  - License: CC0 / Public Domain
  - Source URL pattern: `https://www.sharetextures.com/models/furniture/{slug}`
  - Runtime format: 1K texture FBX converted to `.glb` with `fbx2gltf`, then glTF-Transform optimized with Meshopt and WebP textures
  - Source of truth: `scripts/fetch-assets.mjs` and `scripts/prepare-assets.mjs`
  - Included modern furniture expansion assets:
    - Seating: `sharetextures-bench-32`, `sharetextures-chair-25`, `sharetextures-chair-26`, `sharetextures-chair-27`, `sharetextures-chair-28`, `sharetextures-chair-29`, `sharetextures-stool-5`, `sharetextures-stool-7`, `sharetextures-stool-8`
    - Storage: `sharetextures-cabinet-3`
  - Excluded after conversion QA: `stool-6`; its FBX converts, but the resulting GLB fails glTF-Transform validation/optimization.

- `models/objaverse/*.optimized.glb`
  - Source: Objaverse 1.0 direct GLB objects mirrored on Hugging Face, with original Sketchfab source metadata retained in `raw/assets/models/objaverse/{assetId}/source.json`
  - License: CC-BY-4.0; attribution required to the original listed author
  - Dataset: https://huggingface.co/datasets/allenai/objaverse
  - Runtime format: source `.glb` re-optimized with glTF-Transform, Meshopt compression, WebP textures, and a 1024px texture cap
  - Included modern bed expansion assets:
    - `objaverse-messy-bed-2`: "Messy bed 2.0 (with wall mounted backboard)" by thethieme, https://sketchfab.com/3d-models/a2b2645701c94fa49e65661806219c6b
    - `objaverse-soho-bed`: "Soho bed - 3D Model" by BertO, https://sketchfab.com/3d-models/97e361e8beda4112ac5b1b5bcd388cdf
    - `objaverse-chelsea-storage-bed`: "Chelsea bed with storage - 3D Model" by BertO, https://sketchfab.com/3d-models/cbe6e0dcc10a414a84acc5cc08171b87
    - `objaverse-bed-0101`: "bed.0101" by Elo.Q..Pereira, https://sketchfab.com/3d-models/5633ff2f729142bebf6b304118647f6f
    - `objaverse-king-floor-bed`: "King Floor Bed" by Jakoza, https://sketchfab.com/3d-models/6ee7831cc521471384191baea365e211
    - `objaverse-large-grantham-bed`: "Large Bed - Grantham Dantone Bed" by Lahcen.el, https://sketchfab.com/3d-models/203cfdb977ef4caab19d3b35fd8b3c42

- `models/manual/*.optimized.glb`
  - Source: manually imported high-quality free furniture/decor model packages.
  - Runtime format: downloaded source GLB/GLTF packages optimized directly; FBX packages converted with `fbx2gltf`; OBJ packages converted with `obj2gltf`; then glTF-Transform optimized with Meshopt and WebP textures.
  - Source of truth: `raw/assets/models/manual/catalog-candidates.json`, `src/constants/manualProductCatalog.generated.ts`, `scripts/download-dimensiva-free-assets.mjs`, `scripts/download-designconnected-free-assets.mjs`, `scripts/download-muuto-3d-assets.mjs`, `scripts/download-3dsky-free-assets.mjs`, `scripts/download-vitra-glb-assets.mjs`, `scripts/update-designconnected-metadata.mjs`, `scripts/generate-manual-product-catalog.mjs`, and `scripts/import-manual-assets.mjs`.
  - Included runtime assets: 142 manual models; 41 from Dimensiva, 79 from Design Connected, 11 from Muuto, 10 from Vitra, and 1 from 3dsky.
  - Dimensiva source: https://dimensiva.com/free-3d-models/
  - Dimensiva license reference: https://dimensiva.com/license/
  - Design Connected source: https://www.designconnected.com/freebies
  - Design Connected model FAQ reference: https://www.designconnected.com/faq
  - 3dsky source: https://3dsky.org/
  - 3dsky free manufacturer model rules: https://3dsky.org/faq/163/show
  - Muuto source: https://download.muuto.com/digitalshowroom/#/gallery/3D-files
  - Vitra source: https://downloads.vitra.com/#/media?media_category_media_type=root.cad.glb.
  - QA exclusions: `designconnected-fuwl-cage-table-8851` did not produce a download after repeated logged-in attempts; `designconnected-rosa-rosa-rosas-wall-light-9791` and `designconnected-shaker-vases-set-9478` timed out in FBX conversion and are retained only in raw/import failure logs; `muuto-ambit-pendant-943052121460012` failed archive extraction because of ZIP filename encoding; `3dsky-om-oficial-model-krovat-olivia-odnospalnaia-dlia-detei-i-podrostkov` shipped a zero-byte OBJ; `3dsky-om-oficial-model-krovat-divan-oskar-s-vykatnym-iashchikom` exposed a download URL but the secure archive returned 404 during fetch.
  - QA notes: several Muuto OBJ packages reference missing or mismatched `.mtl`/texture filenames in the official archive; those models were converted as geometry-first GLBs and may use default materials.
  - Category additions exposed in product catalog: 1 sofa, 2 beds, 19 chairs, 40 tables, 4 storage pieces, 26 decor pieces, and 50 lighting pieces.

- `models-ktx2/**/*.optimized.glb`
  - Source: matching source model from `models/**`
  - License: same as the source model
  - Runtime format: opt-in glTF-Transform KTX2/BasisU variant with Meshopt
  - Source of truth: `pnpm assets:prepare:ktx2` with optional `ASSET_PREPARE_SCOPE` and `ASSET_MODEL_FILTER`
  - Current runtime candidates: `sheen-chair`, `modern_arm_chair_01`, `CoffeeTable_01`, `side_table_01`, `hanging_picture_frame_01`, `hanging_picture_frame_02`, `potted_plant_04`
  - QA note: `sheen-wood-leather-sofa` is intentionally excluded from KTX2 runtime use because its source textures are already WebP and glTF-Transform cannot convert that path to `KHR_texture_basisu`.

- `models/architectural/*.optimized.glb`
  - Source: Pocketroom procedural architectural assets
  - License: Project-owned generated geometry
  - Runtime format: generated `.glb` from `scripts/generate-architectural-assets.mjs`, then glTF-Transform optimized with Meshopt
  - Source of truth: `scripts/generate-architectural-assets.mjs`, `scripts/prepare-assets.mjs`, and `src/constants/environmentCatalog.ts`
  - Included modern window assets: `modern-wide-picture-window`, `modern-sliding-window`, `modern-tall-casement-window`, `modern-square-awning-window`, `modern-transom-window`
  - Included modern door assets: `modern-flush-white-door`, `modern-slim-glass-door`, `modern-sliding-glass-door`, `modern-double-glass-door`, `modern-ribbed-oak-door`
  - Replaces the previously exposed Kenney Building Kit door/window pieces in the Room catalog. Kenney Building Kit runtime assets have been removed from the app asset tree.

- `environment-catalog.json`
  - Runtime manifest for room environment selectors.
  - Categories: wall materials, floor materials, windows, doors, room shell, wall decor, decor.
