# Blender Hero Asset QA

Generated: 2026-04-23T07:36:24.847305+00:00

This report imports the default-room hero GLBs in Blender CLI after a temporary glTF copy step. It does not rewrite source assets.

## Summary

- Assets inspected: 12
- Assets with risks: 5
- Output JSON: `output/blender/hero-asset-qa.json`

## Asset Table

| Asset | Meshes | Materials | Blender bounds XYZ | Material signals | Risks |
| --- | ---: | ---: | --- | --- | --- |
| desk | 1 | 1 | 2.000 x 0.947 x 0.787 | wood: metal_office_desk; metal: metal_office_desk | single material limits runtime PBR overrides |
| armchair | 1 | 2 | 0.820 x 0.987 x 1.023 | fabric: modern_arm_chair_01_pillow; metal: modern_arm_chair_01_legs | - |
| desk-lamp | 1 | 2 | 0.202 x 0.614 x 0.893 | wood: desk_lamp_arm_01, desk_lamp_arm_01_light; emissive: desk_lamp_arm_01, desk_lamp_arm_01_light | - |
| bookcase-left | 1 | 2 | 2.351 x 0.721 x 2.312 | metal: steel_frame_shelves_03, steel_frame_shelves_03_drawers | - |
| storage-right | 1 | 1 | 0.500 x 0.500 x 1.484 | - | single material limits runtime PBR overrides; no material naming signals |
| reading-lamp | 2 | 2 | 0.183 x 0.262 x 0.364 | glass: industrial_pipe_lamp_glass; emissive: industrial_pipe_lamp, industrial_pipe_lamp_glass | - |
| round-side-table | 1 | 1 | 0.550 x 0.450 x 0.551 | - | single material limits runtime PBR overrides; no material naming signals |
| window-main | 3 | 3 | 1.580 x 0.099 x 0.980 | metal: matte charcoal frame, warm white powder-coated frame; glass: soft blue architectural glass | - |
| wall-art-back | 1 | 3 | 0.752 x 0.033 x 0.500 | metal: hanging_picture_frame_02, hanging_picture_frame_02_artwork, hanging_picture_frame_02_glass; glass: hanging_picture_frame_02_glass | - |
| wall-art-small | 1 | 3 | 0.594 x 0.016 x 0.841 | metal: hanging_picture_frame_01, hanging_picture_frame_01_artwork, hanging_picture_frame_01_glass; glass: hanging_picture_frame_01_glass | - |
| floor-plant | 1 | 1 | 0.168 x 0.185 x 0.267 | - | single material limits runtime PBR overrides; no material naming signals |
| small-plant | 1 | 1 | 0.204 x 0.204 x 0.400 | - | single material limits runtime PBR overrides; no material naming signals |

## How To Use

- Prefer assets with separated glass, metal, wood, fabric, and lamp/emissive material names.
- Treat missing signal names as runtime override risk, not an automatic rejection.
- If an important hero asset has poor material naming, create a separate variant instead of editing the source GLB.
