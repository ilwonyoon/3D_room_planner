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
    bg: '#1B1B1D',
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

export const fontFamily = {
  display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  text: '"SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  pretendard: '"Pretendard", "SF Pro Text", -apple-system, sans-serif',
} as const

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

export const sizeToFamily = {
  32: 'display',
  24: 'display',
  20: 'display',
  18: 'text',
  17: 'text',
  16: 'text',
  15: 'text',
  14: 'text',
  13: 'text',
  12: 'text',
  11: 'text',
  10: 'text',
} as const

// Source: figma_to_prototype/packages/design-system/src/tokens/typography.ts.
// Negative SF Pro tracking from that system is normalized to 0 for this app's UI rules.
// Positive tracking values are kept so small-detail typography matches the shared prototype system.
export const tracking = {
  english: {
    32: 0,
    24: 0,
    20: 0,
    18: 0,
    17: 0,
    16: 0,
    15: 0,
    14: 0,
    13: 0.03,
    12: 0.12,
    11: 0.15,
    10: 0.12,
  },
} as const

export type TextStyle = {
  family: string
  weight: number
  size: number
  line: number
  ls: number
}

export const text = {
  heading32_bold: { family: 'SF Pro Display', weight: fontWeight.bold, size: 32, line: 40, ls: tracking.english[32] },
  heading24_bold: { family: 'SF Pro Display', weight: fontWeight.bold, size: 24, line: 30, ls: tracking.english[24] },
  heading20_bold: { family: 'SF Pro Display', weight: fontWeight.bold, size: 20, line: 25, ls: tracking.english[20] },
  heading18_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 18, line: 23, ls: tracking.english[18] },
  heading17_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 17, line: 22, ls: tracking.english[17] },
  body16_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 16, line: 21, ls: tracking.english[16] },
  body16_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 16, line: 21, ls: tracking.english[16] },
  body16_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 16, line: 21, ls: tracking.english[16] },
  body16_relaxed_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 16, line: 24, ls: tracking.english[16] },
  body15_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 15, line: 20, ls: tracking.english[15] },
  body15_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 15, line: 20, ls: tracking.english[15] },
  body15_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 15, line: 20, ls: tracking.english[15] },
  body15_bold: { family: 'SF Pro Text', weight: fontWeight.bold, size: 15, line: 20, ls: tracking.english[15] },
  body15_relaxed_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 15, line: 24, ls: tracking.english[15] },
  body15_relaxed_bold: { family: 'SF Pro Text', weight: fontWeight.bold, size: 15, line: 24, ls: tracking.english[15] },
  body14_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 14, line: 19, ls: tracking.english[14] },
  body14_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 14, line: 19, ls: tracking.english[14] },
  body14_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 14, line: 19, ls: tracking.english[14] },
  body14_bold: { family: 'SF Pro Text', weight: fontWeight.bold, size: 14, line: 19, ls: tracking.english[14] },
  body14_tight_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 14, line: 18, ls: tracking.english[14] },
  body14_tight_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 14, line: 18, ls: tracking.english[14] },
  body14_tight_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 14, line: 18, ls: tracking.english[14] },
  body13_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 13, line: 18, ls: tracking.english[13] },
  body13_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 13, line: 18, ls: tracking.english[13] },
  body13_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 13, line: 18, ls: tracking.english[13] },
  detail13_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 13, line: 18, ls: tracking.english[13] },
  detail12_regular: { family: 'SF Pro Text', weight: fontWeight.regular, size: 12, line: 16, ls: tracking.english[12] },
  detail12_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 12, line: 16, ls: tracking.english[12] },
  detail12_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 12, line: 16, ls: tracking.english[12] },
  detail11_medium: { family: 'SF Pro Text', weight: fontWeight.medium, size: 11, line: 13, ls: tracking.english[11] },
  detail11_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 11, line: 13, ls: tracking.english[11] },
  detail10_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 10, line: 12, ls: tracking.english[10] },
  title20_bold: { family: 'SF Pro Display', weight: fontWeight.bold, size: 20, line: 25, ls: tracking.english[20] },
  sf_subtitle14_reg: { family: 'SF Pro Text', weight: fontWeight.regular, size: 14, line: 18, ls: tracking.english[14] },
  sf_brand11_semibold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 11, line: 13, ls: tracking.english[11] },
  sf_brand10_bold: { family: 'SF Pro Text', weight: fontWeight.semibold, size: 10, line: 12, ls: tracking.english[10] },
  sf_price12_bold: { family: 'SF Pro Text', weight: fontWeight.bold, size: 12, line: 16, ls: tracking.english[12] },
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
