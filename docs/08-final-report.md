# 08. 최종 연구 리포트: 2026년 3D Room Planner 모바일 프로토타입 기술 제안서

> 작성일: 2026-04-20
> 기반: RP_deck.pdf (오늘의집 XR팀 AI Floor Planner 로드맵) + 5개 병렬 리서치

---

## TL;DR

1. **스택 확정**: React 19 + Vite 6 + Three.js r184 + R3F v9.6 + Drei v10.7 + Zustand. WebGPU 자동 + WebGL2 fallback. 번들 ~330-380 KB gzipped.
2. **비주얼 아이덴티티**: **Altroom3d "포켓룸" 스타일** — OrthographicCamera + 벽 2면 cutaway + 베이크드 lightmap + toon/Lambert 머티리얼. 모바일 60fps 유지하면서 차별화된 시각.
3. **에셋**: **Kenney Furniture Kit (CC0 140개) + Poly Pizza + Meshy Pro ($10/월 한국 특화)** 조합으로 40개 MVP 카탈로그 확보. Meshopt + KTX2 파이프라인으로 가구당 50-500KB.
4. **AI 전략**: 전용 모델(LayoutGPT, DiffuScene) 대신 **Claude Sonnet 4.7 + JSON schema enforcement + 로컬 constraint solver (AABB, wall snap, clearance, 한국 컨벤션)**. 세션당 $0.05~0.15.
5. **성능 핵심**: `frameloop="demand"`, DPR 1.5 클램프, draw call < 100, contact shadows (no real shadows), 베이크드 lightmap, dispose 의무화.
6. **타임라인**: **4-8주 MVP**. 주 1-2 인프라+드래그, 3-4 AI + 후처리, 5-6 chat refinement, 7-8 성능 튜닝+베타.

---

## 1. 문제 재정의 (PDF → 기술)

오늘의집 XR팀 덱에서 추출한 핵심 문제:
- "도로 한복판에 놓인 인테리어 아기 유저" — 선택지 과잉 + 판단 기준 부재 + 자기 공간에서 상상이 안 됨
- Direction 1: **실제 공간 기반 재현** (유저 비용 ↓)
- Direction 2: **상상 비용 ↓** (low-fi 렌더링으로도 충분)
- Direction 3: **LLM 기반 개인화 제안** (Key Leverage)

→ 이걸 **375×812 모바일 웹 Three.js 프로토타입**에서 재현 + 2026 기술로 업그레이드.

## 2. 의사결정 서머리 (왜 이걸 선택했나)

| 질문 | 결정 | 근거 |
|------|------|------|
| 3D 엔진? | **Three.js r184** | 5M weekly npm. 오늘의집/Matterport/IKEA 파트너 모두 사용. R3F 생태계 성숙 |
| React 바인딩? | **R3F + Drei (sub-path imports)** | DX 최고, 프로토타입 velocity 최상 |
| 빌드 툴? | **Vite 6 (Next.js X)** | 에디터 로그인 뒤 — SSR/SEO 불필요. HMR 압도적 |
| WebGPU? | **`three/webgpu` 자동 fallback** | iOS 26+ 지원, 이전은 WebGL2 조용히 |
| 물리 엔진? | **없음 (raycast + AABB)** | 가구 배치엔 과잉. Rapier는 v2에서 스택/낙하시 고려 |
| 후처리? | **tone map + bloom (0.5x res) + FXAA** | SSAO/SSR은 베이크드 AO로 대체 |
| 비주얼 스타일? | **Orthographic + 벽 cutaway + toon** | Altroom3d 미학, 모바일 훨씬 저렴 |
| 그림자? | **ContactShadows 평면** | 실제 shadowmap은 ~8ms, contact는 ~0.1ms |
| LOD? | **스킵** | 인테리어 1-10m, ROI 없음 (three.js 포럼 컨센서스) |
| 라이팅? | **Blender 베이크드 lightmap + 1 hemi + envMap** | 런타임 2ms vs 동적 3라이트 15ms |
| 압축? | **Meshopt (기본) + KTX2 (텍스처)** | 디코더 27KB (Draco 400KB 대비), 더 빠름 |
| AI 모델? | **Claude Sonnet 4.7 (생성) + Gemini Flash (수정)** | API 준비됨, JSON schema 99.8%+ 준수 |
| AI 접근법? | **LLM + 로컬 solver (2-stage)** | 전용 모델은 API 없고 4주 MVP 불가 |
| 방 입력? | **v1: 수동 치수. v2: 사진→MoGe, 평면도→RoomFormer** | MVP는 간단하게 |
| AR? | **웹에서 시도 X** | iOS 2026도 WebXR 없음. v2 네이티브 앱 딥링크 |

## 3. MVP 스코프 (4-8주 ship)

