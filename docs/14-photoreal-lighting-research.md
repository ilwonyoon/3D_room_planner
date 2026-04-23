# 14. Photoreal Lighting Research

작성일: 2026-04-23

## 질문 해석

"빛을 추가하고 실제 사진처럼 렌더링"은 단순히 라이트 개수를 늘리라는 뜻이 아니다.
Three.js/R3F에서 이 말은 다음 네 가지를 동시에 맞추라는 뜻에 가깝다.

1. 실제 광원이 있을 법한 위치에서 빛을 만든다.
2. PBR 재질이 반응할 수 있도록 환경광, 면광, 그림자, 노출을 일관되게 맞춘다.
3. 그림자 비용은 제한하고, 접지감은 contact shadow/AO/fake shadow로 보강한다.
4. 스크린샷 기준으로 노출, 대비, 색온도, 재질 반사를 반복 튜닝한다.

## 공식 문서 기준

- Three.js shadow map은 그림자를 만드는 라이트마다 씬을 추가 렌더링한다. 라이트를
  많이 켜고 모두 그림자를 cast하면 성능이 빠르게 무너진다.
- Three.js manual은 일반적인 해법으로 여러 라이트를 쓰되 shadow caster는 하나로
  제한하거나, fake shadow/lightmap/AO를 함께 쓰는 방식을 설명한다.
- `RectAreaLight`는 창문/스트립 조명처럼 넓은 광원을 시뮬레이션하기 좋지만 공식적으로
  shadow support가 없다. 따라서 부드러운 창빛은 RectAreaLight로 만들고, 실제 캐스트
  그림자는 DirectionalLight/SpotLight 중 하나로 제한해야 한다.
- `MeshStandardMaterial`은 metallic-roughness PBR 재질이며, 공식 문서도 좋은 결과를
  위해 environment map을 지정하라고 권장한다.
- color management가 맞지 않으면 조명값을 올리는 것으로는 해결되지 않는다. 현재 앱은
  `SRGBColorSpace` + `ACESFilmicToneMapping`을 쓰고 있어 방향은 맞다.

## 현재 코드 상태

현재 구현은 이미 실사 방향의 기본 골격을 갖고 있다.

- `src/scene/IsometricScene.tsx`
  - `gl.outputColorSpace = THREE.SRGBColorSpace`
  - `gl.toneMapping = THREE.ACESFilmicToneMapping`
  - `frameloop="demand"`
  - quality tier별 DPR/contact shadow/AO 분기
- `src/scene/Lighting.tsx`
  - HDRI `Environment`
  - 낮은 ambient light
  - hemisphere fill
  - broad window-like `RectAreaLight`
  - weak directional light with high-tier shadows
- `src/scene/AssetRoom.tsx`
  - floor/wall PBR maps
  - GLB PBR material `envMapIntensity`
  - contact-style fake shadows for selected procedural props
- `src/scene/Lighting.tsx`
  - Kelvin 색온도를 RGB로 변환해 창문/램프/필라이트 색을 계산
  - RectAreaLight power를 lumens 기반으로 설정
  - 램프 practical light를 inverse-square `SpotLight` + target 방향으로 변경
  - floor/back wall bounce area light를 추가해 실시간 비용이 낮은 간접광 느낌을 보강

그래서 다음 품질 상승은 "Three.js로 가능한가?"가 아니라 "현재 방의 광원 동기를 더
사진처럼 설계했는가?"의 문제다.

## 현재 한계

### 1. 광원이 아직 장면 논리와 완전히 묶여 있지 않다

창문은 오른쪽 벽에 있는데, 조명은 하드코딩된 스튜디오 리그에 가깝다. 사진처럼 보이려면
`window-main` 위치에서 들어오는 큰 면광, 바닥/벽 반사 느낌, 스탠드 램프 주변 warm pool이
서로 말이 되어야 한다.

### 2. ambient/hemisphere가 형태감을 일부 평평하게 만든다

ambient가 높으면 모델의 어두운 면이 살아나지만, 사진 같은 명암 구조는 약해진다. 현재는
낮춘 상태지만, 다음 단계에서는 preset별로 더 강하게 통제해야 한다.

### 3. RectAreaLight는 그림자를 만들지 못한다

창빛은 RectAreaLight로 부드럽게 만들 수 있지만, 창문 프레임이나 가구가 만드는 실제
그림자는 별도의 shadow-casting light 또는 fake/projected shadow가 필요하다.

### 4. postprocessing은 보조 수단이다

N8AO/SMAA는 사진감을 보강할 수 있지만, 조명/재질/노출이 틀린 화면을 실사로 바꾸지는
못한다. 특히 기본 `medium`에서 AO를 꺼둔 상태라 조명 구조 자체의 역할이 더 크다.

## 구현 방향

### Phase 6A: Photo Lighting Presets

목표: 장면에 이름 붙은 조명 프리셋을 만들고, 스크린샷으로 비교 가능하게 한다.

프리셋:

- `daylight-window`: 밝은 낮, 오른쪽 창문에서 큰 soft key
- `warm-evening`: 실내 램프 중심, 창빛 약함, warm practical light 강조
- `night-room`: 적당히 어두운 공간, 램프 중심 명암, 차가운 창빛과 따뜻한 실내등의 분리

구현 파일:

