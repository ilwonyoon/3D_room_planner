# Render Budget Report

Generated: 2026-04-24T06:20:33.542Z

Quality: `medium`

## Summary

- Max draw calls: 541
- Max triangles: 1,904,458
- Max geometries: 388
- Max textures: 108

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 107 | 140,298 | 112 | 28 | 1 |
| isometric | warm-evening | 106 | 140,286 | 112 | 28 | 1 |
| isometric | night-room | 236 | 1,018,684 | 197 | 34 | 1 |
| bird | daylight-window | 518 | 1,461,702 | 355 | 93 | 1 |
| bird | warm-evening | 536 | 1,746,588 | 380 | 102 | 1 |
| bird | night-room | 541 | 1,904,458 | 388 | 107 | 1 |
| pov | daylight-window | 541 | 1,904,458 | 387 | 107 | 1 |
| pov | warm-evening | 472 | 1,015,992 | 294 | 108 | 1 |
| pov | night-room | 472 | 1,015,992 | 294 | 108 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