### Week 1-2: 기반
- [ ] Vite + R3F 셋업, `three/webgpu` import
- [ ] 에셋 파이프라인 (`scripts/optimize-assets.mjs` — gltf-transform + meshopt + KTX2)
- [ ] Kenney Furniture Kit 다운로드 → 처리 → 10개 초기 아이템
- [ ] Onboarding (방 가로/세로/높이 슬라이더) → localStorage
- [ ] Isometric 카메라 + 벽 2면 cutaway + 바닥
- [ ] CameraControls (mobile gestures)

### Week 3-4: 배치 인터랙션
- [ ] useGLTF + Meshopt + KTX2 로더
- [ ] CatalogDrawer (하단 bottom sheet) + 카테고리 탭
- [ ] 드래그 배치 (raycast + AABB collision + 벽 snap)
- [ ] SelectionGizmo (PivotControls Y축 회전만, delete 버튼)
- [ ] 40개 가구 확보 + 썸네일
- [ ] Zustand store (room, placements, selection, ui)

### Week 5-6: AI + 성능
- [ ] Anthropic SDK 프록시 (Hono + Bun)
- [ ] System prompt with Korean rules + JSON schema
- [ ] Streaming JSON parser → 가구 staggered fade-in
- [ ] Local constraint solver (snap, clearance, door swing)
- [ ] ChatSheet + Gemini Flash diff-based refinement
- [ ] StylePicker 8개 preset
- [ ] Budget pill 실시간 집계
- [ ] PerformanceMonitor → 3-tier fallback
- [ ] Dispose 인프라

### Week 7-8: 폴리시
- [ ] Animations (가구 fade-in, 카메라 smooth move)
- [ ] Undo/Redo (placements store history)
- [ ] Haptic feedback (iOS)
- [ ] PWA manifest + offline cache
- [ ] Share page (읽기 전용 view + OG 이미지 canvas capture)
- [ ] Analytics events
- [ ] 실기기 QA (iPhone 12, iPhone 14, Galaxy A54, S24)
- [ ] 베타 배포

## 4. 성능 타깃 (측정 기준)

```
디바이스: iPhone 12 (A14), Galaxy A54 (SD 7+ Gen 3)
뷰포트: 375×812

초기 로드 (4G, 캐시 cold):
  TTFB:                < 300ms
  JS main (gzip):      < 400KB
  First 가구 visible:  < 2.5s
  전체 GLB 40개 lazy:  < 8MB

런타임:
  FPS target:          60
  FPS floor:           45
  Draw calls:          < 100 (Hard ceiling)
  Triangles:           < 200K
  Texture memory:      < 64MB
  Interaction latency: < 100ms (touch → select)

AI:
  Layout 생성:         < 5s (streaming 첫 가구 < 2s)
  Chat refinement:     < 1.5s (Flash)
  세션 비용:           $0.05~0.15
```

## 5. 비용 추정

### 개발 (MVP)
- PO 1명 × 8주
- FE Eng 1.5명 × 8주
- 3D/디자인 0.5명 × 8주 (에셋 큐레이션 + Blender baking)

### 운영 (월간, 유저 10K MAU 가정)
- AI (Claude + Gemini): **$500-1500** (세션당 $0.05-0.15 × 10K)
- 호스팅 (Vercel / Cloudflare): **$0-50**
- 에셋 CDN (R2/S3): **$20-50**
- Meshy Pro: **$10/월** (진행형 에셋 추가용)

### 에셋 (1회)
- CC0 (Kenney, Poly Pizza): **$0**
- Meshy Pro 에셋 생성 3개월: **$30**
- (선택) Blender 베이킹 프리랜서: **$1-3K** (40개 가구 × 1h)

## 6. 리스크 & 완화

| 리스크 | 확률 | 임팩트 | 완화 |
|--------|-----|--------|------|
| Kenney/CC0로 한국 분위기 재현 한계 | 중 | 중 | Meshy로 한국 특화 10개 + Blender 커스텀 마테리얼 |
| AI 배치 결과가 이상 (문 막음 등) | 중 | 높음 | Stage 2 constraint solver로 후처리 + 가시적 fallback |
| iOS Safari 메모리 크래시 | 중 | 높음 | dispose 의무화 + 텍스처 1024² 상한 + 가구 15개 제한 |
| JSON schema 환각 (가구 ID 없음) | 저 | 중 | catalog whitelist 검증 + retry |
| 실기기 성능 미달 | 중 | 중 | PerformanceMonitor 3-tier + 베이크드 lightmap |
| IKEA 라이선스 위반 | 저 | 높음 | **상업 배포에 IKEA GLB 금지**. 내부 참조만 |
| 모바일 드래그 UX 혼동 | 높음 | 중 | 한 손가락 드래그 = 가구(선택) / 카메라(빈영역) 명확한 룰 |
| AI 비용 폭주 | 저 | 중 | 유저당 일일 생성 횟수 제한 (예: 5회), Flash로 수정 |

## 7. 오리지널 프로토타입 대비 업그레이드 포인트

