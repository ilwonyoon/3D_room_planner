# Runtime Variant Report

Generated: 2026-04-24T20:40:31.323Z

These runtime-lite GLBs are generated variants. Source GLBs are not overwritten.

| Variant | Source | Output | Render vertices | Texture GPU | Transfer |
| --- | --- | --- | ---: | ---: | ---: |
| beyla-shoe-cabinet-runtime-lite | `public/assets/models/manual/dimensiva-beyla-shoe-cabinet-by-kave-home.optimized.glb` | `/assets/generated/runtime-variants/beyla-shoe-cabinet-runtime-lite.glb` | 132,795 -> 80,178 (-39.6%) | 32.00 MB -> 32.00 MB (0.0%) | 696.9 KB -> 600.4 KB (-13.8%) |
| vintage-cabinet-runtime-lite | `public/assets/models/polyhaven/vintage_cabinet_01.optimized.glb` | `/assets/generated/runtime-variants/vintage-cabinet-runtime-lite.glb` | 106,608 -> 79,953 (-25.0%) | 37.33 MB -> 37.33 MB (0.0%) | 582.2 KB -> 529.5 KB (-9.1%) |
| eames-armchair-runtime-lite | `public/assets/models/manual/dimensiva-eames-armchair-rocker-rar-by-vitra.optimized.glb` | `/assets/generated/runtime-variants/eames-armchair-runtime-lite.glb` | 155,814 -> 49,851 (-68.0%) | 0 B -> 0 B (n/a) | 219.1 KB -> 80.3 KB (-63.3%) |
| plan-chair-runtime-lite | `public/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb` | `/assets/generated/runtime-variants/plan-chair-runtime-lite.glb` | 118,377 -> 49,710 (-58.0%) | 4.74 MB -> 4.74 MB (0.0%) | 253.3 KB -> 145.3 KB (-42.6%) |
| toio-floor-lamp-runtime-lite | `public/assets/models/manual/dimensiva-toio-led-floor-lamp-by-flos.optimized.glb` | `/assets/generated/runtime-variants/toio-floor-lamp-runtime-lite.glb` | 181,413 -> 63,543 (-65.0%) | 5.33 MB -> 5.33 MB (0.0%) | 275.5 KB -> 113.9 KB (-58.6%) |
| lotus-vase-runtime-lite | `public/assets/models/manual/dimensiva-lotus-vase-by-101-copenhagen.optimized.glb` | `/assets/generated/runtime-variants/lotus-vase-runtime-lite.glb` | 318,954 -> 39,864 (-87.5%) | 5.33 MB -> 5.33 MB (0.0%) | 611.8 KB -> 102.3 KB (-83.3%) |
| book-encyclopedia-set-runtime-lite | `public/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb` | `/assets/generated/runtime-variants/book-encyclopedia-set-runtime-lite.glb` | 108,963 -> 40,305 (-63.0%) | 26.67 MB -> 26.67 MB (0.0%) | 555.4 KB -> 308.9 KB (-44.4%) |

## Notes

- Runtime variants are enabled by default and can be disabled with `VITE_DISABLE_RUNTIME_VARIANTS=true`.
- `VITE_ENABLE_RUNTIME_VARIANTS=false` is also treated as disabled for backwards-compatible local testing.
- Texture GPU size may remain unchanged when source textures are embedded WebP; `gltf-transform optimize` currently skips KTX2 conversion for those textures.
- Validator info for `EXT_meshopt_compression` is expected because the validator does not inspect that extension. Warnings such as generated tangent space still need browser visual QA.

## Deferred Candidates

| Variant | Source | Reason |
| --- | --- | --- |
| sheen-chair-runtime-lite | `public/assets/models/sheen-chair.optimized.glb` | gltf-transform simplification drops or invalidates TEXCOORD_1 required by the occlusion texture; needs Blender UV/AO cleanup before runtime use. |

## Next Steps

- Visually compare variants against source assets in isometric view.
- Continue camera-distance variant policy work for POV.
- Keep windows on current assets for now; they are under the Phase 3 window budget.

## Commands

Generate runtime variants:

```sh
pnpm blender:create-runtime-variants
```

Validate generated runtime variants:

```sh
pnpm blender:validate-runtime-variants
```
