# Render Asset Audit

Generated: 2026-04-23T07:00:11.716Z

## Summary

- Models inspected: 192
- GLB transfer size: 72.49 MB
- Estimated texture GPU allocation: 2486.65 MB
- Tiers: 30 light, 134 medium, 28 heavy

## Largest / Riskiest Assets

| Tier | Asset | File | Render vertices | Textures | GPU texture |
| --- | --- | ---: | ---: | ---: | ---: |
| heavy | `/assets/models/polyhaven/industrial_wall_lamp.optimized.glb` | 437.6 KB | 13,164 | 7 | 37.33 MB |
| heavy | `/assets/models/polyhaven/vintage_cabinet_01.optimized.glb` | 582.2 KB | 106,608 | 7 | 37.33 MB |
| heavy | `/assets/models/objaverse/objaverse-bed-0101.optimized.glb` | 3.92 MB | 305,742 | 8 | 34.00 MB |
| heavy | `/assets/models/manual/dimensiva-beyla-shoe-cabinet-by-kave-home.optimized.glb` | 696.9 KB | 132,795 | 6 | 32.00 MB |
| medium | `/assets/models/objaverse/objaverse-messy-bed-2.optimized.glb` | 674.2 KB | 75,561 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/CoffeeCart_01.optimized.glb` | 611.8 KB | 81,240 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/fancy_picture_frame_01.optimized.glb` | 325.2 KB | 1,005 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/fancy_picture_frame_02.optimized.glb` | 636.2 KB | 88,671 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb` | 200.7 KB | 7,575 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/hanging_picture_frame_03.optimized.glb` | 381.6 KB | 63,825 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/modern_arm_chair_01.optimized.glb` | 307.9 KB | 21,087 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/modern_coffee_table_02.optimized.glb` | 466.5 KB | 38,247 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/outdoor_table_chair_set_01.optimized.glb` | 402.7 KB | 28,800 | 6 | 32.00 MB |
| heavy | `/assets/models/polyhaven/pachira_aquatica_01.optimized.glb` | 757.3 KB | 144,426 | 6 | 32.00 MB |
| heavy | `/assets/models/polyhaven/potted_plant_01.optimized.glb` | 1.55 MB | 461,283 | 6 | 32.00 MB |
| heavy | `/assets/models/polyhaven/potted_plant_02.optimized.glb` | 867.6 KB | 208,035 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/steel_frame_shelves_03.optimized.glb` | 385.8 KB | 19,101 | 6 | 32.00 MB |
| medium | `/assets/models/polyhaven/wooden_picnic_table.optimized.glb` | 480.4 KB | 23,973 | 6 | 32.00 MB |
| heavy | `/assets/models/sheen-wood-leather-sofa.optimized.glb` | 1.19 MB | 115,614 | 13 | 28.25 MB |
| heavy | `/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb` | 555.4 KB | 108,963 | 5 | 26.67 MB |
| medium | `/assets/models/polyhaven/hanging_industrial_lamp.optimized.glb` | 491.5 KB | 27,936 | 5 | 26.67 MB |
| medium | `/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb` | 103.0 KB | 6,579 | 5 | 26.67 MB |
| heavy | `/assets/models/manual/dimensiva-bunky-bunk-bed-by-magis.optimized.glb` | 1.12 MB | 865,125 | 1 | 700 B |
| heavy | `/assets/models/objaverse/objaverse-large-grantham-bed.optimized.glb` | 6.02 MB | 830,907 | 2 | 10.67 MB |
| medium | `/assets/models/polyhaven/caged_hanging_light.optimized.glb` | 496.4 KB | 50,634 | 4 | 21.33 MB |
| medium | `/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb` | 338.0 KB | 21,891 | 4 | 21.33 MB |
| medium | `/assets/models/polyhaven/industrial_wall_sconce.optimized.glb` | 200.9 KB | 26,745 | 4 | 21.33 MB |
| medium | `/assets/models/polyhaven/rollershutter_door.optimized.glb` | 269.4 KB | 3,192 | 4 | 21.33 MB |
| medium | `/assets/models/polyhaven/rollershutter_window_01.optimized.glb` | 254.0 KB | 3,192 | 4 | 21.33 MB |
| medium | `/assets/models/polyhaven/rollershutter_window_02.optimized.glb` | 212.4 KB | 3,228 | 4 | 21.33 MB |

## Material Override Candidates

These non-heavy assets expose material names that can be targeted by runtime PBR override rules.

| Asset | Tier | Materials | Signals |
| --- | --- | ---: | --- |
| `/assets/models/architectural/modern-tall-casement-window.optimized.glb` | light | 4 | metal: brushed steel hardware, matte charcoal frame, warm white powder-coated frame; glass: soft blue architectural glass |
| `/assets/models-ktx2/polyhaven/hanging_picture_frame_01.optimized.glb` | medium | 3 | metal: hanging_picture_frame_01, hanging_picture_frame_01_artwork, hanging_picture_frame_01_glass; glass: hanging_picture_frame_01_glass |
| `/assets/models-ktx2/polyhaven/hanging_picture_frame_02.optimized.glb` | medium | 3 | metal: hanging_picture_frame_02, hanging_picture_frame_02_artwork, hanging_picture_frame_02_glass; glass: hanging_picture_frame_02_glass |
| `/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb` | medium | 3 | metal: hanging_picture_frame_01, hanging_picture_frame_01_artwork, hanging_picture_frame_01_glass; glass: hanging_picture_frame_01_glass |
| `/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb` | medium | 3 | metal: hanging_picture_frame_02, hanging_picture_frame_02_artwork, hanging_picture_frame_02_glass; glass: hanging_picture_frame_02_glass |
| `/assets/models/polyhaven/hanging_picture_frame_03.optimized.glb` | medium | 3 | metal: hanging_picture_frame_03, hanging_picture_frame_03_artwork, hanging_picture_frame_03_glass; glass: hanging_picture_frame_03_glass |
| `/assets/models/polyhaven/standing_picture_frame_01.optimized.glb` | medium | 3 | metal: standing_picture_frame_01, standing_picture_frame_01_artwork, standing_picture_frame_01_glass; glass: standing_picture_frame_01_glass |
| `/assets/models/polyhaven/standing_picture_frame_02.optimized.glb` | medium | 3 | metal: standing_picture_frame_02, standing_picture_frame_02_artwork, standing_picture_frame_02_glass; glass: standing_picture_frame_02_glass |
| `/assets/models/polyhaven/desk_lamp_arm_01.optimized.glb` | medium | 2 | wood: desk_lamp_arm_01, desk_lamp_arm_01_light; emissive: desk_lamp_arm_01, desk_lamp_arm_01_light |
| `/assets/models/architectural/modern-slim-glass-door.optimized.glb` | light | 4 | metal: brushed steel hardware, warm white powder-coated frame; glass: soft blue architectural glass |
| `/assets/models/architectural/modern-double-glass-door.optimized.glb` | light | 3 | metal: brushed steel hardware, warm white powder-coated frame; glass: soft blue architectural glass |
| `/assets/models/architectural/modern-ribbed-oak-door.optimized.glb` | light | 3 | wood: light oak veneer; metal: matte charcoal frame, warm white powder-coated frame |
| `/assets/models/architectural/modern-sliding-glass-door.optimized.glb` | light | 3 | metal: brushed steel hardware, matte charcoal frame; glass: soft blue architectural glass |
| `/assets/models/architectural/modern-sliding-window.optimized.glb` | light | 3 | metal: matte charcoal frame, warm white powder-coated frame; glass: soft blue architectural glass |
| `/assets/models/architectural/modern-square-awning-window.optimized.glb` | light | 3 | metal: matte charcoal frame, warm white powder-coated frame; glass: soft blue architectural glass |
| `/assets/models/architectural/modern-wide-picture-window.optimized.glb` | light | 3 | metal: matte charcoal frame, warm white powder-coated frame; glass: soft blue architectural glass |
| `/assets/models/polyhaven/hanging_industrial_lamp.optimized.glb` | medium | 2 | glass: hanging_industrial_lamp_glass; emissive: hanging_industrial_lamp, hanging_industrial_lamp_glass |
| `/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb` | medium | 2 | glass: industrial_pipe_lamp_glass; emissive: industrial_pipe_lamp, industrial_pipe_lamp_glass |
| `/assets/models/architectural/modern-flush-white-door.optimized.glb` | light | 4 | metal: brushed steel hardware, warm white powder-coated frame |
| `/assets/models/manual/dimensiva-hello-floor-lamp-by-normann-copenhagen.optimized.glb` | medium | 3 | wood: Wood; emissive: Light_box |

## Tier Rules

- heavy: GLB > 3 MB, render vertices > 100k, or estimated texture GPU allocation > 32 MB.
- medium: GLB > 800 KB, render vertices > 30k, or estimated texture GPU allocation > 8 MB.
- light: below the medium thresholds.

Full machine-readable data is written to `public/assets/render-asset-manifest.json`.
