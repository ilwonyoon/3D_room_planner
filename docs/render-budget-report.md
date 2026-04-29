# Render Budget Report

Generated: 2026-04-29T19:48:36.409Z

Quality: `medium`

URL: `http://127.0.0.1:5175/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 182
- Max triangles: 472,789
- Max geometries: 207
- Max textures: 103

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | afternoon-natural | 157 | 190,343 | 144 | 34 | 1 |
| bird | afternoon-natural | 171 | 297,257 | 162 | 62 | 1 |
| pov | afternoon-natural | 182 | 472,789 | 207 | 103 | 1 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
