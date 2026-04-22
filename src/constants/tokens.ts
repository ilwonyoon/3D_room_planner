import type { CSSProperties } from 'react'

// ────────────────────────────────────────────────────────────
// COLORS (from Figma Pocketroom-Master variables)
// ────────────────────────────────────────────────────────────

export const color = {
  brand: {
    primary: '#6391E6',
    accent: '#5856DB',  // iOS system purple (reserved for future use)
  },

  // Grayscale (1 darkest → 6 lightest)
  base: {
    1: '#2F3438',
    2: '#828C94',
    3: '#C2C8CC',
    4: '#EAEDEF',
    5: '#F7F9FA',
    6: '#FFFFFF',
  },

  // 3D scene
  scene: {
    bg: '#1B1B1B',
    gridHint: 'rgba(255,255,255,0.05)',
    roomShadow: 'rgba(0,0,0,0.25)',
  },

  sheet: {
    bg: '#FFFFFF',
    grabber: '#EAEDEF',
  },

  chip: {
    activeBg: '#2F3438',
    activeText: '#FFFFFF',
    idleBg: '#F7F9FA',
    idleText: '#2F3438',
  },

  toast: {
    bg: 'rgba(0,0,0,0.5)',
    text: '#FFFFFF',
    highlight: '#6391E6',
  },

  topGhost: {
    bg: 'transparent',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },

  white: '#FFFFFF',
  black: '#000000',
} as const

// ────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ────────────────────────────────────────────────────────────

export type TextStyle = {
  family: string
  weight: number
  size: number
  line: number
  ls: number
}

export const text = {
  detail11_medium: { family: 'SF Pro Text', weight: 500, size: 11, line: 14, ls: 0 },
  detail12_medium: { family: 'SF Pro Text', weight: 500, size: 12, line: 16, ls: 0 },
  body13_medium:   { family: 'SF Pro Text', weight: 500, size: 13, line: 18, ls: 0 },
  body14_medium:   { family: 'SF Pro Text', weight: 500, size: 14, line: 18, ls: 0 },
  body14_bold:     { family: 'SF Pro Text', weight: 700, size: 14, line: 18, ls: 0 },
  body15_semibold: { family: 'SF Pro Text', weight: 600, size: 15, line: 20, ls: 0 },
  body15_bold:     { family: 'SF Pro Text', weight: 700, size: 15, line: 20, ls: 0 },
  title20_bold:    { family: 'SF Pro Display', weight: 700, size: 20, line: 24, ls: 0 },
  sf_subtitle14_reg: { family: 'SF Pro Text', weight: 400, size: 14, line: 18, ls: 0 },
  sf_brand11_semibold: { family: 'SF Pro Text', weight: 600, size: 11, line: 14, ls: 0 },
  sf_brand10_bold:   { family: 'SF Pro Text', weight: 600, size: 10, line: 14, ls: 0 },
  sf_price12_bold:   { family: 'SF Pro Display', weight: 700, size: 12, line: 16, ls: 0 },
} as const satisfies Record<string, TextStyle>

export function css(style: TextStyle): CSSProperties {
  return {
    fontFamily: `"${style.family}", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif`,
    fontWeight: style.weight,
    fontSize: `${style.size}px`,
    lineHeight: `${style.line}px`,
    letterSpacing: `${style.ls}px`,
    fontStyle: 'normal',
  }
}

// ────────────────────────────────────────────────────────────
// LAYOUT
// ────────────────────────────────────────────────────────────

export const space = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
  8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 17: 17,
  20: 20, 23: 23, 26: 26, 28: 28, 34: 34, 45: 45,
} as const

export const radius = {
  chip: 50,
  pill: 34,
  button: 38,
  card: 20,
  toast: 37,
  grabber: 41,
} as const

export const shadow = {
  sheet: '0px -4px 24px rgba(0,0,0,0.08)',
  handler: '0px 4px 12px rgba(0,0,0,0.15)',
} as const

// ────────────────────────────────────────────────────────────
// VIEWPORT
// ────────────────────────────────────────────────────────────

export const viewport = {
  width: 375,
  height: 812,
  statusBarHeight: 44.5,
  dpr: { min: 1, target: 1.5, max: 2 },
} as const

// ────────────────────────────────────────────────────────────
// MOTION
// ────────────────────────────────────────────────────────────

export const motion = {
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.2, 0.8, 0.2, 1.05)',
  },
  duration: {
    instant: 80,
    fast: 160,
    base: 240,
    slow: 400,
    sheet: 320,
  },
} as const

// ────────────────────────────────────────────────────────────
// Z-INDEX
// ────────────────────────────────────────────────────────────

export const zIndex = {
  scene: 0,
  sceneOverlay: 5,
  ui: 10,
  sheet: 20,
  topBar: 30,
  toast: 40,
  modal: 50,
  chat: 60,
} as const
