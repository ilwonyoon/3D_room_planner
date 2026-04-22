# 11. Rendering Quality Pipeline

This prototype should treat visual quality as an asset pipeline problem and a
lighting problem, not a Three.js limitation. The no-Blender path is: source
better glTF assets, keep real PBR texture maps, light the room with image-based
lighting plus broad area lights, then compress only after the scene reads well.

## Current Runtime Stack

- Room surfaces use real ambientCG PBR texture sets:
  - `WoodFloor051`: color, normal, roughness, ambient occlusion, displacement
  - `PaintedPlaster017`: color, normal, roughness, displacement
- Product/furniture models use Poly Haven CC0 glTF assets:
  - `modern_arm_chair_01`
  - `CoffeeTable_01`
  - `side_table_01`
  - additional downloaded test assets: `ArmChair_01`,
    `ClassicNightstand_01`, `GothicBed_01`, `mid_century_lounge_chair`,
    `outdoor_table_chair_set_01`
- The hero seating model uses Khronos `SheenWoodLeatherSofa` as a free
  high-quality shader/material test asset. It is CC-BY 4.0, so attribution is
  required if used beyond local experimentation.
- Runtime model is optimized with glTF-Transform:
  - Meshopt geometry compression
  - WebP texture compression
  - 1024px texture cap
- Lighting uses:
  - Poly Haven `poly_haven_studio` HDRI for image-based reflections and fill
  - RectAreaLight window source for soft directional room light
  - Low ambient/hemisphere levels so contact depth is not washed out
- R3F scene uses:
  - sRGB output color space
  - ACES tone mapping
  - environment lighting
  - N8AO and SMAA postprocessing

## Commands

```bash
pnpm assets:setup
pnpm assets:inspect
pnpm typecheck
pnpm build
```

`assets:fetch` downloads source assets into `raw/`, which is intentionally
ignored by Git. `assets:prepare` writes optimized runtime assets into
`public/assets/`.

## What Actually Moves Quality

1. Start with high-quality glTF furniture and room-prop assets.
   Three.js can only render the detail present in the model/materials. Replace
   hero objects made from primitives with real assets that already have bevels,
   normals, roughness variation, and believable proportions.

2. Treat lighting as the main quality lever.
   Use HDRI/PMREM for material response, then add large RectAreaLights that
   mimic windows, softboxes, and practical lamps. Avoid strong ambient-only
   lighting because it removes shape, shadow hierarchy, and material contrast.

3. Use physically plausible materials.
   Every visible hero material should have at least base color, normal,
   roughness, and AO. Fabric and wood need enough geometry bevels and normals to
   avoid the flat toy look.

4. Compress for mobile only after quality is set.
   Source assets can be 2K or 4K. Runtime assets should be capped per tier:
   1024px for hero surfaces, 512px for secondary maps, and KTX2 when `toktx` is
   available.

5. Keep postprocessing restrained.
   N8AO/SMAA/tone mapping are useful. Heavy bloom, SSR, and high-sample shadows
   should be opt-in for high-end devices.

## Next Production Step

Build an asset manifest for a realistic room kit without Blender:

- CC0/royalty-free room shell or room modules as glTF/GLB
- 2K source PBR materials for floor, wall, fabric, metal, wood, and glass
- HDRI presets for studio, daylight, and warm interior lighting
- model dimensions, category, scale factor, attribution, and license
- runtime variants optimized by device tier

Once that exists, keep `AssetRoom.tsx` focused on placement, lighting, shadows,
and interactivity. The visual richness should come from the asset library and
lighting presets, not from hand-built primitive furniture.

## Sources

- ambientCG materials are public domain / CC0: https://ambientcg.com/
- Poly Haven assets and HDRIs are CC0: https://polyhaven.com/
- Khronos glTF Sample Assets: https://github.com/KhronosGroup/glTF-Sample-Assets
- glTF-Transform CLI: https://gltf-transform.dev/
- Three.js color management: https://threejs.org/manual/en/color-management.html
- Three.js PMREM/environment lighting: https://threejs.org/docs/#api/en/extras/PMREMGenerator
- Three.js RectAreaLight: https://threejs.org/docs/#api/en/lights/RectAreaLight
