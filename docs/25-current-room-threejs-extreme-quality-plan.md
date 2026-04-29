# 25. Current Room Three.js Extreme Quality Plan

작성일: 2026-04-29

## Goal

현재 default room 하나만 대상으로 Three.js runtime 품질을 최대한 끌어올린다. 목표는 "더 많은 옵션"이 아니라 "오후 2시 자연광이 들어오는, 밀도 있고 접지감 있는 작은 interior render"다.

이번 계획은 다음을 명확히 제외한다.

- Day / Warm / Night lighting toggle 유지
- 임의의 고퀄리티 가구 대량 교체
- 검증되지 않은 full-room furniture footprint bake
- 화면을 밝게 만드는 방식의 품질 상승

## Current Diagnosis

### 1. 현재 문제는 asset 수보다 lighting coherence다

현재 방은 이미 desk, storage, chair, sofa, rug, plant, decor, lighting props를 갖고 있다. 사용자가 체감하는 "퀄리티가 낮음"은 주로 다음에서 발생한다.

- 방 전체가 너무 밝고 fill light가 많아 형태가 납작해진다.
- desk/table 상판이 날아가고, floor와 wall은 roughness/contrast가 균일해 보인다.
- object contact shadow가 일부 view에서 약하거나 떠 보인다.
- window에서 들어오는 빛의 방향성이 충분히 보이지 않는다.
- preset이 3개라 실제 목표가 분산된다.

결론: 새 asset 확보보다 먼저 single lighting rig, shadow camera, material response를 고정해야 한다.

### 2. 이전 실패 원인

- Full-room Cycles footprint bake는 top/bird view에서 blotch와 비정상적인 shadow stain을 만들었다.
- 4K furniture bake는 source material을 보존하지 못하고 procedural atlas로 평평하게 만들었다.
- grid/mask 계열 시도는 방 geometry와 camera transform이 아니라 overlay처럼 동작할 때 바로 어색해졌다.
- artifact asset을 무리하게 교체하면 interior quality보다 구성 통일성이 더 나빠졌다.

따라서 이번 품질 계획은 "더 강한 bake"가 아니라 "runtime에서 확실히 통제되는 조명/그림자/재질"을 우선한다.

## Research Notes

### Three.js shadow strategy

Three.js shadow map은 shadow-casting light마다 scene을 light camera 관점에서 다시 그린다. 여러 shadow light를 켜면 draw cost가 급격히 증가하므로, 현재 방은 "one shadow-casting directional sun + cheap contact support"가 맞다.

DirectionalLight shadow는 orthographic shadow camera 영역이 넓을수록 같은 map size가 더 넓은 공간에 퍼져 blocky해진다. 따라서 shadow quality의 핵심은 map size를 무작정 올리는 것이 아니라, 현재 방 footprint에 맞게 shadow camera box를 최대한 타이트하게 잡는 것이다.

Implication:

- shadow-casting light는 하나만 둔다.
- medium/high 모두 directional shadow를 켜되, shadow camera bounds를 방 크기에 맞춘다.
- `bias`와 `normalBias`를 함께 튜닝해 acne와 peter-panning을 모두 점검한다.
- point light shadow는 사용하지 않는다.

### Color and tone mapping

현재 renderer는 `SRGBColorSpace`와 `ACESFilmicToneMapping`을 이미 사용한다. 방향은 맞다. 다만 품질 저하는 color management 부재보다 lighting ratio와 material roughness가 더 크다.

Implication:

- tone mapping은 유지한다.
- exposure를 올려 밝게 만드는 방식은 금지한다.
- texture color space는 source texture 성격에 맞춰 유지한다.
- baked mask는 color texture처럼 보이면 안 되고, lighting support layer로만 낮은 opacity에서 사용한다.

### R3F performance envelope

현재 `frameloop="demand"`는 정적 room planner에 맞는 선택이다. R3F 문서 기준으로 runtime mount/unmount, fast state update, loader 중복, render target churn을 줄이는 것이 중요하다.

Implication:

- lighting preset toggle 제거는 UI 단순화뿐 아니라 runtime branch와 remount risk도 줄인다.
- quality tier 변경 시 render target resolution을 계속 바꾸지 않는다.
- ContactShadows, postprocessing, loaded GLB resources는 안정적으로 유지한다.
- camera/transform interaction은 imperative update + invalidate 중심으로 유지한다.

### Asset optimization

