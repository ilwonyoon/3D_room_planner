# 22. Current Room Extreme Quality Plan

작성일: 2026-04-28

## Goal

현재 default room을 기준으로 앱 렌더, Blender reference render, static bake, quality harness가 같은 방과 같은 가구를 보게 만든다. 이후 모든 퀄리티 판단은 스크린샷과 수치가 함께 남는 방식으로 검증한다.

## Current Diagnosis

- Blender reference scene이 예전 `4.2m x 5.0m x 2.4m` 방과 예전 가구를 사용하고 있었다.
- 현재 앱의 default room은 `5.4m x 5.8m x 2.72m`이고, 라운지/데스크/리딩 영역까지 포함한 더 복잡한 구성이다.
- Light bake 스크립트도 예전 window 위치를 기준으로 floor/window wash를 만들고 있었다.
- Render quality harness의 hero set 일부가 현재 존재하지 않는 object id를 patch하고 있었다.
- 이전 black blob 이슈처럼 특정 asset artifact가 생겨도 기존 metric은 contrast/occupancy로만 해석해 놓칠 수 있었다.

## Phase 1. Source Of Truth Sync

Acceptance:

- Blender reference `ROOM`이 현재 default room 치수와 일치한다.
- Blender reference object list가 현재 default room의 주요 GLB asset과 일치한다.
- Decompressed model preparation list가 같은 asset set을 사용한다.

Commands:

```bash
pnpm blender:render-reference
```

## Phase 2. Blender Reference Scene Upgrade

Acceptance:

- Cycles denoise가 켜져 있고, reference sample count가 quality 비교에 충분하다.
- 창문, 베이스보드, rug, desk electronics, wall art는 reference에서 최소 proxy로라도 보인다.
- 바닥은 낮은 반사율/높은 roughness의 목재로 처리한다.

Primary artifact:

- `output/blender/current-room-reference-daylight.png`

## Phase 3. Static Bake Recalibration

Acceptance:

- Floor/static AO, floor/window wash, wall AO/glow가 현재 room dimensions와 window center를 기준으로 다시 생성된다.
- Generated PNG는 runtime material이 그대로 consume한다.

Commands:

```bash
pnpm blender:bake-room-lighting
```

## Phase 4. Harness Engineering

Acceptance:

- Hero set은 현재 room object id만 patch한다.
- `darkBlobRatio`를 추가해 큰 검정 덩어리 artifact를 페널티로 잡는다.
- Score report가 screenshot path와 artifact metric을 같이 기록한다.

Commands:

```bash
pnpm render:quality-metrics --url=http://127.0.0.1:5190/ --views=isometric,bird,pov --quality=high --hero-sets=all
```

## Phase 4B. Furniture Texture Bake

Acceptance:

- Hero furniture GLBs have generated Blender CLI bake variants.
- Each baked variant keeps one embedded 4096px atlas texture to avoid material-level texture fanout.
- Heavy furniture uses runtime-lite geometry as the bake input where needed, so visual quality work does not exceed the medium render budget.
- Baked furniture variants remain opt-in until their visual quality beats the curated runtime/material path.

Commands:

```bash
pnpm blender:bake-furniture-4k
```

## Phase 5. Visual Browser Verification

Acceptance:

- Playwright screenshot을 남긴다.
- Isometric/bird/pov view가 모두 열리고, debug camera switching이 동작한다.
- 중심 방과 주변 grid/floor presentation이 시각적으로 깨지지 않는다.

Primary artifacts:

- `output/playwright/current-room-quality-isometric.png`
- `output/playwright/current-room-quality-bird.png`
- `output/playwright/current-room-quality-pov.png`

## Phase 6. Performance Guard

Acceptance:

- Render budget report가 최신 화면 기준으로 갱신된다.
- 품질 개선이 과도한 draw/runtime regression을 만들지 않았는지 확인한다.

Commands:

```bash
pnpm render:budget --url=http://127.0.0.1:5190/ --quality=medium
```

## Phase 7. Commit

Acceptance:

- Plan, scripts, generated bake/reference/report artifacts가 같은 commit에 묶인다.
- Commit message는 현재 방 품질 파이프라인 동기화를 명확하게 설명한다.

## Execution Result

실행일: 2026-04-28

Completed:

