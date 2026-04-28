# Render Budget Report

Generated: 2026-04-28T17:40:01.932Z

Quality: `medium`

URL: `http://127.0.0.1:5190/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 166
- Max triangles: 416,386
- Max geometries: 168
- Max textures: 83

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 147 | 196,435 | 134 | 48 | 1 |
| isometric | warm-evening | 157 | 408,134 | 141 | 49 | 1 |
| isometric | night-room | 157 | 408,134 | 168 | 70 | 1 |
| bird | daylight-window | 166 | 416,386 | 133 | 73 | 1 |
| bird | warm-evening | 166 | 416,386 | 133 | 73 | 1 |
| bird | night-room | 166 | 416,386 | 133 | 70 | 1 |
| pov | daylight-window | 166 | 416,386 | 133 | 70 | 1 |
| pov | warm-evening | 166 | 416,386 | 133 | 83 | 1 |
| pov | night-room | 166 | 416,386 | 133 | 83 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