원본 (2020-2022년 경 오늘의집 프로토타입) 대비 2026 개선:

| 영역 | 2020-22 | 2026 제안 |
|------|---------|----------|
| 렌더러 | WebGL1/2 | WebGPU (iOS 26+) + WebGL2 자동 |
| 번들 | ~1.5MB initial | ~380KB gzip (tree-shaken Drei) |
| 에셋 압축 | Draco | Meshopt (27KB 디코더) |
| 텍스처 | PNG/JPEG | KTX2 (BasisU 트랜스코딩, 4-8x GPU 메모리 절감) |
| AI 배치 | 없음 / 규칙 기반 | Claude Sonnet 4.7 + JSON schema + streaming |
| 대화 수정 | 없음 | 자연어 chat refinement |
| 스타일 자체성 | 표준 PBR | 포켓룸 isometric + 베이크드 lightmap |
| 성능 적응 | 고정 | 3-tier dynamic (PerformanceMonitor) |
| 저장 | 서버만 | localStorage + PWA 오프라인 |

## 8. 핵심 파일 스냅샷 (내일 작업 시작 시 참조)

```
docs/01-requirements.md     → PDF → 기능 스펙
docs/02-tech-stack.md       → 패키지 버전 & 이유
docs/03-assets.md           → 에셋 다운로드 & 파이프라인
docs/04-ai-strategy.md      → LLM 프롬프트 & 후처리
docs/05-architecture.md     → 디렉토리/모듈/데이터 모델
docs/06-competitors.md      → 오늘의집/IKEA/Altroom3d 벤치마크
docs/07-performance.md      → 60fps 모바일 체크리스트
docs/08-final-report.md     → 이 문서
```

## 9. 내일 시작 액션 (첫 세션 1-2시간)

```bash
# 1. 프로젝트 초기화
cd /Users/ilwonyoon/Documents/3d_room_planner
pnpm create vite@latest . --template react-ts
pnpm add three@0.184.0 @react-three/fiber@9.6.0 @react-three/drei@10.7.7
pnpm add @react-three/postprocessing zustand immer
pnpm add -D vite-plugin-pwa @types/three @gltf-transform/cli

# 2. 에셋 파이프라인
mkdir -p raw/furniture public/assets/{furniture,thumbnails,hdri}
curl -L -o /tmp/kenney.zip "https://kenney.nl/media/pages/assets/furniture-kit/e56d2a9828-1677580847/kenney_furniture-kit.zip"
unzip /tmp/kenney.zip -d raw/furniture/kenney

# 3. 샘플 최적화 시도
gltf-transform optimize raw/furniture/kenney/bed.glb public/assets/furniture/bed.glb \
  --compress meshopt --texture-compress webp --simplify 0.75

# 4. Hello scene (isometric 룸 + 단일 가구)
#    → src/scene/IsometricScene.tsx 부터 시작
```

## 10. 다음 대화에서 Claude에게 던질 첫 프롬프트 후보

```
@docs/05-architecture.md 읽고 src/ 초기 스캐폴드 생성해줘.
- React 19 + Vite 6 + TypeScript
- 디렉토리 구조는 architecture.md 섹션 2 따름
- IsometricScene.tsx 에 Orthographic camera + 벽 2면 + 바닥만
- Zustand roomStore + placementsStore 뼈대
- main.tsx, App.tsx, Editor.tsx 까지 연결
```

---

## 부록 A. 비교 테이블: 오늘의집/IKEA/Altroom3d/우리

| 차원 | 오늘의집 | IKEA Kreativ | Altroom3d | **우리 2026** |
|------|---------|-------------|-----------|--------------|
| 플랫폼 | 웹 + 앱 AR | 앱 AR + 웹 | TikTok 비디오 | **모바일 웹 PWA** |
| 엔진 | Three.js WebGL | Three.js + 클라우드 | Blender | **Three.js r184 WebGPU** |
| 비주얼 | 사실적 PBR | Photoreal | 포켓룸 isometric | **포켓룸 + 베이크드 lightmap** |
| 방 입력 | 수동 | 사진 스캔 (LiDAR+AI) | 수동 (Blender) | **v1: 수동, v2: MoGe 사진** |
| AI 배치 | 없음 | 없음 | 수동 | **Claude Sonnet 4.7 + streaming** |
| 가구 수 | 수천 상품 | 수천 IKEA | 수동 모델링 | **40 MVP → 200 v2** |
| AR | 앱만 | 앱만 | 없음 | **v2 네이티브 딥링크** |
| 소셜 | 공유 강력 | 약함 | TikTok | **share link + OG v1** |

## 부록 B. 한 줄 정의

> **"포켓룸 미학 + Three.js r184 모바일 PWA + Claude 기반 AI Floor Planner — 오늘의집 2022 프로토타입을 2026 기술로 재현·확장."**

---

**Research complete. Ready to build.**