- `src/scene/Lighting.tsx`
- 신규 가능: `src/store/lightingPresetStore.ts`

핵심 파라미터:

- HDRI intensity
- ambient intensity
- hemisphere sky/ground color
- window RectAreaLight position/size/intensity/color
- directional shadow intensity/camera area
- toneMappingExposure

### Phase 6B: Motivated Window Light

목표: `window-main`의 실제 위치를 기준으로 창문 광원을 배치한다.

구현:

- `Lighting`이 room/object 상태를 읽어 window object 위치를 찾는다.
- 창문 앞에 RectAreaLight를 두고 내부 중심을 바라보게 한다.
- high tier에서는 같은 방향의 DirectionalLight만 shadow caster로 사용한다.
- shadow camera는 방 전체가 아니라 실제 보이는 방 영역만 덮도록 줄인다.

기대 효과:

- 가구 표면의 highlight 방향이 일관된다.
- 바닥/벽 접지감이 더 명확해진다.
- "스튜디오에 둔 모델"보다 "방 안에 놓인 물체"처럼 보인다.

### Phase 6C: Practical Lights

목표: 램프 오브젝트가 있으면 그 주변에 작은 warm light pool을 만든다.

구현:

- `reading-lamp`, `desk-lamp` 같은 라이트성 오브젝트에 non-shadow PointLight/SpotLight를
  약하게 추가한다.
- 램프 쉐이드/전구 재질에 emissive를 추가한다.
- high tier에서도 practical light는 기본적으로 shadow를 cast하지 않는다.

주의:

- PointLight shadow는 비용이 크므로 피한다.
- "밝게 만들기"가 아니라 국소적인 warm highlight와 색온도 대비를 만드는 용도다.

### Phase 6D: Contact And Shadow Hierarchy

목표: 실제 그림자 1개 + contact/fake/AO 계층으로 성능을 지킨다.

구현:

- high: directional shadow + ContactShadows + N8AO
- medium: ContactShadows + carefully placed fake contact only
- low: ContactShadows 낮은 해상도 또는 fake contact

튜닝:

- directional shadow camera bounds를 방 크기에 맞게 줄인다.
- shadow map resolution을 무작정 올리지 않는다.
- contact shadow blur/opacity를 preset별로 관리한다.

### Phase 6E: Screenshot-Based Acceptance

목표: "좋아 보임"을 수치/스크린샷 기준으로 검증한다.

검증:

- Playwright desktop screenshot: 1280x720
- Playwright mobile screenshot: 390x844
- console error 0
- frame budget: medium에서 자동 downgrade가 과하게 발생하지 않을 것
- 렌더 지표: draw calls, geometries, textures를 dev-only로 기록

합격 기준:

- 바닥과 오브젝트 사이가 떠 보이지 않는다.
- 모델의 왼쪽/오른쪽/윗면 밝기가 구분된다.
- 창문/램프 방향과 highlight 방향이 모순되지 않는다.
- 기본 조작 중 드래그 latency가 나빠지지 않는다.

## 바로 다음 작업

1. 완료: `Lighting.tsx`를 조명 preset 데이터 구조로 분리한다.
2. 완료: `daylight-window` 프리셋을 기본값으로 만든다.
3. 완료: `window-main` 위치에서 면광을 계산한다.
4. 완료: high tier의 shadow caster는 1개로 유지한다.
5. 완료: Playwright 스크린샷으로 `daylight-window`, `warm-evening`, `night-room`을 비교한다.
6. 완료: "실제처럼 빛 계산" 요청을 Three.js 런타임 기준으로 반영했다.
   - 색상은 Kelvin 색온도 기반으로 계산한다.
   - 창문/필라이트는 RectAreaLight power 값으로 관리한다.
   - 램프는 inverse-square 감쇠와 target 방향을 가진 SpotLight로 바꿨다.
   - medium/high에서만 저비용 bounce area light를 켠다.
7. 완료: 로딩된 GLB material을 런타임에서 보정한다.
   - 램프의 light/glass/emission material은 emissive를 강화한다.
   - fabric/wood/metal material의 roughness, metalness, envMapIntensity, normalScale을 정리한다.
   - Day/Warm/Night별 contact shadow opacity/blur/far를 분기한다.
8. 완료: 체감이 약한 material-only 변경을 보완하기 위해 GLB floor object별 타원형 soft
   shadow와 lamp additive sprite glow를 추가했다.

다음 후보 작업:

1. asset id별 material override table을 별도 파일로 분리한다.
2. render asset audit에 material name/emissive 후보 목록을 포함한다.
3. bounce light 수/강도를 render quality별로 더 세밀하게 튜닝한다.
4. 모바일 390x844 스크린샷을 추가해 상단 프리셋 컨트롤이 장면을 과하게 가리지 않는지 확인한다.

## 참고 소스

- Three.js shadows manual: https://threejs.org/manual/en/shadows.html
- Three.js color management manual: https://threejs.org/manual/en/color-management.html
- Three.js RectAreaLight docs: https://threejs.org/docs/pages/RectAreaLight.html
- Three.js MeshStandardMaterial docs: https://threejs.org/docs/pages/MeshStandardMaterial.html
- Three.js PMREMGenerator docs: https://threejs.org/docs/pages/PMREMGenerator.html
- R3F Canvas docs: https://r3f.docs.pmnd.rs/api/canvas
