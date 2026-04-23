# 16. Asset Quality Playbook

작성일: 2026-04-23

## 결론

에셋을 직접 모델링하지 않아도 할 수 있는 일은 많다. 룸 플래너의 품질은 "받아온
에셋 그대로 보여주기"보다, 받은 에셋을 어떤 기준으로 고르고, 검사하고, 후처리하고,
런타임에서 material을 어떻게 정리하느냐에 크게 좌우된다.

## 사용자가 할 수 있는 일

### 1. 처음 고를 때 보는 기준

좋은 에셋:

- GLB/glTF PBR material이 있다.
- material 이름이 의미 있게 나뉘어 있다. 예: `glass`, `fabric`, `wood`, `light`.
- baseColor, normal, roughness/metallic texture가 있다.
- 실제 크기와 pivot이 말이 된다.
- 1개 소품이 너무 많은 texture를 쓰지 않는다.

피해야 할 에셋:

- 모든 부품이 하나의 material로 합쳐져 있다.
- `emissive`, `glass`, `fabric` 같은 부품 구분이 없다.
- 같은 의자 하나에 4K texture 여러 장이 들어 있다.
- 너무 많은 vertex/texture 때문에 가까이 보지 않아도 무겁다.
- scale/pivot이 심하게 틀어져서 앱에서 계속 보정해야 한다.

### 2. 받은 뒤 자동 검사

이미 프로젝트에는 이 방향의 기반이 있다.

- `pnpm assets:audit-render`
- `public/assets/render-asset-manifest.json`
- `docs/render-asset-audit.md`

검사 기준:

- vertex count
- texture count
- GPU texture memory 추정
- bounds/scale 이상값
- heavy asset 격리 여부

### 3. 원본을 안 바꾸고 런타임에서 고치는 것

이번에 적용한 방식이다.

- GLB 로딩 후 material을 clone한다.
- material 이름과 object id를 보고 roughness/metalness/envMapIntensity를 정리한다.
- 램프의 `light`, `glass`, `emission` material에는 emissive를 넣는다.
- fabric/wood/metal마다 normalScale과 roughness를 다르게 잡는다.

장점:

- 원본 asset을 덮어쓰지 않는다.
- 같은 모델이라도 앱의 조명 환경에 맞게 튜닝할 수 있다.
- 다운로드한 asset의 material이 조금 거칠어도 화면에서 정리할 수 있다.

한계:

- geometry 자체가 나쁘거나 UV가 깨진 asset은 런타임 material tuning으로 해결하기 어렵다.
- 부품/material 이름이 전혀 구분되어 있지 않으면 자동 override 정확도가 떨어진다.

### 4. 원본을 바꾸는 후처리

품질과 성능을 동시에 잡으려면 원본을 직접 편집하지 않더라도 별도 output variant를 만든다.

가능한 처리:

- texture resize
- WebP/KTX2 변환
- meshopt 압축
- material dedup
- unused node/texture 제거
- pivot/bounds normalize
- light/emissive material 이름 정리

원칙:

- `public/assets/models`를 바로 덮어쓰지 않는다.
- `public/assets/models-ktx2` 같은 variant 경로에 출력한다.
- 앱은 검증된 variant만 opt-in으로 사용한다.

### 5. 사람이 직접 할 수 있는 최소 작업

모델링을 안 하더라도 아래 정도는 할 수 있다.

1. 같은 종류 모델을 3-5개 후보로 받아서 실제 화면 screenshot으로 비교한다.
2. `gltf-transform inspect` 결과가 너무 무거운 후보는 버린다.
3. material 이름이 잘 나뉜 후보를 우선한다.
4. 램프/창문/유리/패브릭처럼 조명 반응이 중요한 에셋은 material 이름을 확인한다.
5. hero default room에는 가장 예쁜 에셋보다 가장 안정적인 에셋을 넣는다.

## 이번에 반영한 것

