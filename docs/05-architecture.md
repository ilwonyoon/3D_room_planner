# 05. 프로토타입 아키텍처 (확정판)

> 리서치일: 2026-04-20
> 기반: 01-requirements, 02-tech-stack, 03-assets, 04-ai-strategy, 06-competitors, 07-performance

---

## 1. 최상위 시스템 다이어그램

```
┌──────────────────────────────────────────────────────────────────┐
│  PWA (375×812 Mobile Web)                                         │
│  React 19 + Vite 6 + vite-plugin-pwa                              │
│                                                                    │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐ │
│  │ UI Layer (React DOM) │   │ 3D Layer (R3F + Three.js r184)   │ │
│  │                       │   │                                   │ │
│  │ - Onboarding          │   │ - OrthographicCamera (Isometric) │ │
│  │ - Top bar             │   │ - Room (벽 cutaway 2면)          │ │
│  │ - Catalog drawer      │◄─►│ - Furniture (GLB + Meshopt + KTX2)│ │
│  │ - Selection bar       │   │ - DragControls (raycast+AABB)    │ │
│  │ - Chat sheet (AI)     │   │ - PivotControls (rotate Y)       │ │
│  │ - Budget pill         │   │ - ContactShadows                 │ │
│  │ - Perf HUD (dev)      │   │ - HemisphereLight + envMap       │ │
│  └──────────┬───────────┘   └──────────────┬───────────────────┘ │
│             │                                │                     │
│             └────── Zustand store (slices) ─┘                     │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Domain (순수 로직, 테스트 가능)                                 ││
│  │  - collision.ts (SAT/AABB)                                   ││
│  │  - snap.ts (walls, grid 5cm)                                 ││
│  │  - constraints.ts (clearance, door swing)                    ││
│  │  - koreanRules.ts (TV벽, 신발장, 평→m²)                      ││
│  │  - layout.ts (LLM 결과 → placements 정규화)                   ││
│  │  - catalog.ts (40 items metadata)                            ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Services                                                       ││
│  │  - assetLoader (useGLTF + Meshopt decoder + KTX2Loader)      ││
│  │  - persist (localStorage + IndexedDB fallback)                ││
│  │  - ai (Anthropic SDK streaming client)                       ││
│  │  - analytics (perf, funnel events)                            ││
│  └──────────────────────────────────────────────────────────────┘│
└────────────────┬────────────────────────────────┬────────────────┘
                 │                                │
                 ▼                                ▼
     ┌───────────────────────┐        ┌──────────────────────────┐
     │ CDN (static)           │        │ Backend (Hono + Bun)      │
     │ - /assets/furniture/   │        │                          │
     │   40× GLB (Meshopt)    │        │ POST /ai/layout          │
     │ - /assets/hdri/        │        │ POST /ai/refine          │
     │ - /assets/thumbnails/  │        │ POST /ai/chat            │
     │ - /assets/catalog.json │        │        │                 │
     └───────────────────────┘        │        ▼                 │
                                       │  Anthropic Claude        │
                                       │  Sonnet 4.7 (생성)       │
                                       │  + Gemini Flash (수정)   │
                                       └──────────────────────────┘
```

## 2. 디렉토리 구조 (확정)

