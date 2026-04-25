# Runtime Asset Optimization Plan

Date: 2026-04-24

## Goal

Raise runtime rendering quality while reducing:

- triangle count
- draw calls
- live texture memory
- quality-toggle instability

without degrading the visual standard of the room planner.

This plan assumes:

- high-quality source assets remain available
- runtime assets can diverge from source assets
- Blender CLI is used for asset preparation, not as the primary runtime lighting solution

## Current Baseline

From current local measurements:

- representative medium render:
  - draw calls: about `531`
  - triangles: about `1,892,122`
  - textures: about `107`
- `webglcontextlost = 0`
- `webglcontextrestored = 0`
- repeated `medium <-> high` quality toggles increase textures from `107 -> 184`

See:

- [docs/20-render-stability-performance-findings.md](/Users/ilwonyoon/Documents/3d_room_planner/docs/20-render-stability-performance-findings.md)

## Core Method

The target pipeline is:

1. `master asset`
   - highest-quality source model
   - not shipped directly to runtime

2. `runtime-lite asset`
   - reduced geometry
   - baked detail transferred to textures
   - mesh compression and texture compression applied

3. `hero asset`
   - used only when visual payoff justifies it
   - selected object, near-camera POV, or premium capture flow

This is an asset-level optimization strategy, not a scene-level full bake strategy.

## Non-Goals

- do not fully bake room lighting as the main planner solution
- do not rely on static lightmaps for movable furniture
- do not keep oscillating adaptive quality as a default strategy
- do not optimize all assets at once

## Success Criteria

### Runtime

- no blank-scene behavior during normal selection, replacement, or view changes
- no texture growth after repeated quality toggles in a fresh session
- automatic quality may degrade, but should not bounce upward during the same session

### Budget

For default mobile-web editor state:

- medium draw calls: `< 300`
- medium triangles: `< 900k`
- medium textures: `< 80`

For hero state:

- temporary budget spikes allowed only for selected object / POV-near interactions

### Visual

- silhouette quality preserved for primary furniture
- material richness preserved through normal/AO/roughness detail maps
- no obvious loss of quality in isometric default mode

## Workstreams

## 1. Runtime Stability First

### Objective

Stabilize renderer lifetime and stop resource churn before touching asset quality.

### Tasks

1. Keep post-processing mounted across quality modes
2. Stop changing expensive render-target structure when quality changes
3. Keep `ContactShadows` target size fixed across quality modes
4. Use quality changes to adjust:
   - opacity
   - blur
   - AO intensity
   - AO radius
   not mount/unmount behavior
5. Keep adaptive quality one-way-down per session unless proven safe

### Relevant code

- [src/scene/IsometricScene.tsx](/Users/ilwonyoon/Documents/3d_room_planner/src/scene/IsometricScene.tsx)
- [src/scene/Lighting.tsx](/Users/ilwonyoon/Documents/3d_room_planner/src/scene/Lighting.tsx)

### Acceptance

- repeated quality toggles no longer increase `gl.info.memory.textures`
- `window.__pocketroomRenderStats.webgl.contextLost` stays `0` during repeated view/preset/quality switching

## 2. Texture Memory Pipeline

### Objective

Reduce texture memory without visibly hurting the room.

### Tasks

1. Convert room shell textures to KTX2 first:
   - wall
   - floor
   - rug
   - large window textures if any
2. Keep color maps higher quality than support maps
3. Reduce roughness/normal/AO resolution on non-hero assets
4. Audit duplicated texture sets across similar assets
5. Introduce explicit hero/runtime texture presets where needed

### Relevant code/scripts

- [scripts/prepare-assets.mjs](/Users/ilwonyoon/Documents/3d_room_planner/scripts/prepare-assets.mjs)
- `pnpm assets:prepare:ktx2`
- [src/scene/AssetRoom.tsx](/Users/ilwonyoon/Documents/3d_room_planner/src/scene/AssetRoom.tsx)

### Acceptance

- fresh-session texture count decreases materially from current baseline
- room shell remains visually consistent in day/warm/night presets