glTF Transform은 inspect, optimize, dedup, join, meshopt, resize, KTX/Basis compression 같은 도구를 제공한다. 하지만 현재 방은 이미 medium budget 근처에서 동작하고 있고, 무조건적인 geometry/texture bake가 시각 품질을 올린다는 보장은 없다.

Implication:

- source PBR material이 괜찮은 asset은 보존한다.
- broken material rescue와 high-quality material preserve를 분리한다.
- texture compression은 memory/performance 목적이지, visual richness를 자동으로 올리는 작업이 아니다.

## North Star Render

단일 target:

- 시간대: 오후 2시
- 빛: 창문 방향에서 들어오는 차갑지 않은 자연광
- 분위기: 밝지만 flat하지 않음
- 그림자: object 아래 contact는 선명하고, 큰 그림자는 부드럽게 떨어짐
- floor: 낮은 반사율, 높은 roughness, wood grain은 보이되 번들거리지 않음
- desk: pure white overexposure 금지, 상판 edge와 leg 그림자가 읽혀야 함
- wall/storage: 너무 깨끗한 flat plane이 아니라 약한 ambient occlusion과 corner depth가 있어야 함

## Implementation Plan

### Phase 0. Baseline Lock

현재 화면을 먼저 고정한다.

Commands:

```bash
pnpm build
pnpm render:quality-metrics --views=isometric,bird,pov --quality=high --hero-sets=baseline
pnpm render:budget --quality=medium
```

Required screenshots:

- isometric full room
- bird/top room
- POV desk close-up
- selected object mode near desk/storage

Acceptance:

- 변경 전 screenshot path와 JSON path를 문서에 기록한다.
- 이후 모든 변경은 이 baseline과 A/B로 비교한다.

### Phase 1. Remove Lighting Presets

작업:

- `LightingPresetId`를 단일 `afternoon-natural`로 축소한다.
- `EditorTopBar`에서 Day/Warm/Night segmented control을 제거한다.
- `AssetRoom`의 night-specific window/material branch를 제거하거나 dead branch로 분리한다.
- debug bridge와 metric script가 단일 preset을 기준으로 돌도록 갱신한다.

Acceptance:

- UI 상단에 Day/Warm/Night가 없다.
- render metrics가 preset 3개를 돌지 않고 current room one target만 돈다.
- visual comparison noise가 줄어든다.

### Phase 2. Rebuild Natural Light Rig

작업:

- `Lighting.tsx`를 single preset 중심으로 정리한다.
- window RectAreaLight는 soft window brightness만 담당한다.
- DirectionalLight 하나만 shadow-casting sun 역할을 한다.
- ambient, hemisphere, fill, bounce intensity를 낮춰 contrast를 회복한다.
- desk/floor practical light는 자연광 모드에서 visual detail용으로만 아주 약하게 둔다.

Initial target values:

- environment intensity: `0.16 - 0.24`
- ambient intensity: `0.002 - 0.006`
- hemisphere intensity: `0.035 - 0.065`
- window area power: current보다 약간 낮거나 동일, exposure로 보정 금지
- sun directional intensity: `0.85 - 1.35` range에서 screenshot 기반 조정
- renderer exposure: `0.86 - 0.96`

Acceptance:

- desk 상판이 하얗게 날아가지 않는다.
- wall/floor corner가 읽힌다.
- window contribution이 floor/wall에 보인다.
- scene이 이전보다 어둡더라도 형태 정보가 더 좋아야 한다.

### Phase 3. Shadow Camera and Contact Grounding

작업:

- medium/high 모두 directional shadow를 사용한다.
- medium map: `1024`, high map: `2048`부터 시작한다.
- shadow camera orthographic bounds를 room footprint에 맞춰 좁힌다.
- `bias`와 `normalBias`를 명시적으로 조정한다.
- ContactShadows는 preset별이 아니라 current room용 one config로 만든다.

Initial target values:

- `shadow-camera-left/right`: room x extent + small margin
- `shadow-camera-top/bottom`: room z extent + small margin
- `shadow-camera-near/far`: sun position 기준으로 실제 room만 포함
- `bias`: `-0.00012` to `-0.00032`
- `normalBias`: `0.015` to `0.055`
- ContactShadows opacity: `0.34 - 0.46`
- ContactShadows blur: `1.6 - 2.4`
- ContactShadows far: `1.2 - 1.8`

Acceptance:

