# 09. Figma UI 스펙 — Pocketroom Master

> 출처: [Figma Pocketroom-Master, node 30318:62730](https://www.figma.com/design/MgpVnCwrW4Lh0LgrAK14Uj/Pocketroom-Master?node-id=30318-62730)
> 추출일: 2026-04-20
> 뷰포트: 375×812 (iPhone X~14)

---

## 1. 프레임 개요

마스터 프레임 **Frame 628586 (30318:62730)** 에 4개 상태 화면이 나란히 정렬되어 있음:

| 프레임 | Node ID | 상태 | 설명 |
|--------|---------|-----|------|
| Editor Main | 30318:60239 | 기본 편집기 | 빈 방 + 하단 카테고리 시트 |
| Editor > Store | 30318:60813 | 카탈로그 펼침 | 의자 탭, 9,999개 상품 그리드 |
| Editor placement | 30318:61427 | 배치 중 | 가구 선택 + 4방향 핸들 + 토스트 |
| Editor Main (chair placed) | 30318:61564 | 배치 완료 | 의자 배치됨 + 카테고리 시트 |

## 2. 디자인 토큰 (Figma Variables에서 추출)

### 2.1 컬러
```ts
// src/constants/tokens.ts

export const color = {
  // PKTR 브랜드 (Pocketroom)
  brand: {
    primary: '#6391E6',    // PKTR Blue1 — CTA "완료", 강조 텍스트
    accent:  '#5856DB',    // "방 꾸미기" 버튼 (iOS System Purple)
  },
  
  // 라이트 모드 텍스트 그레이스케일 (1 = 가장 진한)
  base: {
    1: '#2F3438',          // primary text (카테고리 레이블, 상품명)
    2: '#828C94',          // secondary (상품 9,999, 카운트)
    3: '#C2C8CC',          // tertiary (브랜드명 "영가구", "vitra")
    4: '#EAEDEF',          // grabber, 구분선
    5: '#F7F9FA',          // select chip 배경
    6: '#FFFFFF',          // 시트 배경
  },
  
  // 3D 씬 배경 (에디터 다크 캔버스)
  scene: {
    bg:       '#1B1B1B',   // Editor base 배경
    gridHint: 'rgba(255,255,255,0.05)',  // 바닥 그리드
  },
  
  // 시트/인터랙션
  sheet: {
    bg:           '#FFFFFF',
    grabber:      '#EAEDEF',
    shadow:       'rgba(0,0,0,0.31)',     // 15px 15px 30px
  },
  
  chipActive: '#2F3438',                   // 선택된 select chip (dark pill)
  chipActiveText: '#FFFFFF',
  
  // 토스트 / 오버레이
  toast: {
    bg:   'rgba(0,0,0,0.5)',
    text: '#FFFFFF',
    highlight: '#6391E6',
  },
  
  // 인테리어 통장 ("코인") 표기
  wallet: {
    label: 'rgba(255,255,255,0.4)',
    value: '#FFFFFF',
  },
  
  // 상단 버튼 (초기화)
  topButton: {
    bg:   'transparent',
    text: '#FFFFFF',
  },
} as const
```

### 2.2 타이포그래피
```ts
export const typography = {
  // Korean 기본 서체
  pretendard: {
    detail11_medium:      { family: 'Pretendard', weight: 500, size: 11, line: 14, ls: -0.3 },  // 썸네일 하단 미니 라벨
    body14_medium:        { family: 'Pretendard', weight: 500, size: 14, line: 20, ls: -0.3 },  // "초기화", 카테고리 이름
    body14_bold:          { family: 'Pretendard', weight: 700, size: 14, line: 18, ls: -0.3 },  // "완료" 버튼
    body13_medium:        { family: 'Pretendard', weight: 500, size: 13, line: 19.5, ls: -0.3 }, // 통장 레이블
    body15_bold:          { family: 'Pretendard', weight: 700, size: 15, line: 19.5, ls: -0.3 }, // "방 꾸미기" 버튼
    body20_bold:          { family: 'Pretendard', weight: 700, size: 20, line: 24, ls: -0.4 },   // 통장 금액 "362,200"
  },
  // 숫자/가격 전용
  sfpro: {
    subtitle14_regular:   { family: 'SF Pro Display', weight: 400, size: 14, line: 18, ls: -0.3 }, // chip 텍스트
    price12_bold:         { family: 'SF Pro Display', weight: 700, size: 12, line: 15.6, ls: -0.6 }, // 가격 "24,500"
    brand10_bold:         { family: 'SF Pro Display', weight: 700, size: 10, line: 14, ls: -0.5 },   // 브랜드명
  },
} as const
```

### 2.3 스페이싱 & 반경
```ts
export const space = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 17: 17, 20: 20, 23: 23, 26: 26, 28: 28, 34: 34, 45: 45 } as const

export const radius = {
  chip: 50,              // SelectChips
  pill: 34,              // "방 꾸미기" button
  button: 38,            // Rounded button (초기화/완료)
  card: 20,              // 시트 상단 (rounded-tl/tr)
  toast: 37,             // 토스트 pill
  walletCard: 26,        // 통장 카드 (100h × 333w)
  grabber: 41,           // grabber pill 3px
} as const

export const shadow = {
  walletCard: '15px 15px 30px 0px rgba(0,0,0,0.31)',
} as const
```

## 3. 화면별 구조

### 3.1 Editor Main (30318:60239) — 기본 상태

```
┌─────────────────────────────────────┐
│ ░░░░░░░ Status bar (44.5px) ░░░░░░ │  mix-blend-screen
├─────────────────────────────────────┤
│                                     │
│ ↺ 초기화              [ 완료 ]     │  topArea (y=47, h=58, pl=10 pr=20)
│                                     │
│                                     │
│                                     │
│                                     │
│         🔳 Box Room (isometric)    │
│         Mask group y=-114           │
│         Room shadow y=344           │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  ▬▬ grabber (3px, 10.13%w) ▬▬      │  store sheet (y=675)
├─────────────────────────────────────┤
│ [✦]  [🛁]  [🛋]  [🪑]  [🍽] [🗄] [✧] [💡] [📺] [🛏]│
│ 신규  벽지바닥 소파  의자  테이블 수납장 데코 조명 전자 침대│
│                                     │
├─────────────────────────────────────┤
│ 내 인테리어 통장  🪙 362,200  [방 꾸미기 ▶]  │  wallet card (333×100, y=815)
│                                     │
└─────────────────────────────────────┘
```

**레이아웃 수치** (data-node-id 추출):
- 상단 Top Area: y=47, h=58 (status 44.5px 뒤 2.5px gap)
  - "초기화" 버튼: 좌측, h=38, rounded-[38px], transparent bg, icon 20×20 + text 14px
  - "완료" 버튼: 우측 20px padding, 67×38, bg #6391E6, rounded-[38px], Pretendard Bold 14
- 방 박스룸: "Mask group" + "image 1" 오버레이 — 실제 3D Canvas가 여기 올 자리
  - Room shadow: y=344, 285×124, 그라데이션 블러 (가구 contact shadow 대체)
- Store Sheet: y=675, w=375, grabber 23px 상단에 3px pill
  - 카테고리 탭: px=20, gap=5, 각 버튼 48×68 (icon 32×32 + 14px label, gap=4)
  - 우측 그라데이션 fade (56×67): `linear-gradient(-89.99deg, white 22.5%, transparent 100%)` — 스크롤 힌트
- Wallet card: w=333, h=100, rounded-[26], shadow-[15px_15px_30px_rgba(0,0,0,0.31)], bg #1D1D1D
  - 통장 레이블 13px Medium, 40% white; 금액 20px Bold white
  - 방 꾸미기 btn: w=auto, h=~40, bg #5856DB, rounded-[34], Pretendard Bold 15 white + 5×10 vector arrow

**카테고리 10개** (순서 고정):
1. 신규 (imgGroup3024)
2. 벽지·바닥 (imgGroup3026)
3. 소파 (imgGroup3030)
4. 의자 (imgGroup3021)
5. 테이블 (imgGroup3028)
6. 수납장 (imgGroup2983)
7. 데코 (imgGroup3023)
8. 조명 (imgGroup2984)
9. 전자제품 (imgGroup2988)
10. 침대 (imgGroup3031)

### 3.2 Editor > Store (30318:60813) — 카탈로그 펼침

Editor Main 위로 시트가 끝까지 드래그되어 상품 그리드 노출.

```
┌─────────────────────────────────────┐
│ Status bar (light mode, #FFFFFF bg)│
├─────────────────────────────────────┤
│ 🏠 ⌂           🔍      📖    👤     │  top bar (일반 오늘의집 nav)
├─────────────────────────────────────┤
│ [🛁][🛋][🪑⬛][🍽][🗄]          ▸   │  category tabs (scrollable)
│ 침대 소파 의자 테이블 수납장          │  선택된 탭은 icon 진하고 하단 dot
├─────────────────────────────────────┤
│ [전체 ⬛] [뫄뫄의자] [책상] [거실테이블] [협탁] [콘솔] │  chips
├─────────────────────────────────────┤
│ 상품 9,999          컬러 ▾  최신순 ▾ │  subtitle (h=44)
├─────────────────────────────────────┤
│ ┌───────┐  ┌───────┐  ┌───────┐    │
│ │ 🪑    │  │ 🪑    │  │ 🪑    │    │  grid 3col, gap=8×17
│ │       │  │       │  │       │    │  card: w=111, h=~158
│ └───────┘  └───────┘  └───────┘    │  thumb: 120×120 mask → 111×111
│ 영가구     의자왕     끌레오          │  brand: SF Pro Bold 10, #C2C8CC
│ 🪙 24,500  🪙 29,900  🪙 14,800    │  price: SF Pro Bold 12, #2F3438
│                                     │
│ ... (17px 수직 gap)                │
└─────────────────────────────────────┘
```

**카드 스펙**:
- 컨테이너: `w-[111px] flex flex-col gap-[4]`
- 썸네일 마스크: 5×5 offset, chair img 120×120에 111×111 마스크
- 메타: gap-[2] (brand), gap-[3] (price row)
- 코인 icon: 16×16 PNG
- 가격 포맷: 로케일 숫자 + 콤마, 원 기호 대신 **코인 이미지**

**필터/정렬 UI**:
- "컬러" / "최신순" 드롭다운: gap-5, 14px medium text + 12×12 chevron_down icon
- chip "전체" 선택 시 bg #2F3438 white; 미선택 bg #F7F9FA dark

### 3.3 Editor placement (30318:61427) — 배치 중

가구가 방에 놓이고 회전/이동/상하 핸들이 표시됨.

```
┌─────────────────────────────────────┐
│ ↺ 초기화              [ 완료 ]     │
│                                     │
│                                     │
│         🔳                          │
│            ↕  ← top handler (264*188 bbox)│
│         🪑                          │
│                                     │
│       ↺  ↔  ↻                       │  4-way handlers
│                                     │
│                                     │
│                                     │
│     ╔═════════════════════╗         │
│     ║ 누르고 밀어서         ║        │  toast y=521
│     ║ 위치를 조정하세요     ║        │  rounded-[37], bg rgba(0,0,0,0.5)
│     ╚═════════════════════╝         │  14px Pretendard Medium
└─────────────────────────────────────┘     "위치를 조정하세요" 부분만 #6391E6
```

**Handlers 컴포넌트** (1703:328520, w=188, h=264):
- **위 (↕)**: inset-[78.79%_35.11%_0_35.11%] — 상하 이동 (Y축 회전 or lift)
- **좌 (↺)**: inset-[68.18%_70.21%_10.61%_0] — 반시계 회전
- **우 (↻)**: inset-[68.18%_0_10.61%_70.21%] — 시계 회전
- **아래 (↔)**: inset-[0_35.11%_78.79%_35.11%] — XZ 평면 이동 (드래그)

각 handler = 둥근 흰 원 (img: handler) + 중앙 아이콘 (20×20 hit zone, icon ~18×18)

**토스트**:
- Position: `left-1/2 + 7px translateX(-50%), top=521`
- Padding: 14×8
- 텍스트: "누르고 밀어서" 흰색 + "위치를 조정하세요" PKTR Blue

### 3.4 Editor Main (30318:61564) — 배치 완료

Editor Main과 거의 동일하나 의자(chair img 120×120)가 방에 배치된 상태. **카테고리 시트는 다시 닫힌 상태로 표시**됨. → 배치 완료 시 시트 자동 minimize.

## 4. 상태 전이 다이어그램

```
 ┌─────────────┐  tap category      ┌───────────────┐
 │ Editor Main │─────────────────▶│ Editor > Store │
 │ (빈 방)      │                   │ (카탈로그)      │
 └─────────────┘                    └───────┬────────┘
       ▲                                     │
       │ 배치 완료 + 시트 닫힘                tap product
       │                                     ▼
       │                            ┌───────────────┐
       └────── 완료 버튼 ◀──────────│ Placement mode │
                                   │ (핸들 + 토스트)  │
                                   └───────────────┘
```

## 5. 기존 스펙과 Diff (docs/05-architecture.md 섹션 4 업데이트 필요)

| 기존 스펙 | Figma 실제 |
|---------|-----------|
| 상단 bar 56px "방 이름 + 저장" | **"초기화 / 완료"** 투명 상단, status bar 겹침 (44.5+2.5) |
| 하단 budget pill (44px) | ❌ 없음. 대신 **인테리어 통장 카드** (100px, 333×100 floating) |
| 카테고리 바 고정 하단 | ✅ 시트 grabber 하단, 가로 스크롤 (10 카테고리) |
| Catalog bottom sheet 400px | ✅ 풀 시트 (h=677px), grid 3col, chip scroll, subtitle |
| Selection gizmo: PivotControls | ❌ 4-way handler custom UI (상/좌/우/하, 분리된 흰 원) |
| BudgetPill "💰 276만/300만" | ❌ 대신 "내 인테리어 통장 🪙 362,200" + "방 꾸미기 →" |
| FAB "AI 배치" | ❓ 이 프레임에는 미노출 (별도 상태 필요) |
| Style picker | ❓ 이 프레임에는 미노출 |

→ **핵심 변경**: 본 프로토타입은 **통화 = 가상 코인 (포켓룸 머니)** 기반. 현금 가격이 아닌 "유저 인테리어 통장 362,200코인" 개념. AI 배치/스타일 피커는 별도 플로우로 추가해야 함.

## 6. 컴포넌트 매핑 (Figma → React)

| Figma 컴포넌트 | React 파일 | Props |
|---------------|-----------|-------|
| Editor base | `src/app/Editor.tsx` | - |
| topArea (2047:543116) | `src/ui/EditorTopBar.tsx` | `onReset`, `onDone` |
| Store Sheet (1687:284180) | `src/ui/CatalogSheet.tsx` | `expanded: boolean`, `category`, `onSelectCategory` |
| Category Tap (1687:283689) | `src/ui/CategoryTabs.tsx` | `categories[]`, `active`, `onChange` |
| icon button (category) | `src/ui/CategoryIconButton.tsx` | `icon`, `label`, `active` |
| SelectChips | `src/ui/SelectChip.tsx` | `label`, `active`, `onClick` |
| Subtitle (filter) | `src/ui/CatalogFilterBar.tsx` | `totalCount`, `colorFilter`, `sortBy` |
| item module (617:49667) | `src/ui/ProductCard.tsx` | `item: CatalogItem` |
| ChairImg mask | `src/ui/ProductThumb.tsx` | `src` |
| Handlers (1703:328520) | `src/scene/PlacementHandlers.tsx` | `target: PlacedFurniture`, `onMove/onRotate/onLift` |
| Handler (single) | `src/scene/HandlerButton.tsx` | `icon`, `onPointerDown` |
| Placement toast (30318:61429) | `src/ui/ToastHint.tsx` | `prefix`, `highlight` |
| Rounded button (초기화) | `src/ui/GhostButton.tsx` | `icon`, `children` |
| Rounded button (완료) | `src/ui/PrimaryButton.tsx` | `children` |

## 7. 3D 씬 통합 (Figma 레이아웃 + Three.js)

- 배경 `#1B1B1B` Canvas는 **전체 뷰포트 full-bleed**.
- UI는 `position: fixed` DOM 오버레이 (React, Figma 레이어 그대로).
- Canvas z-index 0, DOM UI z-index 10+.
- 방 박스룸은 **카메라가 이미 isometric 45°/30°** 로 고정되어, 벽 2면 cutaway로 배치.
- 방 shadow (imgRoomShadow)는 Three.js `ContactShadows`가 생성하므로 Figma의 shadow 이미지는 참조용.
- 상태 바(imgStatus)는 iOS safe area 자동. `env(safe-area-inset-top)` 처리.

## 8. 에셋 다운로드 (7일 캐시, Figma CDN)

주요 UI 아이콘은 코드화하거나 inline SVG로 리빌드 권장 (20+ GLB asset URL 있음). 당장 필요 목록:
- **카테고리 아이콘 10개** (`imgGroup2983~3031`) — 1-2일 내 SVG 재제작 또는 재생 다운로드
- **코인 아이콘** (imgImage60) — 재사용 많음, WebP 저장
- **Status bar** (imgStatus) — iOS 시스템 UI 대체 (Safari 자동)
- **Room shadow** (imgRoomShadow) — Three.js ContactShadows로 대체
- **Mask group** (imgMaskGroup) — 룸 박스 베이스, 3D로 대체
- **Image 1** (imgImage1) — 바닥 그리드 텍스처, 3D 바닥 material로 대체

**바로 export해서 src/assets/icons/로 저장할 것**:
- 10개 카테고리 아이콘 → `src/assets/icons/category-*.svg` (gtf-transform CLI의 figma export 또는 inline SVG)
- 코인 → `src/assets/icons/coin.svg`
- 4방향 handler icon → `src/assets/icons/handler-{up,left,right,move}.svg`
- chevron_down_12 → 자체 SVG

## 9. 반응형/접근성

- 디자인은 375px 고정. 더 큰 뷰포트는 **중앙 정렬 + 좌우 레터박스**.
- 다크모드: 에디터는 이미 dark (씬 #1B1B1B). 시트는 라이트. 시스템 다크모드 연동 시 시트만 다크 variant 필요 (v2).
- VoiceOver: 각 카테고리 버튼 label (한국어) 그대로 사용. handlers는 aria-label "위로 이동", "왼쪽 회전" 등 명시.

## 10. 미확보 화면 (추가 Figma 노드 필요)

현 프레임에 **없는** 우리 아키텍처 기능 (추가 탐색 필요):
- Onboarding 플로우 (방 크기 입력 화면)
- AI 배치 요청 UI (chat sheet, style picker)
- 예산 설정 UI
- Share/OG 공유 화면
- Settings / 프로필

다음 대화에서 다른 프레임 링크 주시거나 피그마 파일 상위 탐색 (`get_metadata` on page root) 필요.

---

## 다음 단계

1. ✅ 디자인 토큰 → `src/constants/tokens.ts` 변환
2. ✅ `docs/05-architecture.md` 섹션 4 레이아웃 재작성 (이 스펙 기준)
3. ⏭ Week 1 스캐폴딩 시 UI 컴포넌트 11개 생성 순서:
   - `PrimaryButton` / `GhostButton` (원자)
   - `CoinIcon` + `WalletCard`
   - `CategoryIconButton` + `CategoryTabs`
   - `SelectChip` + `CatalogFilterBar`
   - `ProductCard` + `CatalogSheet`
   - `EditorTopBar`
   - `ToastHint`
   - `HandlerButton` + `PlacementHandlers`
4. 🎯 3D 씬 ↔ UI 연결 레이어 (Canvas + DOM 오버레이)
