# 17. Render Quality Harness

작성일: 2026-04-23

## 결론

렌더링 품질은 하나의 숫자로 완전히 측정할 수 없다. 하지만 사용자가 실제로 느끼는 변화와
연결될 가능성이 높은 지표를 고정된 screenshot crop에서 계속 측정하면, "느낌"을 engineering
harness 안으로 어느 정도 끌고 올 수 있다.

중요한 원칙:

- 숫자는 최종 판정자가 아니다.
- 숫자는 screenshot과 항상 같이 봐야 한다.
- 사람이 A/B로 더 좋아 보인다고 느낀 기록과 metric delta를 맞춰가야 한다.
- 한 지표가 올라갔다고 무조건 품질이 오른 것은 아니다.

## 추가된 명령

```bash
pnpm render:quality-metrics
```

기본 target:

- `http://127.0.0.1:5188/`

출력:

- `output/render-quality-metrics/<run-id>.json`
- `output/render-quality-metrics/latest.json`
- `output/render-quality-metrics/<run-id>-base-iso-day.png`
- `output/render-quality-metrics/<run-id>-base-bird-day.png`
- `output/render-quality-metrics/<run-id>-base-pov-day.png`
- 같은 패턴의 warm/night screenshot
- `docs/render-quality-report.md`

비교 실행:

```bash
pnpm render:quality-metrics --baseline=output/render-quality-metrics/<previous-run>.json
```

view까지 포함한 실행:

```bash
pnpm render:quality-metrics --views=isometric,bird,pov --quality=medium
```

hero asset A/B까지 포함한 실행:

```bash
pnpm render:quality-metrics --views=isometric,bird,pov --quality=medium --hero-sets=all
```

현재 hero set:

- `baseline`
- `lounge-accents`
- `designer-lamps`

사람 선호 기록:

```bash
pnpm render:record-preference --run=output/render-quality-metrics/latest.json --winner=base-pov-night --loser=emit-pov-night --rating=4 --reason="warmer lamp reads better without muddying the wall"
```

주의:

- screenshot은 HTML overlay가 아니라 WebGL canvas 영역만 저장한다.
- `window.__pocketroomDebug`를 통해 lighting preset, camera mode, render quality를 고정한다.
- 결과 id는 `baseline:isometric:daylight-window`처럼 hero set, view, preset을 합친다.

## 현재 첫 측정값

첫 실행 결과:

- 평균 perceptual proxy score: `80.7`
- Day: `87.8`
- Warm: `64.3`
- Studio: `90.0`였지만, 이후 프리셋 방향을 더 명확히 하기 위해 `Night`로 교체했다.

Warm이 낮게 나온 것은 실패라기보다 의도된 어두운 프리셋의 특성도 섞여 있다. 그래서
프리셋끼리 단순 비교하기보다 같은 프리셋의 변경 전/후 delta를 보는 것이 맞다.

카메라 view 포함 측정값:

- 실행: `pnpm render:quality-metrics --views=isometric,bird,pov --quality=medium`
- 결과: `output/render-quality-metrics/2026-04-23T07-10-32-325Z.json`
- 평균 perceptual proxy score: `74.2`
- 낮았던 warm 개선:
  - `isometric:warm-evening`: `64.2 -> 70.5`
  - `bird:warm-evening`: `45.2 -> 50.1`
  - `pov:warm-evening`: `80.5 -> 81.4`
- POV daylight highlight 개선:
  - `pov:daylight-window`: 이전 view baseline 대비 `+2.6`

프리셋 방향 변경:

- 기존 `studio-catalog`는 Day와 역할이 겹치고 POV에서 highlight가 과했다.
- 그래서 세 번째 프리셋은 `night-room`으로 바꿨다.
- Night는 숫자상으로 Day보다 낮게 나와도 실패가 아니다. 목표는 "밝고 균등한 제품광"이 아니라
  적당히 어두운 공간, 램프 중심의 명암, 차가운 창빛과 따뜻한 실내등의 분리다.
- 그래서 harness는 `night-room`에 `night-mood` score profile을 사용한다.
- 최근 Night profile 결과: `output/render-quality-metrics/2026-04-23T07-36-35-441Z.json`
  - `isometric:night-room`: `58.9`
  - `bird:night-room`: `51.5`
  - `pov:night-room`: `70.2`

최근 hero A/B 결과:

- 실행: `pnpm render:quality-metrics --views=isometric,bird,pov --quality=medium --hero-sets=all`
- 결과: `output/render-quality-metrics/2026-04-23T07-51-56-364Z.json`
- 리포트: `docs/render-quality-report.md`
- 평균:
  - `baseline`: `67.7`
  - `blender-emissive-lamps`: `60.9`
  - `material-rich`: `60.4`
  - `designer-lamps`: `60.4`