- chair, desk legs, storage, sofa, decor가 floor에 붙어 보인다.
- object bottom이 너무 검게 뭉치지 않는다.
- top/bird view에서 shadow artifact가 방 전체를 더럽히지 않는다.
- selected object mode에서도 outline/control과 shadow가 충돌하지 않는다.

### Phase 4. Material Response Pass

작업:

- floor roughness를 높이고 env reflection을 낮춘다.
- desk material은 pure white가 아니라 warm off-white로 낮춘다.
- storage/shelf wood는 black block artifact 없이 base map과 override가 항상 같은 path에서 보이게 한다.
- wall material은 flat grey가 아니라 subtle warm neutral로 정리한다.
- metals은 highlight만 살리고 scene brightness를 올리는 역할을 하지 않게 한다.

Acceptance:

- desk close-up에서 leg, top, props separation이 보인다.
- shelf/storage에 검은 block placeholder가 다시 나오지 않는다.
- floor가 젖은 듯 반사되지 않는다.
- 밝은 부분과 어두운 부분의 ratio가 screenshot에서 안정적이다.

### Phase 5. Static Support Bakes Only

작업:

- 현재 `floor-static-ao`, `floor-window-wash`, wall AO/glow는 유지하되 one natural mode에 맞게 opacity를 재튜닝한다.
- object footprint를 bake texture에 넣지 않는다.
- bake output은 physical lightmap처럼 과신하지 않고, runtime shadow를 보조하는 low-opacity layer로만 쓴다.

Acceptance:

- floor/window wash가 overlay rectangle처럼 보이지 않는다.
- bird/top view에서 얼룩이 생기지 않는다.
- static support layer를 껐을 때보다 corner/window depth가 좋아진다.

### Phase 6. Performance Guard

Medium default target:

- draw calls: `<= 180`
- triangles: `<= 450k`
- live textures: `<= 90`
- WebGL context loss: `0`
- repeated view/object selection does not increase texture count monotonically

Allowed high-quality target:

- high may use stronger shadow/contact settings, but still must remain interactive.
- high cannot rely on a second shadow-casting light.

Acceptance command:

```bash
pnpm render:budget --quality=medium
```

### Phase 7. Visual Verification Loop

Every promoted change must pass:

```bash
pnpm build
pnpm render:quality-metrics --views=isometric,bird,pov --quality=high --hero-sets=baseline
pnpm render:budget --quality=medium
```

Manual screenshot checks:

- isometric: full room reads as one coherent space
- bird: no bake blotch, no giant black artifact
- POV desk: desk/storage/chair are not intersecting and not overexposed
- selected object: object material does not change only after click
- rotate left/right: camera movement still works and shadow follows world geometry

Promotion rule:

- metric improvement alone is not enough.
- screenshot must look better in the user-problem crops.
- if metric rises but desk/top/bird screenshot is worse, reject.

## Execution Order

1. Create baseline screenshots and metric JSON.
2. Remove Day/Warm/Night UI and single-source the lighting preset.
3. Rebuild `Lighting.tsx` around one afternoon natural rig.
4. Tighten directional shadow camera and enable medium shadow.
5. Tune ContactShadows for current room only.
6. Run material response pass on floor, desk, wall, shelf/storage, sofa/chair.
7. Re-tune static room overlays after runtime light is stable.
8. Run screenshot and budget verification.
9. Commit only after no visual regression in the target crops.

## Anti-Patterns To Avoid

- Raising exposure to make the room feel higher quality.
- Adding more shadow-casting lights.
- Replacing coherent furniture with random high-poly models.
- Baking source material into a procedural atlas if it removes real PBR detail.
- Fixing one screenshot crop while breaking bird/top view.
- Changing camera, object placement, and lighting in the same pass without a baseline.

## Execution Log

### 2026-04-29 pass

Implemented:

- Removed the visible Day / Warm / Night segmented control from the editor top bar.
- Collapsed `LightingPresetId` to one `afternoon-natural` target.
- Rebuilt runtime lighting around one afternoon natural light rig:
  - one window RectAreaLight
  - one shadow-casting DirectionalLight
  - restrained ambient/hemisphere/fill/bounce
  - very low practical lamp accents
- Enabled dynamic directional shadows for medium and high quality.
- Tightened directional shadow camera bounds against the current room footprint.
- Added `normalBias` to reduce shadow acne/peter-panning tuning risk.
- Replaced preset-specific ContactShadows with one current-room contact-shadow config.
- Reduced floor/wall/support bake opacity so top/bird view does not read as stained.
- Retuned floor, wall, desk, storage, and wood material response toward higher roughness and lower environment reflection.
- Updated render quality and budget scripts to measure the single `afternoon-natural` target.