- Blender reference scene을 현재 `5.4m x 5.8m x 2.72m` default room으로 동기화했다.
- Current room 주요 GLB asset을 reference render model list에 반영했다.
- Blender daylight reference를 `output/blender/current-room-reference-daylight.png`로 생성했다.
- 현재 room/window 기준으로 static bake PNG를 다시 생성했다.
- `darkBlobRatio` artifact metric을 render quality harness에 추가했다.
- 현재 object id 기준의 hero set만 남겼다: `baseline`, `lounge-accents`, `designer-lamps`.
- Hackney sofa와 potted plant 01 runtime-lite variants를 추가해 medium runtime budget을 target 아래로 낮췄다.
- Runtime floor/wall material의 displacement, normal, AO 세기를 낮춰 회색 speckle과 지저분한 표면 노이즈를 줄였다.
- `localContrast`가 표면 노이즈를 과보상하지 않도록 적정 band 기반 scoring으로 보정했다.
- Default room이 너무 비어 보이는 문제를 줄이기 위해 sofa textile layer를 추가하고 wall art scale을 키웠다.
- Area rug material의 roughness를 높이고 normal/displacement/AO 세기를 낮춰 바닥 반사율과 표면 노이즈를 더 차분하게 맞췄다.
- Desk styling set과 reading floor cushion을 procedural accent로 추가해 데스크/라운지/리딩 영역 사이의 생활감과 밀도를 높였다.
- 고폴리 Lotus Vase 후보는 runtime budget을 초과시켜 기본값에서 제외하고, budget-safe brass vase와 Serif Vase 조합으로 교체했다.
- Lounge sofa material을 따뜻한 회색 fabric으로 보정해 isometric에서 큰 검정 덩어리처럼 보이던 문제를 줄였다.
- 최종 default room 변경 이후 Blender reference object list를 brass vase, Serif Vase, desk styling, sofa textiles, reading floor cushion 상태에 맞춰 갱신했다.
- Blender CLI로 floor/static AO와 floor/window wash texture bake를 다시 생성했고, 현재 가구 footprint 기반 occlusion을 bake mask에 반영했다.
- Blender CLI로 8개 hero furniture의 4096px baked texture atlas GLB를 생성했다: simple table, Plan Chair, rounded commode, wooden display shelves, Hackney sofa, Ibiza coffee table, Blown armchair, Slit side table.
- Plan Chair와 Hackney sofa는 runtime-lite geometry를 bake input으로 사용하고, 모든 baked furniture는 가구당 1개 4K atlas texture로 합쳐 draw call/texture fanout을 줄였다.
- Procedural 4K baked atlas가 기존 curated runtime/material path보다 화면 품질이 낮게 보여, default에서는 runtime-lite/material tuning을 유지하고 baked furniture는 `VITE_ENABLE_BAKED_FURNITURE_VARIANTS=true`에서만 opt-in으로 사용한다.

Final verification:

```bash
pnpm build
pnpm blender:render-reference
pnpm blender:bake-room-lighting
pnpm blender:bake-furniture-4k
pnpm blender:create-runtime-variants
pnpm blender:validate-runtime-variants
pnpm render:quality-metrics --url=http://127.0.0.1:5190/ --views=isometric,bird,pov --quality=high --hero-sets=all
pnpm render:budget --url=http://127.0.0.1:5190/ --quality=medium
```

Final render quality:

- Report: `docs/render-quality-report.md`
- Latest run: `output/render-quality-metrics/2026-04-28T19-26-21-305Z.json`
- Latest restored default run: `output/render-quality-metrics/2026-04-28T20-30-54-820Z.json`
- Average perceptual proxy score: `66.3`
- Baseline average score: `65.0`
- Best default decision: keep the improved default composition as baseline. `lounge-accents` still scores higher in aggregate, but the default now carries the core visual upgrades without swapping the room into an A/B decor preset.
- `darkBlobRatio` stayed below the penalty threshold in all measured views.

Final runtime budget:

- Report: `docs/render-budget-report.md`
- Latest run: `output/render-budget/2026-04-28T19-25-46-975Z.json`
- Latest restored default run: `output/render-budget/2026-04-28T20-31-55-060Z.json`
- Max draw calls: `177`
- Max triangles: `425,898`
- Max textures: `81`
- Budget result: pass against current medium targets (`draw calls < 180`, `triangles < 450k`, `textures < 90`).

Visual verification artifacts:

- `output/playwright/current-room-quality-isometric.png`
- `output/playwright/current-room-quality-bird.png`
- `output/playwright/current-room-quality-pov.png`
- `output/playwright/current-room-rotate-before.png`
- `output/playwright/current-room-rotate-after.png`
- `output/playwright/composition-pass-final-isometric.png`
- `output/playwright/composition-pass-final-pov.png`
- `output/playwright/final-quality-isometric.png`
- `output/playwright/final-quality-bird.png`
- `output/playwright/final-quality-pov.png`
- `output/playwright/blender-bake-quality-isometric.png`
- `output/playwright/blender-bake-quality-bird.png`
- `output/playwright/blender-bake-quality-pov.png`
- `output/playwright/furniture-4k-bake-isometric.png`
- `output/playwright/furniture-4k-bake-rotated.png`
- `output/playwright/furniture-4k-bake-bird.png`
- `output/playwright/furniture-4k-bake-pov.png`
- `output/playwright/furniture-4k-bake-verification.json`
- `output/playwright/restored-default-quality-isometric.png`
- `output/playwright/restored-default-quality-bird.png`
- `output/playwright/restored-default-quality-pov.png`
- `output/playwright/restored-default-quality-verification.json`