```
3d_room_planner/
├── docs/                         # 이 문서들
├── public/
│   └── assets/
│       ├── furniture/            # 40× .glb (Meshopt+KTX2)
│       ├── hdri/                 # env.hdr
│       ├── thumbnails/           # 512×512 .webp per 가구
│       └── catalog.json          # 40 item metadata
├── scripts/
│   ├── optimize-assets.mjs       # gltf-transform 배치 파이프라인
│   ├── generate-thumbnails.mjs   # puppeteer + three (Node)
│   └── build-catalog.mjs         # YAML → catalog.json
├── raw/                          # git-ignored, 원본 GLB
│   └── furniture/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── app/                      # 화면 (route 개념)
│   │   ├── Onboarding.tsx
│   │   ├── Editor.tsx            # 메인 편집기
│   │   └── Share.tsx
│   ├── scene/                    # 3D R3F 컴포넌트
│   │   ├── IsometricScene.tsx    # Canvas + OrthographicCamera
│   │   ├── Room.tsx              # 벽 cutaway + 바닥
│   │   ├── Furniture.tsx         # 단일 GLB 로더 + fade-in
│   │   ├── FurnitureGroup.tsx    # 전체 배치 리스트
│   │   ├── DragController.tsx    # raycast + AABB
│   │   ├── PlacementHandlers.tsx # 4방향 커스텀 핸들 (위/좌/우/하)
│   │   ├── HandlerButton.tsx     # 단일 흰 원 핸들 (DOM overlay)
│   │   ├── Lighting.tsx          # Hemi + env
│   │   ├── ContactShadowsLayer.tsx
│   │   └── PerfHud.tsx           # dev only
│   ├── ui/                       # DOM UI (Figma Pocketroom Master 기반)
│   │   ├── EditorTopBar.tsx      # "초기화" + "완료" (상단 transparent)
│   │   ├── PrimaryButton.tsx     # #6391E6 pill
│   │   ├── GhostButton.tsx       # transparent + white text
│   │   ├── CatalogSheet.tsx      # grabber + 카테고리 탭 + 그리드
│   │   ├── CategoryTabs.tsx      # 10개 카테고리 가로 스크롤
│   │   ├── CategoryIconButton.tsx # 48×68 icon + label
│   │   ├── SelectChip.tsx        # "전체/뫄뫄의자/책상..." pill chips
│   │   ├── CatalogFilterBar.tsx  # "상품 9,999 | 컬러 ▾ | 최신순 ▾"
│   │   ├── ProductCard.tsx       # 111×158 (썸네일+브랜드)
│   │   ├── ProductThumb.tsx      # 120→111 mask
│   │   ├── ToastHint.tsx         # "누르고 밀어서 위치를 조정하세요"
│   │   ├── ChatSheet.tsx         # AI chat (v1.1 추가)
│   │   ├── RoomSizeDialog.tsx    # 온보딩 치수 입력 (도출 필요)
│   │   ├── StylePicker.tsx       # 5-8 preset (v1.1 추가)
│   │   └── PerfOverlay.tsx       # dev only
│   ├── store/                    # Zustand slices
│   │   ├── roomStore.ts
│   │   ├── placementsStore.ts    # 배치된 가구들
│   │   ├── selectionStore.ts
│   │   ├── uiStore.ts
│   │   └── chatStore.ts
│   ├── services/
│   │   ├── assetLoader.ts        # useGLTF + Meshopt + KTX2
│   │   ├── persist.ts
│   │   ├── ai/
│   │   │   ├── client.ts         # Anthropic client
│   │   │   ├── prompts.ts        # system prompts
│   │   │   ├── streamParser.ts   # incremental JSON
│   │   │   └── types.ts
│   │   └── analytics.ts
│   ├── domain/                   # 순수 TS, 테스트 우선
│   │   ├── types.ts
│   │   ├── catalog.ts
│   │   ├── collision.ts          # SAT on 2D rectangles
│   │   ├── snap.ts               # 5cm grid + 10cm wall snap
│   │   ├── constraints.ts        # clearance rules
│   │   ├── koreanRules.ts
│   │   ├── layout.ts             # LLM output → normalized
│   │   └── budget.ts
│   ├── hooks/
│   │   ├── useDrag.ts
│   │   ├── useSelection.ts
│   │   └── usePerfMonitor.ts
│   ├── constants/
│   │   ├── tokens.ts             # Figma 변수 → 코드 (color/text/space/radius)
│   │   ├── tokens.css.ts         # CSS 변수 매핑
│   │   ├── categories.ts         # 10개 카테고리 고정 (Figma 순서)
│   │   ├── styles.ts             # AI 스타일 프리셋 5-8개
│   │   └── fonts.ts              # Pretendard/SF Pro 선언
│   ├── assets/                   # 인라인 SVG 아이콘
│   │   ├── icons/
│   │   │   ├── category-*.svg    # 10개 카테고리
│   │   │   ├── coin.svg          # 인테리어 통장 화폐
│   │   │   ├── handler-{up,left,right,move}.svg
│   │   │   └── chevron-down.svg
│   │   └── fonts/
│   │       └── Pretendard-*.woff2
│   └── types/
├── server/                       # (선택) AI 프록시
│   ├── index.ts                  # Hono
│   └── api/
│       ├── layout.ts
│       ├── refine.ts
│       └── chat.ts
├── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 3. 핵심 데이터 모델

```typescript
// src/domain/types.ts