Baseline before this pass:

```bash
pnpm build
pnpm render:quality-metrics --url=http://127.0.0.1:5175/ --views=isometric,bird,pov --quality=high --hero-sets=baseline --out-dir=output/render-quality-metrics/baseline-current-room-2026-04-29
pnpm render:budget --url=http://127.0.0.1:5175/ --quality=medium --out-dir=output/render-budget/baseline-current-room-2026-04-29
```

Baseline artifacts:

- `output/render-quality-metrics/baseline-current-room-2026-04-29/2026-04-29T18-23-51-505Z.json`
- Average perceptual proxy score across old Day/Warm/Night matrix: `61.0`
- Medium budget: draw calls `181`, triangles `472,787`, textures `116`

Final verification:

```bash
pnpm build
pnpm render:quality-metrics --url=http://127.0.0.1:5175/ --views=isometric,bird,pov --quality=high --hero-sets=baseline --out-dir=output/render-quality-metrics/afternoon-natural-pass2-2026-04-29
pnpm render:budget --url=http://127.0.0.1:5175/ --quality=medium --out-dir=output/render-budget/afternoon-natural-pass2-2026-04-29
```

Final artifacts:

- `output/render-quality-metrics/afternoon-natural-pass2-2026-04-29/2026-04-29T18-33-36-011Z.json`
- `output/render-quality-metrics/afternoon-natural-pass2-2026-04-29/2026-04-29T18-33-36-011Z-base-iso-natural.png`
- `output/render-quality-metrics/afternoon-natural-pass2-2026-04-29/2026-04-29T18-33-36-011Z-base-bird-natural.png`
- `output/render-quality-metrics/afternoon-natural-pass2-2026-04-29/2026-04-29T18-33-36-011Z-base-pov-natural.png`
- `output/playwright/afternoon-natural-isometric.png`
- `output/playwright/afternoon-natural-bird.png`
- `output/playwright/afternoon-natural-pov.png`
- `output/playwright/afternoon-natural-selected-desk.png`

Final single-preset scores:

- Average perceptual proxy score: `63.7`
- Isometric: `57.2`
- Bird: `51.7`
- POV: `82.1`

Final medium budget:

- Draw calls: `169`
- Triangles: `251,329`
- Live textures: `51`
- WebGL context lost: `0`

Result:

This pass does not solve every asset-quality limitation, but it finishes the current requested renderer direction: a single afternoon-natural room, no lighting toggle, lower runtime budget, no visible shelf black-block regression in verification screenshots, stronger grounding, and materially less over-bright fill than the previous multi-preset setup.

### 2026-04-29 matte wood floor pass

Diagnosis:

- The floor still read like glass because two systems were combining:
  - the physical floor material still consumed a roughness map and relief maps, which can preserve localized highlights even at high scalar roughness
  - the sunlight/window-wash overlays used high-contrast bright passes that looked like reflected window shapes instead of diffuse light on matte wood

Research implication from Three.js PBR:

- `MeshStandardMaterial` roughness controls microsurface scattering, while roughness maps modulate roughness per texel. For a matte residential wood floor in this stylized room, the runtime should avoid a glossy roughness map response and keep environment reflection near zero.

Implemented:

- Set floor `roughness` to `1`.
- Disabled the floor `roughnessMap`.
- Set floor `envMapIntensity` to `0`.
- Reduced floor normal, AO, and displacement response.
- Reduced `floor-window-wash` opacity.
- Changed the sunlight patch from additive/glowing to a normal blended, tone-mapped diffuse pass.
- Softened and blurred the window-frame stripe texture so it reads as scattered sunlight on wood rather than mirror reflection.

Verification:

```bash
pnpm build
```

Screenshots:

- `output/playwright/diffuse-wood-floor-isometric.png`
- `output/playwright/diffuse-wood-floor-pov.png`

## Sources

- Three.js shadows manual: https://threejs.org/manual/en/shadows.html
- Three.js color management manual: https://threejs.org/manual/en/color-management.html
- Three.js WebGLRenderer docs: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
- Three.js MeshStandardMaterial docs: https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
- Three.js DirectionalLightShadow docs: https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow
- React Three Fiber performance pitfalls: https://r3f.docs.pmnd.rs/advanced/pitfalls
- React Three Fiber scaling performance: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- glTF Transform CLI: https://gltf-transform.dev/cli