## 3. Geometry Simplification Pipeline

### Objective

Lower triangle cost while preserving the look of premium assets.

### Tasks

1. Pick the worst offenders first:
   - large storage units
   - windows and doors
   - hero chairs
   - decorative complex props
2. For each chosen asset:
   - inspect raw bounds and current poly cost
   - generate simplified runtime mesh
   - bake detail from master mesh to runtime mesh
3. Preserve:
   - silhouette
   - normal detail
   - AO grounding
   - roughness structure
4. Export runtime mesh as glTF
5. Post-process with:
   - mesh quantization
   - meshopt compression
   - optional Draco only when network size matters more than decode cost

### Blender CLI role

Blender CLI is used here for:

- batch import
- simplify / decimate
- UV preparation
- normal bake
- AO bake
- export handoff

It is not used as the runtime lighting solution for the planner.

### Relevant scripts to extend

- [scripts/blender-audit-hero-assets.mjs](/Users/ilwonyoon/Documents/3d_room_planner/scripts/blender-audit-hero-assets.mjs)
- [scripts/blender-create-hero-variants.mjs](/Users/ilwonyoon/Documents/3d_room_planner/scripts/blender-create-hero-variants.mjs)

### New scripts to add

1. `scripts/blender-create-runtime-variants.mjs`
2. `scripts/blender-bake-asset-details.mjs`
3. `scripts/audit-asset-runtime-budget.mjs`

### Acceptance

- target assets show clear triangle reduction
- visually, isometric mode still reads as premium
- replacement interactions keep using runtime-safe assets by default

## 4. Runtime Variant Selection

### Objective

Use the right asset version for the right camera context.

### Policy

- `isometric`:
  - runtime-lite by default
- `bird`:
  - runtime-lite by default
- `pov`:
  - runtime-lite at distance
  - hero variant near camera when necessary
- `selected object`:
  - hero allowed only for the selected object if budget allows

### Implementation options

1. simple variant URL swap
2. LOD per object
3. per-category rule set

### Recommended order

1. start with explicit `runtimeModelUrl` / `heroModelUrl`
2. add camera-distance or selection-aware switching
3. only add full `LOD` where it is worth the added complexity

### Relevant Three.js tools

- `LOD`
- `InstancedMesh`
- `GLTFLoader`
- `KTX2Loader`

## 5. Repetition Optimization

### Objective

Reduce draw calls from repeated decorative content.

### Good candidates

- books
- vases
- repeated shelf props
- simple repeated room accents

### Method

1. merge repeated decorative geometry when static
2. use instancing when repeated assets share geometry/material
3. keep unique hero props out of instancing

### Acceptance

- draw calls drop without visible loss
- editor interaction still works on the objects that must remain individually selectable

## Execution Order

## Progress Notes

As of 2026-04-24:

- Phase 1 was completed in the preceding render-stability slice.
- Phase 2 now has a standalone opt-in KTX2 runtime texture path behind `VITE_ENABLE_KTX2_TEXTURES=true`.
- Phase 3 has a runtime budget audit and seven validated runtime-lite variants. Runtime variants are now enabled by default and can be disabled with `VITE_DISABLE_RUNTIME_VARIANTS=true`.
- Phase 4 has started: product catalog items and placed editor objects now preserve `sourceModelUrl`, `runtimeModelUrl`, and `heroModelUrl` metadata, and model loading resolves runtime-lite by default while allowing the selected object to use its hero/source asset.
- Browser render-budget measurement now runs locally on the default dev server. `VITE_ENABLE_KTX2_TEXTURES=true` remains available as an opt-in texture-compression path.
- Screenshot-based desktop/mobile smoke checks passed for the flagged runtime path. The remaining visual QA is asset-by-asset comparison for newly simplified variants.
- Phase 5 first slice is complete: high-draw-call locked Apple USD desk props are replaced with procedural device props, repeated shelf book props use instanced procedural geometry, and the flagged medium render path now passes the current draw-call, triangle, and texture budgets.

See:

