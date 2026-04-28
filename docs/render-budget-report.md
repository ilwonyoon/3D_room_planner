# Render Budget Report

Generated: 2026-04-28T19:26:10.772Z

Quality: `medium`

URL: `http://127.0.0.1:5190/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 171
- Max triangles: 421,350
- Max geometries: 183
- Max textures: 88

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 155 | 189,680 | 143 | 48 | 1 |
| isometric | warm-evening | 159 | 243,372 | 153 | 54 | 1 |
| isometric | night-room | 162 | 413,098 | 183 | 78 | 1 |
| bird | daylight-window | 171 | 421,350 | 136 | 78 | 1 |
| bird | warm-evening | 171 | 421,350 | 136 | 78 | 1 |
| bird | night-room | 171 | 421,350 | 136 | 78 | 1 |
| pov | daylight-window | 171 | 421,350 | 136 | 75 | 1 |
| pov | warm-evening | 171 | 421,350 | 136 | 88 | 1 |
| pov | night-room | 171 | 421,350 | 136 | 88 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
