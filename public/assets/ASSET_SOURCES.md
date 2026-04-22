# Asset Sources

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

- `models/environment/windows/*.optimized.glb`
  - Source: Kenney Building Kit
  - License: CC0 / Public Domain
  - https://kenney.nl/assets/building-kit
  - Runtime format: glTF-Transform optimized `.glb`
  - Included window assets: `wall-window-wide-round-detailed`, `wall-window-square-detailed`, `wall-window-wide-square-detailed`, `wall-window-square`, `wall-window-wide-round`, `wall-window-round-detailed`, `wall-window-wide-square`, `wall-window-round`, `barricade-window-a`, `barricade-window-b`, `barricade-window-c`

- `models/environment/doors/*.optimized.glb`
  - Source: Kenney Building Kit
  - License: CC0 / Public Domain
  - https://kenney.nl/assets/building-kit
  - Runtime format: glTF-Transform optimized `.glb`
  - Included door assets: `door-rotate-square-a`, `door-rotate-square-b`, `door-rotate-square-c`, `door-rotate-square-d`, `door-rotate-round-a`, `door-rotate-round-b`, `door-rotate-round-c`, `door-rotate-round-d`, `wall-doorway-square`, `wall-doorway-round`, `wall-doorway-wide-square`, `wall-doorway-wide-round`, `barricade-doorway-a`, `barricade-doorway-b`, `barricade-doorway-c`

- `models/environment/shell/*.optimized.glb`
  - Source: Kenney Building Kit
  - License: CC0 / Public Domain
  - https://kenney.nl/assets/building-kit
  - Runtime format: glTF-Transform optimized `.glb`
  - Included shell assets: `wall`, `wall-half`, `wall-low`, `wall-corner`, `wall-corner-round`, `floor`, `floor-half`, `floor-quarter`, `border`, `border-high`, `column`, `column-thin`, `column-wide`, `plating`, `plating-wide`, `stairs-open`

- `environment-catalog.json`
  - Runtime manifest for room environment selectors.
  - Categories: wall materials, floor materials, windows, doors, room shell, wall decor, decor.
