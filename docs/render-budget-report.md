# Render Budget Report

Generated: 2026-04-28T17:09:25.946Z

Quality: `medium`

URL: `http://127.0.0.1:5190/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 160
- Max triangles: 410,490
- Max geometries: 163
- Max textures: 83

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 141 | 190,539 | 129 | 48 | 1 |
| isometric | warm-evening | 151 | 402,238 | 136 | 49 | 1 |
| isometric | night-room | 151 | 402,238 | 163 | 70 | 1 |
| bird | daylight-window | 160 | 410,490 | 128 | 73 | 1 |
| bird | warm-evening | 160 | 410,490 | 128 | 73 | 1 |
| bird | night-room | 160 | 410,490 | 128 | 73 | 1 |
| pov | daylight-window | 160 | 410,490 | 128 | 70 | 1 |
| pov | warm-evening | 160 | 410,490 | 128 | 83 | 1 |
| pov | night-room | 160 | 410,490 | 128 | 83 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
