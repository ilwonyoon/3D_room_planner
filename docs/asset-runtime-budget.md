# Asset Runtime Budget Audit

Generated: 2026-04-24T07:37:15.678Z

Source manifest: `public/assets/render-asset-manifest.json`

This report supports Phase 3 of `docs/21-runtime-asset-optimization-plan.md`. It ranks assets that should get runtime-lite variants first. It does not rewrite any GLB.

## Top Candidates

| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| decor | `/assets/models/polyhaven/potted_plant_01.optimized.glb` | 461,283 | 6 | 32.00 MB | 1.55 MB | 11.53x | create runtime mesh at about 35% vertices; downsize or KTX2-compress support maps |
| bed | `/assets/models/manual/dimensiva-bunky-bunk-bed-by-magis.optimized.glb` | 865,125 | 1 | 700 B | 1.12 MB | 7.21x | create runtime mesh at about 35% vertices |
| bed | `/assets/models/objaverse/objaverse-large-grantham-bed.optimized.glb` | 830,907 | 2 | 10.67 MB | 6.02 MB | 6.92x | create runtime mesh at about 35% vertices |
| decor | `/assets/models/manual/dimensiva-lotus-vase-by-101-copenhagen.optimized.glb` | 318,954 | 1 | 5.33 MB | 611.8 KB | 7.97x | create runtime mesh at about 35% vertices |
| decor | `/assets/models/polyhaven/potted_plant_02.optimized.glb` | 208,035 | 6 | 32.00 MB | 867.6 KB | 5.2x | create runtime mesh at about 35% vertices; downsize or KTX2-compress support maps |
| decor | `/assets/models/manual/dimensiva-iconic-alarm-clock-by-karlsson.optimized.glb` | 171,669 | 1 | 700 B | 254.4 KB | 4.29x | create runtime mesh at about 35% vertices |
| bed | `/assets/models/objaverse/objaverse-bed-0101.optimized.glb` | 305,742 | 8 | 34.00 MB | 3.92 MB | 2.55x | create runtime mesh at about 39% vertices; downsize or KTX2-compress support maps; audit duplicated or oversized texture set |
| bed | `/assets/models/objaverse/objaverse-king-floor-bed.optimized.glb` | 278,838 | 3 | 16.00 MB | 652.4 KB | 2.32x | create runtime mesh at about 43% vertices |
| chair | `/assets/models/manual/dimensiva-eames-armchair-rocker-rar-by-vitra.optimized.glb` | 155,814 | 0 | 0 B | 219.1 KB | 3.12x | create runtime mesh at about 35% vertices |
| decor | `/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb` | 108,963 | 5 | 26.67 MB | 555.4 KB | 2.72x | create runtime mesh at about 37% vertices; downsize or KTX2-compress support maps |
| bed | `/assets/models/objaverse/objaverse-chelsea-storage-bed.optimized.glb` | 213,696 | 5 | 16.00 MB | 1.16 MB | 1.78x | create runtime mesh at about 56% vertices |
| decor | `/assets/models/polyhaven/fancy_picture_frame_02.optimized.glb` | 88,671 | 6 | 32.00 MB | 636.2 KB | 2.22x | create runtime mesh at about 45% vertices; downsize or KTX2-compress support maps |
| chair | `/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb` | 118,377 | 2 | 4.74 MB | 253.3 KB | 2.37x | create runtime mesh at about 42% vertices |
| chair | `/assets/models/manual/dimensiva-panton-chair-junior-by-vitra.optimized.glb` | 119,898 | 0 | 0 B | 161.3 KB | 2.4x | create runtime mesh at about 42% vertices |
| storage | `/assets/models/manual/dimensiva-beyla-shoe-cabinet-by-kave-home.optimized.glb` | 132,795 | 6 | 32.00 MB | 696.9 KB | 1.66x | create runtime mesh at about 60% vertices; downsize or KTX2-compress support maps |
| chair | `/assets/models/sheen-chair.optimized.glb` | 105,426 | 7 | 14.67 MB | 724.5 KB | 2.11x | create runtime mesh at about 47% vertices; audit duplicated or oversized texture set |
| decor | `/assets/models/polyhaven/hanging_picture_frame_03.optimized.glb` | 63,825 | 6 | 32.00 MB | 381.6 KB | 2x | create runtime mesh at about 63% vertices; downsize or KTX2-compress support maps |
| storage | `/assets/models/polyhaven/vintage_cabinet_01.optimized.glb` | 106,608 | 7 | 37.33 MB | 582.2 KB | 1.56x | create runtime mesh at about 75% vertices; downsize or KTX2-compress support maps; audit duplicated or oversized texture set |
| decor | `/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb` | 7,575 | 6 | 32.00 MB | 200.7 KB | 2x | downsize or KTX2-compress support maps |
| decor | `/assets/models/polyhaven/fancy_picture_frame_01.optimized.glb` | 1,005 | 6 | 32.00 MB | 325.2 KB | 2x | downsize or KTX2-compress support maps |

