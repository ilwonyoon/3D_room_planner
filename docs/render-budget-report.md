# Render Budget Report

Generated: 2026-04-23T07:52:21.231Z

Quality: `medium`

## Summary

- Max draw calls: 75
- Max triangles: 99,831
- Max geometries: 73
- Max textures: 68

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 70 | 91,627 | 69 | 68 | 1 |
| isometric | warm-evening | 69 | 91,615 | 69 | 68 | 1 |
| isometric | night-room | 69 | 91,615 | 69 | 68 | 1 |
| bird | daylight-window | 69 | 91,615 | 69 | 68 | 1 |
| bird | warm-evening | 75 | 99,831 | 73 | 68 | 1 |
| bird | night-room | 75 | 99,831 | 73 | 68 | 1 |
| pov | daylight-window | 75 | 99,831 | 73 | 68 | 1 |
| pov | warm-evening | 65 | 77,105 | 73 | 68 | 1 |
| pov | night-room | 65 | 77,105 | 73 | 68 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
