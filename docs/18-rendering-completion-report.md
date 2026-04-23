# 18. Rendering Completion Report

작성일: 2026-04-23

## 결론

현재 코드베이스에서 성능을 유지하면서 안전하게 넣을 수 있는 실시간 렌더링 개선은 대부분
적용했고, 추가 후보는 harness에서 baseline을 이길 때만 승격하는 구조로 정리했다.

핵심 판정:

- baseline default room은 유지한다.
- Blender로 만든 emissive lamp 후보와 high-material 후보는 생성했지만 default로 승격하지 않는다.
- 이유는 최근 A/B harness에서 전체 평균과 대부분의 view/preset winner가 baseline이기 때문이다.

## 완료한 것

- Day/Warm/Night lighting preset 분리
- Night용 어두운 창문/낮은 exterior glow 정리
- 램프 glow sprite의 사각형 artifact 제거
- static AO/window wash overlay를 preset/view별 opacity로 적용
- 이동/선택 성능을 Playwright 기반 interaction harness로 검증
- quality metric harness 추가
- render budget harness 추가
- Blender CLI 기반 hero asset QA
- Blender CLI 기반 emissive lamp variant 생성
- Blender CLI 기반 static shell GLB prototype 생성
- hero asset A/B 후보 측정 및 리포트 생성
- human A/B preference 기록 스크립트 추가

## 최근 검증 결과

명령:

```bash
pnpm typecheck
pnpm build
pnpm blender:create-hero-variants
pnpm blender:export-static-shell
pnpm render:quality-metrics --views=isometric,bird,pov --quality=medium --hero-sets=all
pnpm render:budget
```

결과:

- typecheck 통과
- build 통과
- render quality 리포트: `docs/render-quality-report.md`
- render budget 리포트: `docs/render-budget-report.md`
- budget max draw calls: `75`
- budget max triangles: `99,831`
- budget max textures: `68`

## 현재 남은 일의 성격

여기서부터는 "Three.js에서 옵션을 더 켜면 좋아진다"보다 아래 작업의 비중이 커진다.

1. 더 좋은 원본 에셋 후보를 확보한다.
2. 같은 room/camera/lighting 조건에서 A/B screenshot을 본다.
3. 사람이 더 좋아 보인 후보를 preference log로 남긴다.
4. 그 선호와 metric delta가 맞는지 보고 scoring weight를 조정한다.
5. 성능 budget을 넘지 않는 후보만 default로 승격한다.

즉, 남은 개선은 코드 한 번으로 끝나는 작업보다 asset curation + harness engineering의 반복이다.