## storage

Budget:

- render vertices: 80,000
- texture GPU: 24.00 MB

| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| storage | `/assets/models/manual/dimensiva-beyla-shoe-cabinet-by-kave-home.optimized.glb` | 132,795 | 6 | 32.00 MB | 696.9 KB | 1.66x | create runtime mesh at about 60% vertices; downsize or KTX2-compress support maps |
| storage | `/assets/models/polyhaven/vintage_cabinet_01.optimized.glb` | 106,608 | 7 | 37.33 MB | 582.2 KB | 1.56x | create runtime mesh at about 75% vertices; downsize or KTX2-compress support maps; audit duplicated or oversized texture set |
| storage | `/assets/models/polyhaven/steel_frame_shelves_03.optimized.glb` | 19,101 | 6 | 32.00 MB | 385.8 KB | 1.33x | downsize or KTX2-compress support maps |
| storage | `/assets/models/polyhaven/modern_wooden_cabinet.optimized.glb` | 59,607 | 3 | 16.00 MB | 415.9 KB | 0.75x | keep as monitored candidate |
| storage | `/assets/models/polyhaven/chinese_cabinet.optimized.glb` | 45,162 | 3 | 16.00 MB | 336.8 KB | 0.67x | keep as monitored candidate |
| storage | `/assets/models/polyhaven/chinese_console_table.optimized.glb` | 40,326 | 3 | 16.00 MB | 476.4 KB | 0.67x | keep as monitored candidate |
| storage | `/assets/models/polyhaven/drawer_cabinet.optimized.glb` | 40,629 | 3 | 16.00 MB | 242.0 KB | 0.67x | keep as monitored candidate |
| storage | `/assets/models/polyhaven/GothicCabinet_01.optimized.glb` | 35,703 | 3 | 16.00 MB | 349.5 KB | 0.67x | keep as monitored candidate |

## window

Budget:

- render vertices: 20,000
- texture GPU: 12.00 MB

| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| window | `/assets/models/architectural/modern-tall-casement-window.optimized.glb` | 10,260 | 0 | 0 B | 19.5 KB | 0.51x | keep as monitored candidate |
| window | `/assets/models/architectural/modern-sliding-window.optimized.glb` | 10,122 | 0 | 0 B | 18.0 KB | 0.51x | keep as monitored candidate |
| window | `/assets/models/architectural/modern-square-awning-window.optimized.glb` | 8,760 | 0 | 0 B | 16.0 KB | 0.44x | keep as monitored candidate |
| window | `/assets/models/architectural/modern-transom-window.optimized.glb` | 8,460 | 0 | 0 B | 14.2 KB | 0.42x | keep as monitored candidate |
| window | `/assets/models/architectural/modern-wide-picture-window.optimized.glb` | 6,936 | 0 | 0 B | 13.6 KB | 0.35x | keep as monitored candidate |

## chair

Budget:

- render vertices: 50,000
- texture GPU: 24.00 MB

| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| chair | `/assets/models/manual/dimensiva-eames-armchair-rocker-rar-by-vitra.optimized.glb` | 155,814 | 0 | 0 B | 219.1 KB | 3.12x | create runtime mesh at about 35% vertices |
| chair | `/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb` | 118,377 | 2 | 4.74 MB | 253.3 KB | 2.37x | create runtime mesh at about 42% vertices |
| chair | `/assets/models/manual/dimensiva-panton-chair-junior-by-vitra.optimized.glb` | 119,898 | 0 | 0 B | 161.3 KB | 2.4x | create runtime mesh at about 42% vertices |
| chair | `/assets/models/sheen-chair.optimized.glb` | 105,426 | 7 | 14.67 MB | 724.5 KB | 2.11x | create runtime mesh at about 47% vertices; audit duplicated or oversized texture set |
| chair | `/assets/models/manual/dimensiva-oyster-light-armchair-by-i4marini.optimized.glb` | 81,972 | 0 | 0 B | 114.5 KB | 1.64x | create runtime mesh at about 61% vertices |
| chair | `/assets/models/polyhaven/outdoor_table_chair_set_01.optimized.glb` | 28,800 | 6 | 32.00 MB | 402.7 KB | 1.33x | downsize or KTX2-compress support maps |
| chair | `/assets/models/manual/dimensiva-form-armchair-by-normann-copenhagen.optimized.glb` | 73,830 | 0 | 0 B | 103.4 KB | 1.48x | create runtime mesh at about 68% vertices |
| chair | `/assets/models/polyhaven/modern_arm_chair_01.optimized.glb` | 21,087 | 6 | 32.00 MB | 307.9 KB | 1.33x | downsize or KTX2-compress support maps |

