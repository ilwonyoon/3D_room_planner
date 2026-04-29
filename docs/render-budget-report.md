# Render Budget Report

Generated: 2026-04-29T20:48:11.400Z

Quality: `high`

URL: `http://127.0.0.1:5175/`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live `WebGLRenderer.info.memory`.

## Summary

- Max draw calls: 182
- Max triangles: 871,398
- Max geometries: 200
- Max textures: 36

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| isometric | afternoon-natural | 157 | 194,781 | 164 | 36 | 1.5 |
| bird | afternoon-natural | 166 | 205,875 | 170 | 36 | 1.5 |
| pov | afternoon-natural | 182 | 871,398 | 200 | 34 | 1.5 |

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
