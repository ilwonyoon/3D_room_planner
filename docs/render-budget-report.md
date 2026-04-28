# Render Budget Report

Generated: 2026-04-28T20:32:19.026Z

Quality: `medium`

URL: `http://127.0.0.1:5190/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 177
- Max triangles: 425,898
- Max geometries: 145
- Max textures: 81

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | daylight-window | 158 | 219,797 | 143 | 48 | 1 |
| isometric | warm-evening | 160 | 239,197 | 139 | 49 | 1 |
| isometric | night-room | 168 | 417,646 | 145 | 50 | 1 |
| bird | daylight-window | 177 | 425,898 | 142 | 71 | 1 |
| bird | warm-evening | 177 | 425,898 | 142 | 71 | 1 |
| bird | night-room | 177 | 425,898 | 142 | 68 | 1 |
| pov | daylight-window | 177 | 425,898 | 142 | 68 | 1 |
| pov | warm-evening | 177 | 425,898 | 142 | 81 | 1 |
| pov | night-room | 177 | 425,898 | 142 | 81 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