## decor

Budget:

- render vertices: 40,000
- texture GPU: 16.00 MB

| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| decor | `/assets/models/polyhaven/potted_plant_01.optimized.glb` | 461,283 | 6 | 32.00 MB | 1.55 MB | 11.53x | create runtime mesh at about 35% vertices; downsize or KTX2-compress support maps |
| decor | `/assets/models/manual/dimensiva-lotus-vase-by-101-copenhagen.optimized.glb` | 318,954 | 1 | 5.33 MB | 611.8 KB | 7.97x | create runtime mesh at about 35% vertices |
| decor | `/assets/models/polyhaven/potted_plant_02.optimized.glb` | 208,035 | 6 | 32.00 MB | 867.6 KB | 5.2x | create runtime mesh at about 35% vertices; downsize or KTX2-compress support maps |
| decor | `/assets/models/manual/dimensiva-iconic-alarm-clock-by-karlsson.optimized.glb` | 171,669 | 1 | 700 B | 254.4 KB | 4.29x | create runtime mesh at about 35% vertices |
| decor | `/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb` | 108,963 | 5 | 26.67 MB | 555.4 KB | 2.72x | create runtime mesh at about 37% vertices; downsize or KTX2-compress support maps |
| decor | `/assets/models/polyhaven/fancy_picture_frame_02.optimized.glb` | 88,671 | 6 | 32.00 MB | 636.2 KB | 2.22x | create runtime mesh at about 45% vertices; downsize or KTX2-compress support maps |
| decor | `/assets/models/polyhaven/hanging_picture_frame_03.optimized.glb` | 63,825 | 6 | 32.00 MB | 381.6 KB | 2x | create runtime mesh at about 63% vertices; downsize or KTX2-compress support maps |
| decor | `/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb` | 7,575 | 6 | 32.00 MB | 200.7 KB | 2x | downsize or KTX2-compress support maps |

## bed

Budget:

- render vertices: 120,000
- texture GPU: 24.00 MB

| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| bed | `/assets/models/manual/dimensiva-bunky-bunk-bed-by-magis.optimized.glb` | 865,125 | 1 | 700 B | 1.12 MB | 7.21x | create runtime mesh at about 35% vertices |
| bed | `/assets/models/objaverse/objaverse-large-grantham-bed.optimized.glb` | 830,907 | 2 | 10.67 MB | 6.02 MB | 6.92x | create runtime mesh at about 35% vertices |
| bed | `/assets/models/objaverse/objaverse-bed-0101.optimized.glb` | 305,742 | 8 | 34.00 MB | 3.92 MB | 2.55x | create runtime mesh at about 39% vertices; downsize or KTX2-compress support maps; audit duplicated or oversized texture set |
| bed | `/assets/models/objaverse/objaverse-king-floor-bed.optimized.glb` | 278,838 | 3 | 16.00 MB | 652.4 KB | 2.32x | create runtime mesh at about 43% vertices |
| bed | `/assets/models/objaverse/objaverse-chelsea-storage-bed.optimized.glb` | 213,696 | 5 | 16.00 MB | 1.16 MB | 1.78x | create runtime mesh at about 56% vertices |
| bed | `/assets/models/objaverse/objaverse-messy-bed-2.optimized.glb` | 75,561 | 6 | 32.00 MB | 674.2 KB | 1.33x | downsize or KTX2-compress support maps |
| bed | `/assets/models/objaverse/objaverse-soho-bed.optimized.glb` | 101,511 | 1 | 5.33 MB | 189.1 KB | 0.85x | keep as monitored candidate |