export type Vec2 = { x: number; z: number }
export type Vec3 = { x: number; y: number; z: number }

export type WallSide = 'north' | 'south' | 'east' | 'west'

// Figma Pocketroom Master 10개 카테고리 (순서 고정)
export type FurnitureCategory =
  | 'new' | 'wallfloor' | 'sofa' | 'chair' | 'table'
  | 'storage' | 'decor' | 'lighting' | 'appliance' | 'bed'

export type StyleTag = 
  | 'modern_bw' | 'warm_nordic' | 'minimal_japandi' | 'retro_70s'
  | 'industrial' | 'boho' | 'kids' | 'luxury'

export interface Room {
  id: string
  widthM: number       // X
  depthM: number       // Z
  heightM: number      // Y
  entrance: { wall: WallSide; centerX: number; widthM: number }
  windows: Array<{ wall: WallSide; centerX: number; widthM: number; sillHeightM: number }>
  floor: { material: 'wood' | 'tile' | 'carpet'; colorHex: string }
  wall: { colorHex: string }
}

export interface FurnitureCatalogItem {
  id: string                    // 'bed_double_01'
  name: string                  // '더블 침대'
  nameEn: string
  brand: string                 // '영가구', 'vitra' (Figma 카드 상단)
  category: FurnitureCategory
  tags: string[]                // ['모던', '우드', 'IKEA-style']
  styleTags: StyleTag[]
  glbUrl: string
  thumbnail: string             // 120×120 webp
  dimensionsM: Vec3             // bbox
  placement: 'floor' | 'wall' | 'ceiling'
  snapToWall: boolean
  clearanceM: { front: number; sides: number; back?: number }
  source: string                // 'kenney' | 'polypizza' | 'meshy' | 'procedural'
  license: 'CC0' | 'CC-BY' | 'commercial'
}

export interface PlacedFurniture {
  instanceId: string            // uuid
  catalogId: string
  position: Vec2                // floor (y는 placement 타입에 따라 자동)
  rotationY: number             // radians, snap to 0/90/180/270
  createdAt: number
}

export interface RoomPlan {
  version: 1
  id: string
  room: Room
  placements: PlacedFurniture[]
  styleTag: StyleTag
  createdAt: string
  updatedAt: string
  aiSessionId?: string
}

