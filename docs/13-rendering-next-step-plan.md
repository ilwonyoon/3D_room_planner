# 13. Rendering Next-Step Implementation Plan

작성일: 2026-04-22

## Git / 충돌 상태

현재 저장소는 아직 첫 커밋이 없는 unborn repository 상태다. `main` ref가
존재하지 않아서 일반적인 의미의 `main` 대비 diff, merge-base, conflict
분석은 불가능하다.

현재 확인된 상태:

- 현재 HEAD 이름: `assets/free-furniture-expansion`
- `git branch --all` 결과: 실제 branch ref 없음
- `git rev-parse --verify main`: `main` 없음
- 전체 프로젝트 파일이 untracked 상태

따라서 지금 가장 큰 충돌 리스크는 코드 변경 자체보다 Git 초기화 순서다.
누군가 `main`에서 동일 경로 파일들을 첫 커밋하면, 현재 worktree의 untracked
파일들과 같은 경로가 겹치기 때문에 checkout/merge 시 Git이 작업트리 덮어쓰기
위험을 감지할 수 있다.

권장 정리 순서:

1. `main`의 첫 커밋이 아직 없다면, 먼저 현재 베이스를 하나의 initial commit으로
   고정한다.
2. 그 다음 `research/rendering-quality-next-step` 같은 실제 branch ref를 만든다.
3. 렌더링 품질 구현은 그 브랜치에서 작은 단계별 커밋으로 진행한다.

## 충돌 가능성 평가

### 낮음

- `docs/12-rendering-next-step-research.md`
- 이 문서 `docs/13-rendering-next-step-plan.md`
- README 문서 목록 링크 추가

문서 추가/링크는 구현 파일과 충돌 가능성이 낮다. 단, README 문서 테이블을 다른
작업이 동시에 수정하면 같은 근처에서 텍스트 충돌이 날 수 있다.

### 중간

- `src/scene/AssetRoom.tsx`
- `src/scene/Lighting.tsx`
- `src/scene/IsometricScene.tsx`
- `src/constants/environmentCatalog.ts`
- `src/store/roomSettingsStore.ts`

렌더링 품질의 핵심 구현 파일이다. main 쪽에서 배치/카탈로그/룸 설정 UI를
동시에 만지고 있다면 충돌 가능성이 있다.

### 높음

- `scripts/prepare-assets.mjs`
- `public/assets/**`
- `vite.config.ts`

에셋 파이프라인과 PWA 캐싱 정책은 파일 생성량이 많고 빌드 결과/런타임 자산에
영향이 커서 main의 asset expansion 작업과 겹치기 쉽다. KTX2 도입, 썸네일 캐시
정책, 대량 GLB 재생성은 별도 브랜치에서 단독으로 진행하는 편이 안전하다.

## 구현 순서

## 진행 상태

- 완료: 충돌 리스크 확인. 현재는 `main` ref가 없어 Git diff 기반 비교가 불가능함.
- 완료: 계획 문서 작성.
- 완료: Phase 1 일부. optional AO map을 카탈로그와 room material에 연결.
- 완료: Phase 1 일부. idle 상태 grid opacity를 낮추고 placement 상태에서만 강조되게 조정.
- 완료: Phase 1 일부. floor/wall roughness, normalScale, AO intensity, tone exposure를 보수적으로 튜닝.
- 완료: Phase 2 일부. 기본 wall art 2개, floor lamp, plant를 procedural mesh에서 GLB asset으로 교체.
- 완료: Phase 3 일부. `renderQuality` store와 low/medium/high tier를 추가.
- 완료: Phase 3 일부. DPR, contact shadow, N8AO, directional shadow를 tier별로 분기.
- 완료: Phase 3 일부. `PerformanceMonitor` 기반 자동 quality up/down을 추가.
- 완료: Phase 3 일부. shadow map type과 postprocessing multisampling 조정으로
  `PCFSoftShadowMap`, `glBlitFramebuffer` 경고를 제거.
- 진행 중: Phase 4. KTX2 variant 출력 경로, 렌더 에셋 감사 스크립트, PWA 런타임
  캐시 분리 정책을 추가.
- 완료: Phase 4 일부. audit에서 heavy로 분류된 product asset은 high quality에서만
  카탈로그에 노출되도록 격리.
