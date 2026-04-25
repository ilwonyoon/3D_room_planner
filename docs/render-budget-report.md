# Render Budget Report

Generated: 2026-04-24T21:01:21.480Z

Quality: `medium`

URL: `http://127.0.0.1:5175/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 131
- Max triangles: 296,241
- Max geometries: 130
- Max textures: 73

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 119 | 180,821 | 109 | 48 | 1 |
| isometric | warm-evening | 125 | 279,340 | 113 | 49 | 1 |
| isometric | night-room | 125 | 288,025 | 130 | 60 | 1 |
| bird | daylight-window | 131 | 296,241 | 110 | 63 | 1 |
| bird | warm-evening | 131 | 296,241 | 110 | 63 | 1 |
| bird | night-room | 131 | 296,241 | 110 | 63 | 1 |
| pov | daylight-window | 131 | 296,241 | 110 | 60 | 1 |
| pov | warm-evening | 131 | 296,241 | 110 | 73 | 1 |
| pov | night-room | 131 | 296,241 | 110 | 73 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