export interface AIChatTurn {
  role: 'user' | 'assistant'
  content: string
  diffs?: Array<
    | { op: 'add'; placement: PlacedFurniture }
    | { op: 'remove'; instanceId: string }
    | { op: 'move'; instanceId: string; to: Vec2; rotationY?: number }
  >
  timestamp: number
}
```

## 4. 메인 화면 레이아웃 — Figma Pocketroom Master 기반 (375×812)

> 상세 스펙: [docs/09-figma-ui-spec.md](09-figma-ui-spec.md)

### 4.1 Editor Main (기본 상태)

```
┌────────────────────────────────────┐
│ ░░ Status bar 44.5px (mix-blend) ░│  iOS safe-area
├────────────────────────────────────┤
│ ↺ 초기화           [ 완료 ]        │  TopArea y=47 h=58 (pl=10 pr=20)
│                                    │  transparent, white text
│                                    │
│                                    │
│       ┌─────────────┐              │
│       │  🔳 Room    │              │
│       │  Box        │              │  3D Canvas (#1B1B1B bg)
│       │  Isometric  │              │  OrthographicCamera
│       │  Cutaway 2  │              │  Room shadow @ y=344
│       └─────────────┘              │
│                                    │
│                                    │
├────────────────────────────────────┤
│    ▬▬ grabber (3px, 10%w) ▬▬      │  CatalogSheet y=675
├────────────────────────────────────┤
│ ✦ 🎨 🛋 🪑 🍽 🗄 ✧ 💡 📺 🛏 ▸     │  10 카테고리 (scrollable)
│ 신규 벽지바닥 소파 의자 테이블 ...     │  48×68 each, gap=5
└────────────────────────────────────┘
```

### 4.2 Editor > Store (카탈로그 펼침)

```
┌────────────────────────────────────┐
│ (배경 dimmed)                      │
├────────────────────────────────────┤
│ 🛁 🛋 🪑 🍽 🗄            ▸        │  CategoryTabs (active: 의자)
├────────────────────────────────────┤
│ [전체 ⬛] [뫄뫄의자] [책상] [거실테이블]│  SelectChips (h=32, gap=4)
├────────────────────────────────────┤
│ 상품 9,999      컬러 ▾   최신순 ▾  │  FilterBar h=44
├────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐               │
│ │ 🪑 │ │ 🪑 │ │ 🪑 │               │  ProductCard 111w
│ └────┘ └────┘ └────┘               │  gap: 8×17
│ 영가구  의자왕  끌레오                │
│ 🪙24,500 🪙29,900 🪙14,800          │
│                                    │
│ ... (3col grid, v scroll)          │
└────────────────────────────────────┘
```

### 4.3 Placement Mode (가구 선택 중)

```
┌────────────────────────────────────┐
│ ↺ 초기화           [ 완료 ]        │
│                                    │
│                                    │
│            ↕  ← HandlerButton      │  Up handle (264×188 bbox)
│          ┌─────┐                   │
│          │ 🪑  │ ← selected        │  (120×120 icon space)
│          └─────┘                   │
│       ↺    ↔    ↻                  │  Left / Move / Right handles
│                                    │
│                                    │
│    ╭──────────────────╮            │  ToastHint y=521
│    │ 누르고 밀어서      │            │  rounded-37, rgba(0,0,0,0.5)
│    │ 위치를 조정하세요   │            │  "위치를 조정하세요" #6391E6
│    ╰──────────────────╯            │
└────────────────────────────────────┘
```

### 4.4 Z-Layering (DOM + 3D)

```
z=60  │ ChatSheet (AI, v1.1)
z=50  │ Modal / AlertDialog
z=40  │ ToastHint
z=30  │ EditorTopBar (초기화/완료)
z=20  │ CatalogSheet
z=10  │ UI overlay (handlers, etc.)
z=5   │ Scene overlay (3D→2D screen proj helpers)
z=0   │ R3F Canvas (3D scene)
```

### 4.5 상태 전이

```
┌─────────────┐  drag grabber up   ┌───────────────┐
│ Editor Main │────────────────────▶│ Catalog Sheet │
│ (빈 방 or    │                    │ (상품 그리드)   │
│  배치 완료)  │◀────────────────── │                │
└─────┬───────┘  tap 상품 → 자동 닫힘└───────────────┘
      │ tap 배치된 가구
      ▼
┌─────────────┐
│ Placement   │  tap 완료 또는 빈 공간 tap
│ Mode        │──────────────────▶ Editor Main
│ (4 handler) │
└─────────────┘
```

## 5. 3D 씬 구성

### 5.1 카메라
```tsx
// scene/IsometricScene.tsx
<Canvas
  orthographic
  camera={{ position: [10, 10, 10], zoom: 45, near: 0.1, far: 100 }}
  gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
  dpr={[1, 1.5]}
  frameloop="demand"
>
  <CameraControls
    makeDefault
    minPolarAngle={Math.PI / 6}   // 30°
    maxPolarAngle={Math.PI / 3}   // 60°
    minZoom={25}
    maxZoom={80}
    draggingSmoothTime={0.1}
  />
  {/* ... */}
</Canvas>
```

### 5.2 룸 (벽 컷어웨이)
```tsx
// scene/Room.tsx
export function Room({ room, cameraAzimuth }: Props) {
  const backWalls = getVisibleBackWalls(cameraAzimuth)  // 2면
  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.widthM, room.depthM]} />
        <meshStandardMaterial map={floorTex} aoMap={floorAo} />
      </mesh>
      
      {/* 선택된 2면의 벽만 렌더 */}
      {backWalls.map(side => <Wall key={side} side={side} {...room} />)}
    </group>
  )
}
```

azimuth에 따라 "내가 바라보는 뒤쪽 2면"만 렌더하여 다이오라마 느낌.

### 5.3 가구
```tsx
// scene/Furniture.tsx
export function Furniture({ placement, catalog }: Props) {
  const item = useMemo(() => catalog.get(placement.catalogId), [placement.catalogId])
  const { scene } = useGLTF(item.glbUrl)    // Meshopt 디코더 자동
  const selected = useSelectionStore(s => s.id === placement.instanceId)
  
  return (
    <group 
      position={[placement.position.x, 0, placement.position.z]}
      rotation-y={placement.rotationY}
    >
      <primitive object={scene} />
      {selected && <SelectionHighlight bbox={item.dimensionsM} />}
    </group>
  )
}
```

### 5.4 Asset Loader 설정
```tsx
// services/assetLoader.ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { useGLTF } from '@react-three/drei/core/useGLTF'

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('/basis/')
  .detectSupport(renderer)