- 판정:
  - baseline이 9개 view/preset 중 7개에서 이겼다.
  - 후보는 특정 close-up에서는 의미가 있지만 default room 전체 기본값으로 승격하지 않는다.

## 측정 지표

### lumaRangeP05P95

화면의 어두운 쪽 5%와 밝은 쪽 95% 차이다.

체감 연결:

- 너무 낮으면 flat하고 흐리게 보인다.
- 너무 높으면 UI/모델이 거칠거나 날아가 보일 수 있다.

### localContrast

인접 픽셀 간 밝기 변화량이다.

체감 연결:

- 모델 edge, 재질 결, trim, 접지감이 선명해졌는지 보는 데 유용하다.
- 너무 높으면 oversharpened 또는 noisy하게 보일 수 있다.

### shadowRatio

scene crop 안에서 중저명도 픽셀이 차지하는 비율이다.

체감 연결:

- 바닥과 가구가 떠 보이지 않는지, 코너가 살아 있는지와 연결된다.
- 너무 높으면 방이 더럽고 칙칙해 보인다.

### highlightRatio

밝은 픽셀 비율이다.

체감 연결:

- 창문/램프/하이라이트가 눈에 들어오는지와 연결된다.
- 너무 높으면 overexposure가 된다.

### warmCoolStdDev

warm/cool 색 분리 정도다.

체감 연결:

- 창빛, 램프, 바닥 bounce가 색온도 차이를 만들고 있는지 본다.
- 사진 같은 방은 완전한 단색 조명보다 약한 색온도 분리가 있는 편이 자연스럽다.

### sceneOccupancy

crop 안에서 의미 있는 밝기를 가진 픽셀 비율이다.

체감 연결:

- 빈 화면/너무 어두운 화면/room crop 실패를 잡는다.

### darkBlobRatio

crop 내부에서 border와 연결되지 않은 큰 저명도 덩어리의 최대 비율이다.

체감 연결:

- 특정 GLB가 검정 박스처럼 깨지는 asset artifact를 잡는다.
- canvas 배경처럼 crop border와 연결된 검정 영역은 제외한다.
- 정상적인 작은 검정 제품 디테일은 큰 페널티가 되지 않아야 한다.

## Perceptual Proxy Score

`scripts/measure-render-quality.mjs`는 위 지표를 가중합해 `perceptualProxyScore`를 만든다.

현재 가중치:

- contrast: 20%
- local contrast: 18%
- grounding/shadow: 18%
- highlight control: 14%
- color separation: 16%
- occupancy: 14%
- dark blob artifact: 별도 penalty, 최대 18%

이 가중치는 확정값이 아니다. 앞으로 사람이 실제로 "나아졌다"고 느낀 A/B 결과와 다르면
가중치를 조정해야 한다.

Night profile은 같은 metric을 쓰되 목표 구간이 다르다.

- 더 높은 shadow ratio를 허용한다.
- highlight ratio는 낮아도 실패로 보지 않는다.
- contrast/local contrast는 낮은 조명에서도 형태가 읽히는지 중심으로 본다.
- Day/Warm score와 Night score를 직접 비교하지 않는다.

## 운영 방식

1. 변경 전 `pnpm render:quality-metrics`를 실행한다.
2. 나온 JSON path를 baseline으로 기록한다.
3. 렌더링 변경을 한다.
4. `pnpm render:quality-metrics --baseline=<baseline-json>`을 실행한다.
5. delta와 screenshot을 같이 본다.
6. 사람이 더 좋아 보이는지 1-5점 또는 A/B preference로 기록한다.
7. 수치 상승과 사람 선호가 어긋나면 metric 또는 가중치를 조정한다.

성능 예산:

```bash
pnpm render:budget
```

출력:

- `output/render-budget/latest.json`
- `docs/render-budget-report.md`

최근 medium budget:

- max draw calls: `75`
- max triangles: `99,831`
- max textures: `68`
- 현재 목표치인 draw calls `<180`, triangles `<450k`, textures `<90` 안에 있다.

## 주의점

- PSNR/SSIM처럼 "이전 이미지와 비슷한가"를 보는 지표는 렌더 품질 개선에는 부적합할 수 있다.
  더 좋아진 이미지는 이전 이미지와 달라야 하기 때문이다.
- 대신 같은 camera, 같은 crop, 같은 preset에서 perceptual proxy를 비교한다.
- bird/POV처럼 camera가 다르면 서로 직접 비교하지 말고 같은 view끼리 delta를 본다.
- metric이 올라가도 screenshot이 나쁘면 실패다.
- metric이 내려가도 intentional warm/night mood라면 실패가 아닐 수 있다.
