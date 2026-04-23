# 15. Blender Quality Pipeline

작성일: 2026-04-23

## 결론

실시간 Three.js 작업이 끝난 것은 아니다. 다만 성능을 유지하면서 한 단계 더 올리는
가장 큰 경로는 더 비싼 실시간 효과를 켜는 것이 아니라 Blender/Cycles가 잘하는 일을
오프라인으로 넘기는 것이다.

현재 세션에는 Blender MCP 도구가 노출되어 있지 않다. 대신 로컬 Blender CLI는 확인됐다.

- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`
- 확인 버전: Blender 5.1.1
- 기준 렌더 명령: `pnpm blender:render-reference`
- 런타임 bake 명령: `pnpm blender:bake-room-lighting`
- hero asset QA 명령: `pnpm blender:audit-hero-assets`
- hero material variant 명령: `pnpm blender:create-hero-variants`
- static shell prototype 명령: `pnpm blender:export-static-shell`

## 이번에 추가한 것

### 1. Cycles 레퍼런스 렌더

`pnpm blender:render-reference`는 현재 기본 방 배치를 Blender에 재구성하고 Cycles로
사진감 레퍼런스를 렌더링한다.

출력:

- `output/blender/reference-daylight.png`

주의:

- 현재 GLB 일부는 `EXT_meshopt_compression`을 쓰기 때문에 Blender glTF importer가 직접
읽지 못한다.
- wrapper가 필요한 모델만 `gltf-transform copy`로 임시 decode한 뒤
  `output/blender/models-decompressed`에서 Blender가 import한다.

용도:

- Three.js 화면을 직접 대체하는 파일이 아니다.
- 조명 방향, 노출, 창빛, 접지감, 색온도 기준을 잡는 비교 이미지다.

### 2. 런타임용 정적 조명 bake texture

`pnpm blender:bake-room-lighting`은 정적 방 shell에 사용할 저비용 mask texture를 생성한다.

출력:

- `public/assets/generated/blender/floor-static-ao.png`
- `public/assets/generated/blender/floor-window-wash.png`
- `public/assets/generated/blender/back-wall-static-ao.png`
- `public/assets/generated/blender/back-wall-window-glow.png`
- `public/assets/generated/blender/left-wall-static-ao.png`
- `public/assets/generated/blender/right-wall-static-ao.png`
- `public/assets/generated/blender/front-wall-static-ao.png`

앱 적용:

- `src/scene/AssetRoom.tsx`
- floor 위에 static AO plane 1장
- floor 위에 warm window wash plane 1장
- back wall 위에 static AO plane 1장
- back wall 위에 window glow plane 1장
- left wall 위에 static AO plane 1장
- right wall 위에 static AO plane 1장
- front wall 위에 static AO plane 1장

성능 특성:

- 추가 geometry는 plane 7장이다.
- shadow map, SSAO sample, extra dynamic light를 늘리지 않는다.
- 이동 가능한 가구 그림자는 bake하지 않았다. 가구가 움직였을 때 stale shadow가 남는 문제를
  피하기 위해 static room shell의 빛/코너감만 bake했다.
- `isometric`, `bird`, `pov` view별로 overlay opacity를 다르게 적용한다.
- bird view는 top-down에서 바닥 mask가 무거워 보이지 않도록 AO를 줄이고 light wash를 유지한다.
- POV는 가까운 창 주변이 날아가지 않도록 window/glow 계열 opacity를 낮춘다.

### 3. Blender hero material variants

`pnpm blender:create-hero-variants`는 기본 램프 GLB를 직접 덮어쓰지 않고,
Blender가 읽을 수 있도록 meshopt GLB를 임시 decode한 뒤 별도 후보 GLB로 다시 export한다.

출력:

- `public/assets/generated/blender-variants/desk-lamp-night-emissive.glb`
- `public/assets/generated/blender-variants/industrial-pipe-lamp-night-emissive.glb`
- `public/assets/generated/blender-variants/manifest.json`

현재 용도:

- 기본값 교체가 아니다.
- `pnpm render:quality-metrics --hero-sets=all`에서 `blender-emissive-lamps` 후보로만 비교한다.
- 최근 harness 결과에서 이 후보는 전체 평균 `60.9`로 baseline `67.7`을 넘지 못했다.

### 4. Static shell GLB prototype

`pnpm blender:export-static-shell`은 floor, back/left wall, trim, window frame/glass를 포함한
정적 room shell prototype GLB를 만든다.

출력:

- `output/blender/static-shell/room-shell-lightmap-prototype.glb`

현재 용도:

- 런타임 기본 shell 교체가 아니다.
- 방 크기 변경, 창문 배치 변경, 편집 가능 geometry와 충돌할 수 있으므로 opt-in 후보로만 둔다.
- 현 단계에서는 procedural shell + static AO/window wash overlay가 더 안전하다.

## 왜 이게 맞는 방향인가

사용자가 말한 "빛 추가하고 실제 사진처럼 렌더링"은 실시간 라이트 개수를 늘리라는 뜻이
아니다. 실제 제품 수준에서는 아래 순서가 더 안전하다.

1. Blender/Cycles로 목표 이미지를 만든다.
2. 방처럼 덜 움직이는 부분은 light/AO를 texture로 굽는다.
3. Three.js 런타임은 편집성과 상호작용에 필요한 최소 dynamic light만 유지한다.
4. 모델/텍스처는 다시 KTX2/meshopt/LOD-free budget으로 최적화한다.

## 다음 구현 단계

### Phase B1: bake texture 튜닝

상태: 진행. floor/back/left/right/front wall용 mask가 생성되고 런타임에 적용됐다.
camera view별 opacity 분기도 들어갔다.

상태: prototype 생성 완료. 기본값 전환은 보류.

목표:

- 현재 bake overlay의 opacity, 위치, orientation을 Playwright screenshot 기준으로 조정한다.
- day/warm/night preset별 overlay 강도를 추가 분기할지 검증한다.

검증:

- `pnpm typecheck`
- `pnpm build`
- Playwright desktop/mobile screenshot
- console error 0

### Phase B2: static room shell GLB bake

목표:

- floor/wall/baseboard/window frame까지 Blender에서 실제 lightmap UV를 만들고 GLB로 export한다.
- Three.js의 procedural shell과 feature parity를 비교한 뒤 opt-in으로 교체한다.

주의:

- room dimension이 바뀌는 기능과 충돌한다.
- 그래서 바로 기본값으로 바꾸지 말고, default room/high quality 실험 플래그로 시작한다.

### Phase B3: movable model material QA

상태: 시작. `pnpm blender:audit-hero-assets`로 기본 hero asset bounds/material signal 리포트를 생성한다.

목표:

- 주요 기본 모델의 material roughness, normal, scale, pivot, bounds를 Blender에서 점검한다.
- 필요하면 GLB를 재수출하되, 런타임 카탈로그 경로는 직접 덮어쓰지 않는다.

주의:

- movable furniture에 baked object shadow를 넣으면 이동 후 그림자가 틀어진다.
- 모델 자체 AO/material cleanup은 가능하지만, 방 바닥에 떨어지는 그림자는 런타임 contact/fake 계층으로 유지한다.

현재 판정:

- Blender emissive 램프 후보는 생성됐지만, quality harness에서 baseline보다 낮았다.
- 따라서 default room에는 승격하지 않고 후보 asset으로 보존한다.

## 합격 기준

- 중간 quality에서 dynamic shadow/AO 비용을 늘리지 않는다.
- 오브젝트 이동/선택 latency가 이전보다 나빠지지 않는다.
- 기본 view에서 floor-wall corner, 창 근처 wall glow, 바닥 light falloff가 보인다.
- Cycles reference와 Three.js screenshot의 조명 방향이 논리적으로 일치한다.
