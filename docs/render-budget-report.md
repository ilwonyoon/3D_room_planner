# Render Budget Report

Generated: 2026-04-23T16:39:44.224Z

Quality: `medium`

## Summary

- Max draw calls: 79
- Max triangles: 99,839
- Max geometries: 75
- Max textures: 82

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 74 | 91,635 | 71 | 70 | 1 |
| isometric | warm-evening | 73 | 91,623 | 71 | 70 | 1 |
| isometric | night-room | 73 | 91,623 | 71 | 72 | 1 |
| bird | daylight-window | 73 | 91,623 | 71 | 74 | 1 |
| bird | warm-evening | 79 | 99,839 | 75 | 78 | 1 |
| bird | night-room | 79 | 99,839 | 75 | 78 | 1 |
| pov | daylight-window | 79 | 99,839 | 75 | 80 | 1 |
| pov | warm-evening | 67 | 77,109 | 75 | 81 | 1 |
| pov | night-room | 67 | 77,109 | 75 | 82 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
