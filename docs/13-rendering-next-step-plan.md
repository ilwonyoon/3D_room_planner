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
- 보류: `public/assets/**` 대량 재생성, KTX2 변환, PWA 캐시 정책 변경.

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

1. 기본 wall art를 GLB frame/mirror/clock 후보로 교체한다.
2. 기본 floor lamp를 GLB lamp 후보로 교체한다.
3. 식물은 `potted_plant_01` 같은 heavy outlier를 기본값에서 피하고, 가벼운 후보를
   먼저 선정한다.
4. selection/hitbox는 기존 transparent mesh 방식을 유지한다.

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

1. `renderQuality: low | medium | high` store를 만든다.
2. DPR, N8AO, ContactShadows, DirectionalLight shadow map을 tier별로 분기한다.
3. Drei `PerformanceMonitor`로 자동 downgrade를 붙인다.
4. `EffectComposer`의 `multisampling` / `enableNormalPass` 조합을 실험해
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

1. KTX2/BasisU variant를 opt-in script로 추가한다.
2. GLB별 bounds, texture count, vertex count metadata를 생성한다.
3. heavy asset을 기본 카탈로그에서 high tier로 격리한다.
4. PWA precache에서 대량 thumbnails/runtime assets를 제외하고 runtime cache로 돌린다.

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

## 바로 진행할 때의 안전 규칙

- 구현은 Phase 1부터 시작한다.
- `public/assets/**` 대량 재생성은 별도 승인 전에는 하지 않는다.
- `vite.config.ts` PWA 캐시 정책은 Phase 4 전에는 건드리지 않는다.
- main이 생기기 전까지는 브랜치 충돌 분석이 제한되므로, 첫 커밋/실제 브랜치 ref
  생성 후 다시 `main...branch` diff를 확인한다.
