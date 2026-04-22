# 12. Rendering Next-Step Research

Research date: 2026-04-22
Branch: `research/rendering-quality-next-step`

## Executive Read

Three.js is not the limiting factor for the next visible quality step. The
current app already uses the right baseline stack: PBR materials, HDRI
environment lighting, broad RectAreaLights, ACES tone mapping, N8AO, SMAA,
Meshopt-compressed GLBs, and WebP texture compression.

The next step should be a controlled renderer-quality branch, not a rewrite.
The highest-value work is:

1. Add missing room-surface AO maps and tune material response.
2. Replace remaining procedural hero props with curated GLB assets already in
   the repository.
3. Introduce quality tiers for shadows, AO, DPR, and postprocessing.
4. Move runtime texture compression from WebP/JPEG toward KTX2/BasisU.
5. Treat WebGPU/TSL as a later experimental lane, not the next production step.

## Current Implementation Baseline

### Runtime Renderer

- `src/scene/IsometricScene.tsx` uses an orthographic R3F canvas with
  `frameloop="demand"`, DPR `[1, 1.5]`, sRGB output, ACES tone mapping,
  fog, shadows, contact shadows, N8AO, adaptive tone mapping, and SMAA.
- `src/scene/Lighting.tsx` uses a Poly Haven HDRI, low ambient fill,
  hemisphere fill, two RectAreaLights, and one shadow-casting DirectionalLight.
- `src/scene/AssetRoom.tsx` applies PBR texture maps to floor/wall surfaces,
  clones GLB furniture, enables cast/receive shadow, and raises
  `envMapIntensity` on loaded standard/physical materials.

### Asset Pipeline

- `scripts/prepare-assets.mjs` optimizes GLB models with:
  - `gltf-transform optimize`
  - Meshopt geometry compression
  - WebP texture compression
  - 1024 texture cap
- Current local asset inventory:
  - 158 runtime GLB files
  - `public/assets/models`: 39 MB
  - `public/assets/textures-runtime`: 99 MB
  - `public/assets/hdri`: 1.6 MB
  - `public/assets/model-thumbnails`: 13 MB
- Representative `gltf-transform inspect` results:
  - `sheen-wood-leather-sofa`: 115,614 render vertices, WebP textures,
    occlusion maps, sheen/specular extensions, 1.2 MB file.
  - `modern_arm_chair_01`: 21,087 render vertices, two materials, six 1024
    textures, about 33.5 MB estimated minimum texture GPU allocation.
  - `CoffeeTable_01`: 29,625 render vertices, three 1024 textures.
  - `potted_plant_01`: 461,283 render vertices, 2.5 MB file, heavy enough to
    gate behind a high-quality tier or simplify before using as a default prop.

### Browser Check

The app loads successfully at `http://127.0.0.1:5188/` with no console errors.
Warnings observed:

- `THREE.Clock` deprecated; use `THREE.Timer` eventually.
- `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated`.
- Two `glBlitFramebuffer` warnings around depth/stencil blit, likely from the
  current `EffectComposer` multisampling/normal-pass setup.

Build and typecheck pass. Production build warns about large JS chunks:

- `three`: 732.58 kB minified, 188.62 kB gzip
- `r3f`: 541.06 kB minified, 166.63 kB gzip
- app chunk: 592.34 kB minified, 271.52 kB gzip
- PWA precache: 193 entries, 16.34 MB

## Findings

### 1. Room Materials Are Close, But AO Is Not Wired

The room catalog knows color, normal, roughness, and displacement maps, but not
ambient occlusion. `makePlaneGeometry()` already creates `uv2`, so the runtime
has the key requirement for `MeshStandardMaterial.aoMap`. Some downloaded
floor texture sets include ambient occlusion maps, and GLB assets already use
occlusion textures where present.

This is a low-risk quality win. AO will help the floor-wall corner, baseboards,
and plaster/wood detail read less flat without adding heavy dynamic lighting.

Recommended experiment:

