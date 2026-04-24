# Render Stability And Performance Findings

Date: 2026-04-24

## What Was Measured

- Added `webgl.contextLost` / `webgl.contextRestored` counters to `window.__pocketroomRenderStats`
- Ran headless Playwright against local dev server
- Sampled live `gl.info.memory` and `gl.info.render`

## Findings

### 1. The disappearing-scene issue is not currently reproducing as WebGL context loss

In headless stress runs:

- `contextLost = 0`
- `contextRestored = 0`

That means the most likely cause is not immediate GPU context eviction.

### 2. There is a texture leak on render-quality toggles

Fresh-session measurement:

- baseline textures: `107`
- after 12 `medium <-> high` toggles: `184`

By comparison:

- lighting preset toggles: `104 -> 107`
- camera view toggles: `79 -> 107`

So the unstable path is quality switching, not normal preset/view changes.

### 3. Current live render budget is too high for a mobile-web editor default

Representative medium render sample:

- draw calls: `531`
- triangles: `1,892,122`
- textures: `107`

This is well above the current budget target in `scripts/measure-render-budget.mjs`.

## Code-Level Diagnosis

Most likely sources of the quality-toggle texture growth:

1. `ContactShadows`
   - quality changes currently change `resolution`
   - that recreates render targets

2. `ScenePostProcessing`
   - `EffectComposer`, `N8AO`, and `SMAA` mount/unmount across quality changes
   - this is another render-target churn path

3. `AdaptiveQuality`
   - automatic quality up/down movement can repeatedly hit the two paths above
   - repeated oscillation is the wrong behavior until render-target lifetime is made explicit

## Mitigation Applied

- Added WebGL lifecycle counters to render stats
- Added fallback rendering for unloaded/failed model resources
- Added room-model preloading
- Disabled automatic quality *increase* from `PerformanceMonitor`
  - quality can still auto-drop on real pressure
  - this avoids bounce-driven RT accumulation during normal browsing
- Kept `EffectComposer` mounted across quality modes
- Kept `N8AO` mounted with stable internal configuration and quality-dependent intensity only
- Fixed `ContactShadows` render-target resolution across quality modes

## Phase 1 Verification

Fresh-session verification after the runtime-stability changes:

- baseline textures in one fresh session: `90`
- after 12 `medium <-> high` toggles in another fresh session:
  - baseline before toggles: `139`
  - after toggles: `138`

Interpretation:

- the previous monotonic texture growth on quality toggles is no longer reproducing
- the remaining issue is overall budget pressure, not obvious quality-toggle leakage

## Recommended Next Work

### Priority 1: Stop render-target churn while keeping quality

1. Keep post-processing mounted across quality modes
   - prefer `enabled`/intensity toggles over mount/unmount
2. Keep contact-shadow render-target resolution fixed
   - vary opacity/blur, not RT size
3. If adaptive quality is kept, make it one-way-down per session or add a long cooldown

### Priority 2: Reduce texture pressure without visibly hurting quality

1. Convert room, rug, and large environment textures to KTX2
2. Use higher quality compression only for hero albedo maps
3. Reduce roughness/normal map resolution on non-hero props
4. Audit duplicate texture sets in windows and room materials

### Priority 3: Reduce geometry cost where it matters

1. Add LOD or lighter variants for storage/window assets in bird/isometric views
2. Use instancing/merged geometry only for repeated decor where repetition is real
3. Keep high-poly hero assets only for the currently selected / near-camera zone

## Relevant References

- Three.js `WebGLRenderer.info`: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
- Three.js `KTX2Loader`: https://threejs.org/docs/#examples/en/loaders/KTX2Loader
- Three.js `InstancedMesh`: https://threejs.org/docs/#api/en/objects/InstancedMesh
- Three.js `LOD`: https://threejs.org/docs/#api/en/objects/LOD
- React Three Fiber scaling/performance guidance: https://r3f.docs.pmnd.rs/advanced/scaling-performance