- 완료: Phase 4 일부. Basis transcoder를 로컬 `public/basis`에 고정하고 GLTF loader에
  KTX2Loader를 연결.
- 완료: Phase 4 일부. 기본 화면 후보 일부를 `models-ktx2` variant로 생성하고,
  생성된 후보만 런타임 URL에 연결.
- 완료: 성능 회귀 대응. KTX2 모델 URL 전환은 기본 off로 바꾸고
  `VITE_ENABLE_KTX2_MODELS=true`일 때만 사용한다.
- 완료: 성능 회귀 대응. 기본 render quality를 high에서 medium으로 낮추고,
  medium에서는 N8AO를 끈다.
- 완료: 체감 품질 패스. 조명 대비, 카메라 zoom, 방 trim, GLB floor fake shadow를
  비용 낮은 방식으로 조정했다.
- 완료: `docs/14-photoreal-lighting-research.md`에 "빛 추가 + 실제 사진처럼" 요청을
  현재 코드 기준의 구현 계획으로 번역했다.
- 완료: Phase 6 일부. `daylight-window`, `warm-evening`, `night-room` 조명 프리셋과
  상단 segmented control을 추가했다.
- 완료: Phase 6 일부. 보이지 않던 `window-main`을 뒷벽으로 옮기고, 창문 glass/sky
  레이어를 분리해 창빛의 시각적 근거를 만들었다.
- 완료: Phase 7 일부. Blender CLI로 Cycles 레퍼런스 렌더 파이프라인을 추가했다.
- 완료: Phase 7 일부. Blender CLI로 static room shell용 floor/wall lighting mask를
  생성하고 런타임 overlay로 연결했다.
- 보류: `public/assets/**` 전체 대량 KTX2 재생성.

### Phase 1: 저충돌 시각 개선

목표: 런타임 구조를 크게 바꾸지 않고 화면 품질을 올린다.

작업:

1. 완료: `RoomMaterialMaps`에 optional `ao`를 추가한다.
2. 완료: 존재하는 ambientCG AO 텍스처만 조건부로 연결한다.
3. 완료: floor/wall `MeshStandardMaterial`에 `aoMap`, `aoMapIntensity`를 추가한다.
4. 완료: wall/floor roughness, normalScale, tone exposure를 스크린샷 기준으로 미세 조정한다.
5. 완료: grid opacity를 placement 상태에 따라 약하게 조절한다.

주요 파일:

- `src/constants/environmentCatalog.ts`
- `src/scene/AssetRoom.tsx`
- `src/scene/IsometricScene.tsx`

검증:

- `pnpm typecheck`
- `pnpm build`
- Playwright desktop screenshot
- Playwright 375x812 screenshot

### Phase 2: 기본 배치 오브젝트 고급화

목표: procedural prop이 전체 룩을 낮추는 문제를 줄인다.

작업:

1. 완료: 기본 wall art를 GLB frame/mirror/clock 후보로 교체한다.
2. 완료: 기본 floor lamp를 GLB lamp 후보로 교체한다.
3. 완료: 식물은 `potted_plant_01` 같은 heavy outlier를 기본값에서 피하고, 가벼운 후보를
   먼저 선정한다.
4. 완료: GLB 기본 오브젝트에도 실제 치수 기반 transparent hitbox를 추가한다.

주요 파일:

- `src/store/editorObjectsStore.ts`
- `src/constants/productCatalog.ts`
- `src/constants/environmentCatalog.ts`
- `src/scene/AssetRoom.tsx`

검증:

- 기본 화면 로드
- 선택/이동/삭제/리프트 조작
- GLB load warning 확인
- draw call / texture memory 대략 점검

### Phase 3: 렌더 품질 티어

목표: 모바일 기본값을 안전하게 유지하면서 high tier에서만 비싼 효과를 켠다.

작업:

1. 완료: `renderQuality: low | medium | high` store를 만든다.
2. 완료: DPR, N8AO, ContactShadows, DirectionalLight shadow map을 tier별로 분기한다.
3. 완료: Drei `PerformanceMonitor`로 자동 downgrade를 붙인다.
4. 완료: `EffectComposer`의 `multisampling` / `enableNormalPass` 조합을 실험해
   `glBlitFramebuffer` warning을 제거한다.