useGLTF.preload('/assets/furniture/bed_double.glb')
// R3F의 useGLTF는 내부 GLTFLoader에 Meshopt/KTX2 주입 지원
```

## 6. 드래그 배치 알고리즘

```ts
// hooks/useDrag.ts
export function useDrag() {
  const { camera, raycaster, pointer, gl } = useThree()
  const floor = useFloorPlane()
  const selected = useSelectionStore(s => s.selected)
  const placements = usePlacementsStore(s => s.list)
  const catalog = useCatalog()
  const move = usePlacementsStore(s => s.move)

  const onPointerMove = (e: PointerEvent) => {
    if (!selected) return
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObject(floor)[0]
    if (!hit) return
    
    const proposed = { x: hit.point.x, z: hit.point.z }
    
    // 1. 벽 스냅 (10cm threshold → 5cm grid)
    const snapped = snapToWalls(proposed, selected, room, catalog)
    
    // 2. AABB 충돌 검사
    const others = placements.filter(p => p.instanceId !== selected.instanceId)
    if (aabbOverlap(selected, snapped, others, catalog)) {
      return  // reject, 위치 유지
    }
    
    move(selected.instanceId, snapped)
    invalidate()  // frameloop=demand에서 렌더 트리거
  }

  // ... touchstart/move/end 핸들러 연결
}
```

## 7. Zustand Store 스킴

```ts
// store/roomStore.ts
interface RoomState {
  room: Room
  setRoom(room: Room): void
  resizeRoom(dims: Partial<Room>): void
}

// store/placementsStore.ts
interface PlacementsState {
  list: PlacedFurniture[]
  add(catalogId: string, position: Vec2): string  // returns instanceId
  remove(instanceId: string): void
  move(instanceId: string, position: Vec2): void
  rotate(instanceId: string, deltaRad: number): void
  replaceAll(list: PlacedFurniture[]): void  // AI 배치 시
  applyDiffs(diffs: AIChatTurn['diffs']): void
  totalBudget(catalog: Map<string, FurnitureCatalogItem>): number
}

// store/selectionStore.ts
interface SelectionState {
  id: string | null
  select(id: string | null): void
}

// store/uiStore.ts
interface UIState {
  catalogOpen: boolean
  chatOpen: boolean
  styleTag: StyleTag
  budgetLimitKRW: number
  perfTier: 'full' | 'medium' | 'low'
}

// store/chatStore.ts
interface ChatState {
  turns: AIChatTurn[]
  streaming: boolean
  append(turn: AIChatTurn): void
  startStream(): void
  endStream(): void
}
```

## 8. AI Layout Service

```ts
// services/ai/client.ts
export async function* streamLayout(req: LayoutRequest): AsyncIterable<LayoutEvent> {
  const res = await fetch('/api/ai/layout', {
    method: 'POST', body: JSON.stringify(req),
    headers: { 'content-type': 'application/json' }
  })
  const reader = res.body!.getReader()
  const parser = new IncrementalJsonParser()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parser.push(new TextDecoder().decode(value))
    for (const closed of parser.drainClosedNodes()) {
      if (closed.path === 'narration') yield { type: 'narration', text: closed.value }
      if (closed.path.startsWith('placements.')) yield { type: 'placement', placement: closed.value }
      if (closed.path === 'totalBudget') yield { type: 'budget', value: closed.value }
    }
  }
  yield { type: 'done' }
}