- `src/scene/AssetRoom.tsx`
  - 로딩된 GLB material을 clone한 뒤 object별로 PBR 값을 정리한다.
  - fabric/wood/metal/lamp material을 이름 기반으로 튜닝한다.
  - desk lamp와 floor lamp 계열 emissive material을 강화한다.
  - 창문 glass/sky/glow material을 보강한다.
  - floor GLB마다 저비용 타원형 soft shadow를 추가한다.
  - desk/floor lamp에는 additive sprite glow를 붙여 광원 위치를 명확히 한다.
- `src/constants/renderMaterialOverrides.ts`
  - asset id, model url, material name 기준의 PBR override rule을 별도 table로 분리했다.
  - 다운로드 에셋 원본을 건드리지 않고도 재질별 roughness, metalness, envMap, emissive를 조정할 수 있다.
- `scripts/audit-render-assets.mjs`
  - `public/assets/render-asset-manifest.json`에 material name과 fabric/wood/metal/glass/emissive signal을 저장한다.
  - `docs/render-asset-audit.md`에 non-heavy material override 후보 표를 생성한다.
- `pnpm blender:audit-hero-assets`
  - Blender CLI로 기본 방 hero GLB를 import해서 bounds/material signal/risk를 점검한다.
  - 결과는 `output/blender/hero-asset-qa.json`과 `docs/blender-hero-asset-qa.md`에 기록한다.
- `pnpm blender:create-hero-variants`
  - meshopt GLB를 임시 decode한 뒤 Blender에서 material naming/emissive 후보 variant를 생성한다.
  - 현재 생성 asset은 `public/assets/generated/blender-variants/`에 있고 원본을 덮어쓰지 않는다.
- `pnpm blender:export-static-shell`
  - 정적 room shell/lightmap prototype GLB를 `output/blender/static-shell/room-shell-lightmap-prototype.glb`로 생성한다.
  - 방 편집성과 충돌할 수 있으므로 기본값 교체가 아니라 후보 산출물이다.
- `scripts/measure-render-quality.mjs`
  - `--hero-sets=all`로 기본 hero asset과 교체 후보를 같은 camera/lighting 조건에서 A/B 측정한다.
  - 최근 결과는 `docs/render-quality-report.md`에 기록됐다.
- `src/scene/IsometricScene.tsx`
  - Day/Warm/Night preset별 contact shadow opacity/blur/far를 분리한다.

## 다음 후보

1. heavy asset은 카탈로그에서 숨기는 것뿐 아니라, high quality에서도 경고 badge를 붙인다.
2. 기본 방 hero object는 screenshot 기반 A/B 후보군으로 관리한다.
3. material override candidate 상위 모델을 실제 room screenshot으로 A/B 측정한다.
4. Blender CLI로 특정 GLB의 material 이름 정리/texture resize variant를 생성한다.

## Blender Hero QA 결과

현재 기본 방에서 material 분리 리스크가 있는 모델:

- `desk`: material 1개라 wood/metal을 정확히 분리하기 어렵다.
- `storage-right`: material 1개, naming signal 없음.
- `round-side-table`: material 1개, naming signal 없음.
- `floor-plant`: material 1개, naming signal 없음.
- `small-plant`: material 1개, naming signal 없음.

이 모델들은 당장 실패는 아니지만, 다음 hero A/B에서는 우선 교체 후보로 둔다.

## A/B 판정 결과

최근 전체 A/B:

- 실행: `pnpm render:quality-metrics --views=isometric,bird,pov --quality=medium --hero-sets=all`
- 리포트: `docs/render-quality-report.md`
- baseline 평균: `67.7`
- `blender-emissive-lamps` 평균: `60.9`
- `material-rich` 평균: `60.4`
- `designer-lamps` 평균: `60.4`

판정:

- 현재 교체 후보들은 default room 전체 품질 기준으로 baseline을 넘지 못했다.
- 일부 POV/day 또는 iso/warm에서는 후보가 이기지만, bird/night와 전체 균형 손실이 크다.
- 그래서 기본 hero asset은 유지한다.
- 새 후보는 버리지 않고 후보군으로 남겨, 사람이 screenshot을 보고 더 낫다고 판단하는 경우
  `pnpm render:record-preference`로 선호 기록을 남긴다.