주요 파일:

- `src/store/roomSettingsStore.ts` 또는 신규 `src/store/renderQualityStore.ts`
- `src/scene/IsometricScene.tsx`
- `src/scene/Lighting.tsx`

검증:

- desktop/mobile screenshot 비교
- console warning 없음
- low tier에서 interaction latency 악화 없음

### Phase 4: 에셋 파이프라인 분리 실험

목표: WebP/JPEG 대비 GPU 메모리 한계를 줄이고 high-quality asset tier를 준비한다.

작업:

1. 완료: KTX2/BasisU variant를 opt-in script로 추가한다.
   - `pnpm assets:prepare:ktx2`
   - 출력 루트: `public/assets/models-ktx2`
   - 앱이 현재 사용하는 `public/assets/models`는 덮어쓰지 않는다.
   - `pnpm assets:install-ktx`가 Khronos KTX-Software 4.4.2 macOS package에서
     로컬 `tools/ktx`를 구성한다.
   - 특정 모델만 변환할 때는 `ASSET_MODEL_FILTER=id1,id2`를 사용한다.
2. 완료: GLB별 bounds, texture count, vertex count metadata를 생성한다.
   - `pnpm assets:audit-render`
   - JSON: `public/assets/render-asset-manifest.json`
   - Report: `docs/render-asset-audit.md`
   - 현재 audit 결과: 257 models, 129 light, 119 medium, 9 heavy.
3. 완료: heavy asset을 기본 카탈로그에서 high tier로 격리한다.
   - `renderQuality !== high`일 때 heavy product asset은 카테고리 목록에서 제외한다.
4. 완료: PWA precache에서 대량 thumbnails/runtime assets를 제외하고 runtime cache로 돌린다.
5. 완료: `KTX2Loader`를 `useGLTF` loader extension에 연결한다.
   - transcoder path: `/basis/`
6. 완료: 생성된 KTX2 후보만 `modelUrlWithBestVariant()`로 런타임 URL에 연결한다.
   - QA 실패: `sheen-wood-leather-sofa` KTX2 variant는 WebP source 한계로 제외.
   - 기본값은 off: `VITE_ENABLE_KTX2_MODELS=true`에서만 KTX2 URL을 사용한다.

주요 파일:

- `scripts/prepare-assets.mjs`
- 신규 `scripts/audit-render-assets.mjs`
- `vite.config.ts`
- `public/assets/**`

검증:

- `gltf-transform inspect`
- build output size
- PWA precache size
- 모바일 Safari/Chrome smoke check

### Phase 5: 성능 예산 안의 체감 렌더 품질

목표: KTX2/캐시 같은 기반 작업이 아니라, 현재 화면에서 즉시 보이는 품질을 올린다.

작업:

1. 완료: 기본 quality를 `medium`으로 낮추고 medium tier에서는 N8AO를 끈다.
2. 완료: medium/high DPR과 contact shadow resolution을 낮춰 성능 예산을 회복한다.
3. 완료: HDRI/ambient를 줄이고 warm key light를 강화해 flat한 실내광을 줄인다.
4. 완료: 카메라 기본 zoom을 올려 first viewport에서 모델과 방 재질이 더 잘 보이게 한다.
5. 완료: GLB floor object에 저비용 fake contact shadow를 추가해 접지감을 올린다.
6. 완료: wall geometry segment를 낮추고 baseboard/top trim/corner trim으로 방 shell의
   빈 느낌을 줄인다.

검증:

- `pnpm typecheck`
- `pnpm build`
- Playwright 5188 smoke check
- Network check: 기본값에서는 `/assets/models-ktx2`와 `/basis`가 로드되지 않음.

### Phase 6: 사진 같은 조명 리그

목표: 라이트 개수 추가가 아니라 실제 방 안에 있을 법한 창빛/램프/반사광 구조로
장면을 재조명한다.

작업:

1. 완료: `Lighting.tsx`를 `daylight-window`, `warm-evening`, `night-room` 프리셋 구조로
   분리한다.
2. 완료: `window-main` 위치를 기준으로 RectAreaLight를 배치한다.
3. 완료: high tier의 shadow-casting light는 1개로 유지하고 shadow camera bounds를 방 크기에
   맞게 줄인다.