// 사용
for await (const ev of streamLayout(req)) {
  switch (ev.type) {
    case 'narration': chatStore.append({ role: 'assistant', content: ev.text, timestamp: Date.now() }); break
    case 'placement': placementsStore.add(ev.placement); break  // fade-in in scene
    case 'budget': uiStore.setPendingBudget(ev.value); break
    case 'done': /* loading off */ break
  }
}
```

## 9. 성능 예산 (코드레벨)

```ts
// constants/perf.ts
export const PERF = {
  dprMobile: 1.5,
  dprMobilePostProcess: 1.0,
  maxDrawCalls: 100,
  maxTriangles: 200_000,
  maxTextureMB: 64,       // 가구 15개 × ~4MB
  initialLoadMsP95: 2500,
  fpsTarget: 60,
  fpsMinAccept: 45,
} as const
```

```tsx
// scene/IsometricScene.tsx
<PerformanceMonitor
  bounds={() => [PERF.fpsMinAccept, PERF.fpsTarget]}
  onChange={({ fps }) => analytics.fps(fps)}
  onIncline={() => uiStore.setTier('full')}
  onDecline={() => uiStore.setTier('medium')}
  onFallback={() => uiStore.setTier('low')}
>
  <Canvas ... />
</PerformanceMonitor>
```

## 10. 라우팅

간단한 SPA, 3화면:
```
/                 → <Onboarding>
/editor/:roomId   → <Editor>
/share/:roomId    → <Share> (읽기 전용 뷰 + OG 이미지)
```

React Router v7 또는 단순 `useState<Route>` + hash.

## 11. 테스트 전략

- **Vitest**: domain/ 전체 (collision, snap, constraints, koreanRules, layout)
- **Vitest + happy-dom**: store slices
- **Playwright**: 모바일 viewport (375×812) onboarding → 편집 → 저장 → share 플로우
- **3D 스냅샷 (선택)**: Puppeteer로 canvas toBlob 비교 (pixel tolerance)

## 12. 빌드 & 배포

- Vercel / Netlify 정적 호스팅 + edge function for AI proxy
- 또는 Cloudflare Pages + Workers (Bun Hono)
- CDN: 에셋은 R2/S3 + CF fronted
- Preview 환경: PR별 url

## 13. 분석 이벤트

```ts
// services/analytics.ts
track('onboarding_complete', { timeSec })
track('furniture_added', { catalogId, category })
track('furniture_removed', { catalogId })
track('ai_layout_requested', { budget, style })
track('ai_layout_completed', { itemsPlaced, latencyMs })
track('chat_refinement', { turn, itemsChanged })
track('share_opened', { roomId })
track('perf_tier_changed', { from, to, avgFps })
```

## 14. 로드맵 (4~8주 MVP)

| 주차 | 산출물 |
|-----|--------|
| 1 | Vite + R3F 스캐폴드, `src/constants/tokens.ts`, Figma 아이콘 export (SVG 재작성), 원자 컴포넌트 (Primary/GhostButton, CoinIcon) |
| 2 | WalletCard + EditorTopBar + ToastHint + 3D Canvas bg (Figma 정확 매칭), 에셋 파이프라인 (Meshopt+KTX2), 5개 가구 |
| 3 | IsometricScene + Room(벽 cutaway) + Furniture GLB + DragController + PlacementHandlers (4방향) |
| 4 | CatalogSheet (grabber + CategoryTabs + SelectChip + FilterBar + ProductCard 그리드) + 40개 가구 카탈로그 |
| 5 | AI layout v1 (Claude Sonnet 4.7 JSON schema) + streaming + 후처리 constraint solver |
| 6 | Chat refinement (Gemini Flash) + 스타일 preset + 코인 wallet 집계 + PWA |
| 7 | 성능 튜닝 (PerformanceMonitor 3-tier, dispose) + 애니메이션 (fade-in, 시트 스프링) + undo/redo |
| 8 | 실기기 QA (iPhone 12/14, Galaxy A54) + 분석 이벤트 + share link + OG 이미지 + 베타 배포 |

## 15. 확장 포인트 (v2+)

- 사진 1장 → 방 치수 (MoGe via Replicate server)
- 2D 평면도 PNG → 벽 추출 (RoomFormer + AI-Hub fine-tune)
- 조명 모드 토글 (주간/저녁/밤 — pre-baked 3개 lightmap 스왑)
- iOS RoomPlan 연동 (native app 딥링크)
- 크리에이터 공유 — 방 리믹스 기능
- 실상품 구매 API 연동

---

**링크**:
- 01-requirements.md — 요구사항
- 02-tech-stack.md — 기술 스택
- 03-assets.md — 에셋 전략
- 04-ai-strategy.md — LLM/AI 전략
- 06-competitors.md — 경쟁사 분석
- 07-performance.md — 성능 최적화
- 08-final-report.md — 이 문서 + 요약