- Extend `RoomMaterialMaps` with optional `ao`.
- Populate it when `${id}_AmbientOcclusion.jpg` exists.
- Add `aoMap` and `aoMapIntensity` to floor/wall materials.
- Keep intensity conservative: floor `0.45-0.75`, wall `0.25-0.45`.

### 2. Remaining Procedural Props Lower The Perceived Ceiling

The main room mixes good GLB furniture with procedural window/curtains, lamp,
plant, and wall art. These are useful for interaction, but they cap realism.
The repository already contains higher-quality candidates in the product and
room-setting catalogs:

- windows and doors from Kenney environment models
- lamps from Poly Haven
- picture frames, mirrors, clocks, vases, and decor from Poly Haven
- plants from Poly Haven, with simplification needed for heavy outliers

Recommended experiment:

- Replace only the seeded visible defaults first, not the whole catalog.
- Use GLB defaults for wall decor and lamp.
- For plants, avoid `potted_plant_01` as a default unless simplified; it is a
  render-vertex outlier.
- Keep transparent procedural hitboxes separate from render meshes.

### 3. Shadows Need A Quality Tier, Not A Single Global Setting

Current scene uses both dynamic shadow maps and contact shadows. This can look
good on desktop but is not an ideal mobile default. Three.js RectAreaLight does
not support shadows, so realistic soft window shadows need either contact-style
approximations, accumulated planar shadows, or precomputed asset/texture detail.

Recommended experiment:

- Low/default tier: ContactShadows + N8AO, no dynamic DirectionalLight shadows.
- Medium tier: 512 DirectionalLight shadow map updated only after placement
  changes.
- High tier: Drei AccumulativeShadows after camera/object settle.
- Fix the PCFSoftShadowMap warning by explicitly using a supported shadow map
  type or avoiding global dynamic shadows in the default tier.

### 4. Postprocessing Is Useful, But The Current Composer Needs A Pass Audit

N8AO and SMAA are appropriate, but the browser warning points at the current
multisampling/depth path. Because the app is already render-on-demand,
postprocessing cost is less about battery during idle and more about interaction
latency and device compatibility.

Recommended experiment matrix:

- `EffectComposer multisampling={0}` vs `2`
- `enableNormalPass` on/off
- N8AO radius/intensity presets per quality tier
- ToneMapping adaptive on/off, because renderer ACES tone mapping is already
  configured

Success criteria:

- no WebGL blit warnings
- no visual regression in room contact depth
- no obvious shimmer at DPR 1.0

### 5. WebP Reduces Transfer Size, Not GPU Memory Enough

The GLB files are compact, but 1024 WebP textures are still uploaded as normal
GPU textures. `gltf-transform inspect` estimates about 5.59 MB GPU allocation
per 1024 texture. This is why small GLB files can still become heavy on mobile.

Recommended experiment:

- Add an opt-in KTX2 path in `prepare-assets.mjs`.
- Use UASTC for normal/occlusion/metallicRoughness maps.
- Use ETC1S where visual quality allows for base color.
- Add a KTX2 loader path for both GLB textures and standalone room textures.
- Keep WebP/JPEG fallback until the KTX2 path is stable.

### 6. Asset Scale And Catalog Metadata Affect Realism

`FurnitureModel` scales by the loaded asset's max dimension and catalog
`targetSize`. Product catalog dimensions are category-level defaults for many
items, not asset-specific measured bounds. This can make otherwise good models
feel toy-like or inconsistent when mixed.

Recommended experiment:

- Generate asset-specific bounds metadata from `gltf-transform inspect` or a
  small Three.js bounds script.
- Store real dimensions, default scale, shadow footprint, and quality tier.
- Use the metadata for default placement, catalog labels, hitboxes, and camera
  framing.

### 7. WebGPU/TSL Is Real, But Not The Next Production Move

Three.js WebGPU and TSL open doors for newer postprocessing, node materials,
MRT, and compute-style workflows. But the official Three.js manual still calls
WebGPURenderer experimental, and the current app depends on the WebGL-era
R3F/drei/postprocessing path.

Recommendation:

