# 3D Room Planner — 2026 Mobile Web Prototype

오늘의집 3D 방꾸미기 프로토타입을 2026년 4월 기준 최신 웹 3D 스택으로 재현·확장.

**비전**: "누구나 자기만의 인테리어를 쉽게 실현할 수 있는 AI Floor Planner"
— 375×812 모바일 웹에서 Three.js + R3F로 3D 방을 꾸미고, LLM(Claude 4.7)이 대화로 배치를 제안하는 PWA.

---

## 📚 연구 & 기획 문서

| 문서 | 내용 |
|------|------|
| [01-requirements.md](docs/01-requirements.md) | RP_deck.pdf → 기능/비기능 요구사항 |
| [02-tech-stack.md](docs/02-tech-stack.md) | Three.js r184 / R3F 9.6 / Drei / Vite 6 버전별 이유 |
| [03-assets.md](docs/03-assets.md) | Kenney CC0 + Poly Pizza + Meshy 조합으로 40개 카탈로그 |
| [04-ai-strategy.md](docs/04-ai-strategy.md) | Claude Sonnet 4.7 + JSON schema + 로컬 constraint solver |
| [05-architecture.md](docs/05-architecture.md) | 디렉토리 구조, 데이터 모델, 핵심 컴포넌트 설계 |
| [06-competitors.md](docs/06-competitors.md) | 오늘의집/IKEA/Altroom3d 기술 벤치마크 |
| [07-performance.md](docs/07-performance.md) | 모바일 60fps 체크리스트 (draw call, DPR, 베이크드 lightmap 등) |
| **[08-final-report.md](docs/08-final-report.md)** | **종합 제안서 + 타임라인 + 액션 리스트** |
| **[09-figma-ui-spec.md](docs/09-figma-ui-spec.md)** | **Figma Pocketroom Master 4 스크린 상세 스펙** |
| **[10-design-tokens.md](docs/10-design-tokens.md)** | **디자인 토큰 → tokens.ts 코드 스키마** |
| **[11-rendering-quality.md](docs/11-rendering-quality.md)** | **PBR 에셋/GLB 최적화/렌더링 퀄리티 파이프라인** |
| **[12-rendering-next-step-research.md](docs/12-rendering-next-step-research.md)** | **현재 코드베이스 기준 렌더링 다음 단계 리서치** |
| **[13-rendering-next-step-plan.md](docs/13-rendering-next-step-plan.md)** | **main 충돌 리스크와 렌더링 개선 실행 계획** |

## 🎯 핵심 기술 스택

```
React 19 + TypeScript
Vite 6 + vite-plugin-pwa
Three.js r184 (three/webgpu with WebGL2 fallback)
@react-three/fiber v9.6.0 + @react-three/drei v10.7.7 (sub-path imports)
Zustand (상태), Anthropic SDK (Claude 4.7)
gltf-transform + Meshopt + KTX2 (에셋 파이프라인)
```

## 🎨 비주얼 아이덴티티

**포켓룸 / Altroom3d 스타일**
- OrthographicCamera + 벽 2면 cutaway
- Blender 베이크드 lightmap (runtime ~0ms)
- Toon/Lambert 머티리얼 + contact shadows
- 따뜻한 directional 45° + hemisphere fill

## 🤖 AI 전략 요약

```
User: "예산 300만, 1인 원룸, 자는 공간 분리, 모던 B&W"
  ↓
Claude Sonnet 4.7 (JSON schema, streaming)
  ↓
{ placements: [{ catalogId, x, z, rotY }...] }
  ↓
Local constraint solver (AABB, wall snap, clearance, 한국 규칙)
  ↓
3D scene staggered fade-in + narration
  ↓
User: "좀 더 따뜻하게" → Gemini Flash diff ($0.003)
```

**세션당 비용**: $0.05~0.15 (생성 1 + 수정 5)

## ⚡ 성능 타깃

| 메트릭 | 목표 |
|--------|-----|
| FPS | 60 (min 45) |
| Draw calls | < 100 |
| 초기 JS (gzip) | < 400KB |
| 첫 가구 visible | < 2.5s (4G) |
| 텍스처 메모리 | < 64MB |
| 터치 → 선택 | < 100ms |

## 🗺 로드맵 (4-8주 MVP)

- **Week 1-2**: 프로젝트 셋업 + 에셋 파이프라인 + 10개 가구 + 방 생성 + isometric scene
- **Week 3-4**: 드래그 배치 + 벽 snap + 40개 카탈로그 + 카테고리 UI
- **Week 5-6**: AI layout (Claude) + streaming + constraint solver + chat refinement (Gemini)
- **Week 7-8**: 성능 튜닝 (PerformanceMonitor) + PWA + polish + 실기기 QA + 베타

## 🚀 시작

```bash
# 준비
pnpm create vite@latest . --template react-ts
pnpm add three@0.184.0 @react-three/fiber@9.6.0 @react-three/drei@10.7.7
pnpm add @react-three/postprocessing zustand immer
pnpm add -D vite-plugin-pwa @types/three @gltf-transform/cli

# 에셋 (Kenney CC0 140개)
mkdir -p raw/furniture public/assets/furniture
curl -L -o /tmp/kenney.zip "https://kenney.nl/media/pages/assets/furniture-kit/e56d2a9828-1677580847/kenney_furniture-kit.zip"
unzip /tmp/kenney.zip -d raw/furniture/kenney

# 최적화
gltf-transform optimize raw/furniture/kenney/bed.glb public/assets/furniture/bed.glb \
  --compress meshopt --texture-compress webp --simplify 0.75
```

자세한 내용은 [docs/08-final-report.md](docs/08-final-report.md) 참조.

## 📌 프로젝트 현황

- **2026-04-20**: 리서치 & 기획 완료 (이 문서들)
- **Next**: 프로젝트 스캐폴드 → hello scene → Week 1 시작

---

**Not affiliated with 오늘의집/Ohou.** 개인 학습/프로토타입 프로젝트.