- [docs/22-runtime-texture-ktx2-report.md](/Users/ilwonyoon/Documents/3d_room_planner/docs/22-runtime-texture-ktx2-report.md)
- [docs/asset-runtime-budget.md](/Users/ilwonyoon/Documents/3d_room_planner/docs/asset-runtime-budget.md)
- [docs/runtime-variant-report.md](/Users/ilwonyoon/Documents/3d_room_planner/docs/runtime-variant-report.md)

## Phase 1. Stabilize Runtime

Do first.

1. keep post-processing mounted
2. keep contact shadow RT size fixed
3. verify no texture growth on repeated quality toggles
4. rerun:
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm render:budget --url=http://127.0.0.1:<port>/ --quality=medium`

## Phase 2. Compress Shell Textures

Do second.

1. wall/floor/rug/window textures to KTX2
2. compare before/after texture count and memory
3. visually compare day/warm/night

## Phase 3. Optimize Top 5 Heavy Assets

Do third.

Initial shortlist:

1. primary storage unit
2. secondary storage unit
3. main window
4. hero chair
5. another large furniture piece with complex topology

Per asset:

1. inspect current runtime cost
2. produce runtime variant
3. bake normal/AO detail
4. compress glTF
5. replace in runtime manifest
6. compare screenshot and budget

## Phase 4. Introduce Variant Policy

Do fourth.

1. add `runtimeModelUrl` / `heroModelUrl` metadata
2. switch selected object or near-POV object to hero only
3. keep isometric default on runtime-lite

Status:

- `sourceModelUrl`, `runtimeModelUrl`, and `heroModelUrl` metadata are now available on product catalog entries and carried onto placed editor objects.
- Runtime-lite loading is enabled by default and can be disabled through `VITE_DISABLE_RUNTIME_VARIANTS=true`.
- Selection-aware loading is implemented for explicit hero/source fallback on the selected object.
- Camera-distance switching is still pending browser visual QA.

## Phase 5. Repeated Decor Optimization

Do fifth.

1. books and repeated shelf props
2. instancing or merged variants
3. preserve selection only where UX requires it

Status:

- Locked iMac, MacBook, and HomePod desk props now use procedural render kinds instead of high-draw-call USD assets.
- Repeated shelf book props now use one instanced procedural book stack per placed object.
- Current flagged medium render budget:
  - max draw calls: `131`
  - max triangles: `296,241`
  - max textures: `73`
- Current default medium render budget also passes these targets after runtime-lite was promoted to default.

## Deliverables

## Code

- stable render-quality transitions
- KTX2-based shell textures
- runtime/hero asset variant support
- initial optimized hero asset set

## Scripts

- runtime-variant Blender CLI script
- asset detail bake script
- per-asset runtime budget audit

## Docs

- per-asset optimization playbook
- runtime variant rules
- updated render budget report

## Validation Checklist

For every completed phase:

1. `pnpm typecheck`
2. `pnpm build`
3. headless browser open with no console errors
4. render-budget measurement
5. visual comparison screenshot against prior baseline

## Recommended First Implementation Slice

The first actual implementation slice should be:

1. fix quality-toggle RT churn
2. compress room shell textures with KTX2
3. optimize one storage asset and one window asset end-to-end

Reason:

- this attacks both current instability and the largest visible costs
- it creates a reusable pipeline before scaling to the full catalog

## External References

- Three.js `GLTFLoader`: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js `KTX2Loader`: https://threejs.org/docs/pages/KTX2Loader.html
- Three.js `WebGLRenderer`: https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js `LOD`: https://threejs.org/docs/pages/LOD.html
- React Three Fiber scaling/performance: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- React Three Fiber pitfalls: https://r3f.docs.pmnd.rs/advanced/pitfalls
- Blender command line rendering: https://docs.blender.org/manual/en/3.5/advanced/command_line/render.html
- Blender Cycles baking: https://docs.blender.org/manual/en/dev/render/cycles/baking.html
- Blender Decimate modifier: https://docs.blender.org/manual/en/2.80/modeling/modifiers/generate/decimate.html