- Do not port the app to WebGPU for this step.
- Create a separate spike later for WebGPU + TSL material experiments.
- Keep the production renderer on WebGL2 until material, effect, and mobile
  browser behavior are proven.

## Suggested Implementation Order

### Pass 1: Immediate Visual Lift

1. Wire optional AO maps into room materials.
2. Replace default procedural wall art/lamp/plant with curated GLB variants.
3. Reduce grid visual dominance when not actively placing.
4. Tune wall/floor roughness, normal scale, AO intensity, and exposure against
   desktop and 375x812 mobile screenshots.

Expected result: visibly richer corners, less flat walls/floor, more believable
room objects, minimal architecture risk.

### Pass 2: Stability And Quality Tiers

1. Add a `renderQuality` store: `low | medium | high`.
2. Gate N8AO, shadow maps, contact/accumulative shadows, and DPR by tier.
3. Add Drei `PerformanceMonitor` to degrade gracefully.
4. Resolve `EffectComposer` blit warnings through the pass matrix above.

Expected result: higher top-end quality without making mobile default fragile.

### Pass 3: Asset Pipeline Upgrade

1. Add KTX2/BasisU output variant to `prepare-assets.mjs`.
2. Add asset metadata generation for bounds, texture count, vertex count, and
   quality tier.
3. Simplify or gate outlier assets such as heavy plants.
4. Stop precaching large thumbnail sets by default; cache runtime assets on
   demand.

Expected result: better memory behavior, higher usable texture quality, less
startup weight.

### Pass 4: Advanced Renderer Lab

1. Build a non-production WebGPU/TSL scene behind a separate route or flag.
2. Test TSL detail maps for close-up material richness.
3. Test node-based bloom or selective emissive bloom for lamps only.
4. Test mirror/glass materials with high-tier-only reflections.

Expected result: informed decision on whether WebGPU is worth a future port.

## Non-Goals For This Step

- Full Blender/Cycles lightmap workflow.
- Replacing the whole product catalog.
- Full WebGPU migration.
- Heavy SSR everywhere.
- Photorealism through postprocessing alone.

## Source Notes

- Three.js `MeshStandardMaterial` supports `aoMap`, and the docs note it needs
  a second UV set.
  https://threejs.org/docs/api/en/materials/MeshStandardMaterial
- Three.js `RectAreaLight` is appropriate for windows/strip lights, but the
  docs state it has no shadow support.
  https://threejs.org/docs/pages/RectAreaLight.html
- Three.js `PMREMGenerator` explains why prefiltered environment maps are
  central to physically based image lighting.
  https://threejs.org/docs/pages/PMREMGenerator.html
- Three.js `MeshPhysicalMaterial` supports clearcoat, IOR, transmission,
  attenuation, iridescence, and related properties for higher-end glass,
  plastics, coatings, and metals.
  https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- Three.js `WebGLRenderer.shadowMap` docs describe manual shadow-map update
  control through `autoUpdate` and `needsUpdate`.
  https://threejs.org/docs/api/en/renderers/WebGLRenderer.html
- Three.js WebGPU manual says WebGPURenderer is improving but still
  experimental, while WebGLRenderer remains recommended for pure WebGL2 apps.
  https://threejs.org/manual/en/webgpurenderer
- Three.js TSL docs show the direction for renderer-agnostic node materials and
  node-based postprocessing.
  https://threejs.org/docs/TSL.html
- glTF Transform documents Meshopt, WebP, UASTC, and ETC1S workflows.
  https://gltf-transform.dev/
- Drei `PerformanceMonitor` supports adaptive quality degradation.
  https://drei.docs.pmnd.rs/performances/performance-monitor
- Drei `Lightformer` can add HDRI-like light shapes inside an environment
  without the cost of many realtime lights.
  https://drei.docs.pmnd.rs/staging/lightformer
- Drei `AccumulativeShadows` can accumulate soft planar shadows with zero
  ongoing cost after accumulation.
  https://drei.docs.pmnd.rs/staging/accumulative-shadows
