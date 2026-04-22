# 10. 디자인 토큰 → 코드 스키마

> 출처: Figma Variables + 추출 계측 (docs/09-figma-ui-spec.md)
> 작성일: 2026-04-20

---

## 1. 파일 구조

```
src/
├── constants/
│   ├── tokens.ts        # 단일 소스 (타입 체크된 객체)
│   ├── tokens.css.ts    # CSS 변수 생성 (optional)
│   └── fonts.ts         # @font-face 선언
├── styles/
│   └── global.css       # :root 변수 + 초기화
└── types/
    └── tokens.d.ts      # 타입 외부 export
```

## 2. tokens.ts (완성)

```ts
// src/constants/tokens.ts

// ────────────────────────────────────────────────────────────
// COLORS
// ────────────────────────────────────────────────────────────

export const color = {
  brand: {
    primary: '#6391E6',           // PKTR Blue1 — CTA "완료", highlight
    accent:  '#5856DB',           // 방 꾸미기 pill (iOS system purple)
  },

  // 라이트 모드 그레이스케일 (1 진함 → 6 밝음)
  base: {
    1: '#2F3438',                  // primary text
    2: '#828C94',                  // secondary text
    3: '#C2C8CC',                  // tertiary / brand name
    4: '#EAEDEF',                  // dividers, grabber
    5: '#F7F9FA',                  // chip bg (inactive)
    6: '#FFFFFF',                  // sheet bg
  },

  // 3D 씬
  scene: {
    bg:          '#1B1B1B',        // editor canvas
    gridHint:    'rgba(255,255,255,0.05)',
    roomShadow:  'rgba(0,0,0,0.25)',
  },

  // 시트 / 모달
  sheet: {
    bg:      '#FFFFFF',
    grabber: '#EAEDEF',
  },

  // Chip
  chip: {
    activeBg:   '#2F3438',
    activeText: '#FFFFFF',
    idleBg:     '#F7F9FA',
    idleText:   '#2F3438',
  },

  // Wallet Card
  wallet: {
    cardBg:    '#1D1D1D',
    label:     'rgba(255,255,255,0.4)',
    value:     '#FFFFFF',
    ctaBg:     '#5856DB',
    ctaText:   '#FFFFFF',
  },

  // Toast
  toast: {
    bg:        'rgba(0,0,0,0.5)',
    text:      '#FFFFFF',
    highlight: '#6391E6',
  },

  // 상단 "초기화"
  topGhost: {
    bg:   'transparent',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },

  // 공통
  white: '#FFFFFF',
  black: '#000000',
} as const

// ────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ────────────────────────────────────────────────────────────

type TextStyle = {
  family: string
  weight: number
  size: number
  line: number
  ls: number   // letter-spacing in px
}

export const text = {
  // Pretendard (한국어)
  detail11_medium:    { family: 'Pretendard', weight: 500, size: 11, line: 14,   ls: -0.3 } as TextStyle,
  body13_medium:      { family: 'Pretendard', weight: 500, size: 13, line: 19.5, ls: -0.3 } as TextStyle,
  body14_medium:      { family: 'Pretendard', weight: 500, size: 14, line: 20,   ls: -0.3 } as TextStyle,
  body14_bold:        { family: 'Pretendard', weight: 700, size: 14, line: 18,   ls: -0.3 } as TextStyle,
  body15_bold:        { family: 'Pretendard', weight: 700, size: 15, line: 19.5, ls: -0.3 } as TextStyle,
  title20_bold:       { family: 'Pretendard', weight: 700, size: 20, line: 24,   ls: -0.4 } as TextStyle,

  // SF Pro Display (숫자/가격)
  sf_subtitle14_reg:  { family: 'SF Pro Display', weight: 400, size: 14, line: 18,   ls: -0.3 } as TextStyle,
  sf_brand10_bold:    { family: 'SF Pro Display', weight: 700, size: 10, line: 14,   ls: -0.5 } as TextStyle,
  sf_price12_bold:    { family: 'SF Pro Display', weight: 700, size: 12, line: 15.6, ls: -0.6 } as TextStyle,
} as const

// ────────────────────────────────────────────────────────────
// LAYOUT
// ────────────────────────────────────────────────────────────

export const space = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
  8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 17: 17,
  20: 20, 23: 23, 26: 26, 28: 28, 34: 34, 45: 45,
} as const

export const radius = {
  chip:        50,
  pill:        34,
  button:      38,
  card:        20,
  toast:       37,
  walletCard:  26,
  grabber:     41,
} as const

export const shadow = {
  walletCard: '15px 15px 30px 0px rgba(0,0,0,0.31)',
  sheet:      '0px -4px 24px rgba(0,0,0,0.08)',
  handler:    '0px 4px 12px rgba(0,0,0,0.15)',
} as const

// ────────────────────────────────────────────────────────────
// VIEWPORT
// ────────────────────────────────────────────────────────────

export const viewport = {
  width:  375,
  height: 812,
  statusBarHeight: 44.5,
  dpr: { min: 1, target: 1.5, max: 2 },
} as const

// ────────────────────────────────────────────────────────────
// MOTION
// ────────────────────────────────────────────────────────────

export const motion = {
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    spring:   'cubic-bezier(0.2, 0.8, 0.2, 1.05)',
  },
  duration: {
    instant: 80,
    fast:    160,
    base:    240,
    slow:    400,
    sheet:   320,
  },
} as const

// ────────────────────────────────────────────────────────────
// Z-INDEX
// ────────────────────────────────────────────────────────────

export const zIndex = {
  scene:       0,
  sceneOverlay: 5,  // handlers over 3D
  ui:          10,
  sheet:       20,
  walletCard:  25,
  topBar:      30,
  toast:       40,
  modal:       50,
  chat:        60,
} as const
```

