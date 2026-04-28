# 24. Render Quality Deep Research Plan

작성일: 2026-04-28

## Goal

현재 default room의 시각 품질을 "보정된 Three.js 프로토타입"이 아니라 "작은 archviz 씬"처럼 보이게 끌어올린다. 이번 라운드의 핵심은 옵션을 더 켜는 것이 아니라, Blender/Cycles reference와 Three.js runtime이 같은 조명/재질 논리를 공유하도록 파이프라인을 다시 잡는 것이다.

## Current Measurement

명령:

```bash
pnpm render:quality-metrics --url=http://127.0.0.1:5190/ --views=isometric,bird,pov --quality=high --hero-sets=baseline
pnpm render:budget --url=http://127.0.0.1:5190/ --quality=medium
```

결과:

- Latest quality run: `output/render-quality-metrics/2026-04-28T21-49-26-791Z.json`
- Average perceptual proxy score: `64.8`
- Weakest views:
  - `bird:warm-evening`: `41.8`
  - `bird:night-room`: `52.3`
  - `pov:night-room`: `52.9`
  - `isometric:night-room`: `60.9`
- Budget:
  - Max draw calls: `177`
  - Max triangles: `425,898`
  - Max textures: `81`

Current screenshots:

- `output/render-quality-metrics/2026-04-28T21-49-26-791Z-base-iso-day.png`
- `output/render-quality-metrics/2026-04-28T21-49-26-791Z-base-bird-day.png`
- `output/render-quality-metrics/2026-04-28T21-49-26-791Z-base-pov-day.png`

## Diagnosis

### 1. 4K furniture bake exists, but it is not the quality path yet

`src/constants/modelVariants.ts` only enables baked furniture when:

```ts
import.meta.env.VITE_ENABLE_BAKED_FURNITURE_VARIANTS === 'true'
```

That means the default app path is still the curated runtime/material path, not the generated 4K baked GLBs.

More importantly, `scripts/blender/bake-furniture-4k-variants.py` is not preserving the original product material stack. It creates procedural palette/noise materials, bakes `DIFFUSE COLOR`, then exports one atlas. This can reduce texture fanout, but it does not add real fabric weave, wood grain, roughness variation, AO, or soft lighting. So the user expectation "Blender CLI로 4K 베이킹해서 퀄리티가 확 좋아짐" is not met by the current implementation.

### 2. Static room bake is a mathematical mask, not a Cycles lightmap

`scripts/blender/generate-room-light-bakes.py` writes AO/window-wash PNGs by sampling Gaussian functions. It does not import the actual room, trace light, or bake indirect illumination from Cycles.

This is useful for cheap grounding, but it cannot reproduce:

- bounced daylight from the window
- soft indirect corner darkening
- object-specific penumbra
- wall/floor color bleed
- believable window falloff

### 3. Runtime lighting is doing the right categories, but not enough physical evidence reaches the image

The scene has HDRI, ACES, RectAreaLight, practical spots, bounce lights, ContactShadows, N8AO, and SMAA. The issue is that several parts are intentionally low-cost:

- High DPR is capped at `[1, 1.25]`.
- N8AO runs half-res with medium quality.
- Contact shadow resolution is `256`.
- Canvas uses `PCFShadowMap`, not a softer high-quality shadow mode.
- Budget is already near the current medium ceiling: draw calls `177/180`, triangles `425,898/450k`, textures `81/90`.

So brute-force real-time quality will hit budget quickly.

### 4. RectAreaLight cannot solve window shadows alone

Three.js `RectAreaLight` is the right model for a window/softbox, but it has no shadow support and only affects PBR materials. The current separate directional shadow light is therefore doing a best-effort approximation. This explains why the window can brighten surfaces but still not feel like a coherent sun/window light path.

### 5. Material normalization is still too destructive

Several runtime material overrides clear color/normal/roughness maps for consistency. That helps avoid broken assets, but it can erase the exact information that makes close-up furniture feel expensive. The pipeline needs to distinguish:

- broken asset rescue
- stylistic color correction
- high-quality asset preservation

Right now these are mixed.

## Research Conclusions

1. Three.js needs linear color workflow and correct texture color spaces. The renderer is already on `SRGBColorSpace` and ACES, but postprocessing and custom/baked textures still need explicit color-space decisions.
2. Three.js PMREM/HDRI is the correct path for PBR material response, but higher quality HDRI/reflection setup should be tested as a quality-tier feature.
3. RectAreaLight should stay for window/practical area light, but its no-shadow limitation means believable room light should come from baked static shell lightmaps plus small dynamic/contact shadows.
4. Blender/Cycles baking should be used for actual lightmaps and AO, not for procedural recoloring of furniture.
5. Runtime should keep editable furniture dynamic, but the static room shell can be precomputed aggressively.

## Proposed Quality Plan

### Phase 0. Lock a Golden Reference

Create a true Blender/Cycles reference for the exact current room:

- Import the same room dimensions, window, floor/wall material, and default objects.
- Use Cycles with denoise, 512-1024 samples for reference stills.
- Render isometric, bird, and POV cameras matching the app.
- Store `reference/current-room-{view}-{preset}.png`.

Acceptance:

- Reference images are visibly better than runtime and become the target, not the runtime screenshot.
- A short "loss map" lists what runtime lacks: window falloff, contact, material richness, wall flatness, highlights.

### Phase 1. Replace Mask Bake With Real Static Lightmap Shell

Build a high-quality static room shell for the fixed default room:

- Floor, back/left/right/front walls, baseboards, window frame, curtain panels, and major static trim.
- Generate proper UV2/lightmap UVs in Blender.
- Bake Cycles `Combined` or separated `Diffuse Direct`, `Diffuse Indirect`, `AO`, and `Shadow` maps.
- Export `room-shell-lightmapped.glb` or use `MeshStandardMaterial.lightMap` in Three.js.
- Keep procedural shell as fallback for room-editable states.

Acceptance:

- Daylight POV shows visible window contribution on floor/wall without overlay-looking rectangles.
- Bird view floor no longer reads flat.
- Runtime screenshot moves toward Blender reference before touching furniture.

### Phase 2. Rebuild Furniture Bake As Material-Preserving QA

Stop treating "4K bake" as "make one procedural color atlas." Instead:

- If source GLB has good PBR textures, preserve them.
- If source has weak/no textures, generate material-specific rescue maps only for that model.
- Bake AO/curvature/contact dirt into AO or multiply layer, not into a generic base-color noise.
- Keep normal and roughness maps where present.
- Only atlas when visual QA proves it does not flatten the model.
- Use `heroModelUrl` for selected/close-up objects so POV replacement shows the high-quality model path.

Acceptance:

- At least 5 hero assets pass close-up QA: desk, Plan Chair/Rey Chair path, sofa, storage, shelf.
- Before/after screenshots show better material separation without generic noise.
- `VITE_ENABLE_BAKED_FURNITURE_VARIANTS=true` becomes a real candidate, not an experiment that looks worse.

### Phase 3. High-Quality Runtime Lighting Tier

Create a `cinematic` or `ultra` tier separate from current medium budget:

- DPR up to `1.5` on desktop/high-end only.
- `PCFSoftShadowMap` or tested VSM shadow candidate.
- Contact shadow resolution `512`.
- N8AO full-res or higher samples only in high/ultra.
- Higher-quality HDRI or generated PMREM test, with lower ambient fill.
- Preset-specific exposure/contrast pass after screenshots, not by eye only.

Acceptance:

- No medium budget regression.
- Ultra tier can exceed medium budget but must be opt-in and visually superior.
- Quality harness reports both `medium-default` and `ultra-cinematic`.

### Phase 4. Material Governance

Split material rules into three explicit layers:

1. `asset-rescue`: fix broken/no-texture assets.
2. `style-tuning`: minor roughness/env/color balancing.
3. `hero-preserve`: never clear source PBR maps; only adjust intensity.

Acceptance:

- No blanket chair/furniture rule clears maps for high-quality source assets.
- Product replacement chairs keep their own color/material identity.
- Any `clearColorMap` rule must name a specific object/model and include a visual reason.

### Phase 5. Harness Upgrade

Current score is useful but not enough. Add:

- Blender reference delta: compare runtime against target crop by view/preset.
- Human preference ledger: record A/B winner with screenshot path.
- Close-up material score crop for selected chair/desk/sofa.
- Budget split: medium default vs ultra cinematic.

Target after Phase 1-3:

- Baseline average: `64.8 -> 75+`
- `bird:warm`: `41.8 -> 58+`
- `pov:night`: `52.9 -> 65+`
- `pov:day`: `85.8 -> 88+` while reducing blown desk/window patches.

## Immediate Next Actions

1. Implement `room-shell-lightmapped` experiment behind a flag.
2. Replace `generate-room-light-bakes.py` Gaussian masks with a Cycles shell bake path.
3. Rewrite furniture bake script so it preserves source materials and bakes AO/light support maps, not procedural base colors.
4. Add `ultra` render quality settings and capture A/B screenshots only after Phase 1 lands.
5. Promote only if screenshot and metrics both improve against current `2026-04-28T21-49-26-791Z` baseline.

## Sources

- Three.js color management: https://threejs.org/manual/en/color-management.html
- Three.js PMREMGenerator: https://threejs.org/docs/pages/PMREMGenerator.html
- Three.js RectAreaLight: https://threejs.org/docs/pages/RectAreaLight.html
- Three.js lights manual: https://threejs.org/manual/en/lights.html
- Blender Cycles render baking: https://docs.blender.org/manual/en/dev/render/cycles/baking.html
- Blender Light Probe Volume: https://docs.blender.org/manual/en/latest/render/eevee/light_probes/volume.html