4. 진행 중: desk/floor lamp 계열 오브젝트는 non-shadow warm practical light로 보강했다.
   emissive material 튜닝은 다음 단계로 남긴다.
5. 완료: desk/floor lamp practical light를 inverse-square `SpotLight` + target 방향으로
   바꿨다.
6. 완료: Kelvin 색온도 기반 light color 계산과 RectAreaLight power 값을 도입했다.
7. 완료: medium/high에서 floor/back wall bounce area light를 추가했다.
8. 완료: preset별 toneMappingExposure를 적용했다.
9. 완료: preset별 contact shadow opacity/blur/far를 분기했다.
10. 완료: 로딩된 GLB material을 clone해 fabric/wood/metal/lamp별 roughness, metalness,
   envMapIntensity, normalScale, emissive를 런타임에서 보정한다.
11. 완료: GLB floor object마다 저비용 타원형 soft shadow를 추가해 접지감을 더 직접적으로
   보강했다.
12. 완료: desk/floor lamp에는 additive sprite glow를 붙여 광원 위치가 화면에서 보이게 했다.

주요 파일:

- `src/scene/Lighting.tsx`
- `src/scene/IsometricScene.tsx`
- `src/scene/AssetRoom.tsx`
- `docs/16-asset-quality-playbook.md`
- 신규 가능: `src/store/lightingPresetStore.ts`

검증:

- Playwright 1280x720 screenshot
- Playwright 390x844 screenshot
- console error 0
- 기본 이동/선택 latency 회귀 없음
- medium tier에서 자동 downgrade 반복 없음

현재 스크린샷:

- `output/playwright/lighting-preset-daylight-window.png`
- `output/playwright/lighting-preset-warm-evening.png`
- `output/playwright/lighting-preset-studio-catalog.png`
- `output/playwright/physical-lighting-daylight-window.png`
- `output/playwright/physical-lighting-warm-evening.png`
- `output/playwright/physical-lighting-studio-catalog.png`
- `output/playwright/visible-quality-pass-daylight-window.png`
- `output/playwright/visible-quality-pass-warm-evening.png`
- `output/playwright/visible-quality-pass-studio-catalog.png`

### Phase 7: Blender 오프라인 품질 파이프라인

목표: 실시간 shadow/AO 비용을 늘리지 않고 Blender/Cycles의 장점을 정적 texture와
레퍼런스 렌더로 가져온다.

작업:

1. 완료: 로컬 Blender CLI 확인.
2. 완료: 기본 룸을 Blender/Cycles로 재구성해 레퍼런스 이미지를 생성한다.
   - 명령: `pnpm blender:render-reference`
   - 출력: `output/blender/reference-daylight.png`
3. 완료: Blender importer가 `EXT_meshopt_compression` GLB를 읽지 못하는 문제를
   wrapper에서 `gltf-transform copy` 임시 decode로 우회한다.
4. 완료: static room shell용 floor AO, floor window wash, back wall glow, left wall AO
   mask를 Blender CLI로 생성한다.
   - 명령: `pnpm blender:bake-room-lighting`
   - 출력: `public/assets/generated/blender/*.png`
5. 완료: 생성된 mask texture를 `AssetRoom`에 저비용 transparent overlay plane으로 연결한다.

주요 파일:

- `scripts/blender-render-room-reference.mjs`
- `scripts/blender/render-room-reference.py`
- `scripts/blender-bake-room-lighting.mjs`
- `scripts/blender/generate-room-light-bakes.py`
- `src/scene/AssetRoom.tsx`
- `docs/15-blender-quality-pipeline.md`

검증:

- `pnpm blender:render-reference`
- `pnpm blender:bake-room-lighting`
- `pnpm typecheck`
- `pnpm build`
- Playwright screenshot 비교

## 바로 진행할 때의 안전 규칙

- 구현은 Phase 1부터 시작한다.
- `public/assets/**` 대량 재생성은 별도 승인 전에는 하지 않는다.
- `vite.config.ts` PWA 캐시 정책은 Phase 4 전에는 건드리지 않는다.
- main이 생기기 전까지는 브랜치 충돌 분석이 제한되므로, 첫 커밋/실제 브랜치 ref
  생성 후 다시 `main...branch` diff를 확인한다.