## 3. Helper: text → CSS

```ts
// src/constants/tokens.ts (계속)

export function css(style: TextStyle): React.CSSProperties {
  return {
    fontFamily:    `"${style.family}", -apple-system, BlinkMacSystemFont, sans-serif`,
    fontWeight:    style.weight,
    fontSize:      `${style.size}px`,
    lineHeight:    `${style.line}px`,
    letterSpacing: `${style.ls}px`,
    fontStyle:     'normal',
  }
}
```

사용:
```tsx
<p style={css(text.body14_bold)}>완료</p>
```

## 4. 폰트 로드 (Pretendard)

```css
/* src/styles/global.css */

@font-face {
  font-family: 'Pretendard';
  font-weight: 500;
  font-style: normal;
  font-display: swap;
  src: url('/fonts/Pretendard-Medium.subset.woff2') format('woff2');
  unicode-range: U+0020-007E, U+3131-318E, U+AC00-D7A3;
}

@font-face {
  font-family: 'Pretendard';
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  src: url('/fonts/Pretendard-Bold.subset.woff2') format('woff2');
  unicode-range: U+0020-007E, U+3131-318E, U+AC00-D7A3;
}

/* SF Pro Display는 iOS 기본이라 fallback만 */
/* Fallback: system -apple-system 체인 */
```

서브셋 도구: [https://pretendard.netlify.app/](https://pretendard.netlify.app/) 공식에서 woff2 subset 다운로드.

## 5. CSS 변수 생성 (optional — tailwind 대안)

```ts
// src/constants/tokens.css.ts

import { color, radius, space } from './tokens'

export function toCssVars() {
  return {
    '--color-brand':       color.brand.primary,
    '--color-accent':      color.brand.accent,
    '--color-base-1':      color.base[1],
    '--color-base-2':      color.base[2],
    '--color-base-3':      color.base[3],
    '--color-base-4':      color.base[4],
    '--color-base-5':      color.base[5],
    '--color-base-6':      color.base[6],
    '--color-scene-bg':    color.scene.bg,
    '--radius-chip':       `${radius.chip}px`,
    '--radius-button':     `${radius.button}px`,
    '--radius-card':       `${radius.card}px`,
    '--space-2':           `${space[2]}px`,
    '--space-4':           `${space[4]}px`,
    '--space-8':           `${space[8]}px`,
    // ...
  } as React.CSSProperties
}
```

`src/main.tsx`:
```tsx
import { toCssVars } from './constants/tokens.css'
const root = createRoot(document.getElementById('root')!)
document.documentElement.style.cssText = Object.entries(toCssVars())
  .map(([k,v]) => `${k}:${v}`).join(';')
root.render(<App />)
```

## 6. 카테고리 & 카탈로그 상수

```ts
// src/constants/categories.ts

export const CATEGORIES = [
  { id: 'new',        label: '신규',       icon: 'category-new' },
  { id: 'wallfloor',  label: '벽지·바닥',  icon: 'category-wallfloor' },
  { id: 'sofa',       label: '소파',       icon: 'category-sofa' },
  { id: 'chair',      label: '의자',       icon: 'category-chair' },
  { id: 'table',      label: '테이블',     icon: 'category-table' },
  { id: 'storage',    label: '수납장',     icon: 'category-storage' },
  { id: 'decor',      label: '데코',       icon: 'category-decor' },
  { id: 'lighting',   label: '조명',       icon: 'category-lighting' },
  { id: 'appliance',  label: '전자제품',   icon: 'category-appliance' },
  { id: 'bed',        label: '침대',       icon: 'category-bed' },
] as const

export type CategoryId = typeof CATEGORIES[number]['id']
```

## 7. 가격 / 통화 (코인 기반)

Figma는 원화 대신 **코인 아이콘**을 쓰는 통화 시스템.

```ts
// src/domain/currency.ts

export function formatCoin(amount: number): string {
  return amount.toLocaleString('ko-KR')
}

// 매핑: CC0 카탈로그 아이템 → 코인 가격 (추정)
// 실제 오늘의집 상품 가격(원) ÷ 1000 ≈ 코인
// 예: 99000원 소파 → 99코인으로 사용 가능
```

초기 통장 잔액: **362,200 코인** (Figma 기본값).

## 8. Export Index

```ts
// src/constants/index.ts

export * from './tokens'
export * from './categories'
```

## 9. 타입 예시 (외부 참조용)

```ts
// src/types/tokens.d.ts

import type { color, text, radius } from '../constants/tokens'

export type Color   = typeof color
export type Text    = typeof text
export type Radius  = typeof radius
```

## 10. 유지 보수 규칙

1. **Figma 마스터가 단일 진실**: 토큰 변경 시 Figma Variables 먼저 → 코드로 동기화
2. **하드코드 컬러 금지**: 모든 컬러는 `tokens.color.*` 통해서만 접근
3. **폰트 크기 하드코드 금지**: `tokens.text.*` 스타일로만
4. **새 토큰 추가 시**: `09-figma-ui-spec.md` 레퍼런스도 같이 업데이트
5. **카테고리/카탈로그 ID는 불변**: 저장된 유저 방 데이터가 이 ID를 참조하므로 rename 금지
