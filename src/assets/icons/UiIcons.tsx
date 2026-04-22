import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export const ResetIcon = (p: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 10a6 6 0 1 0 1.8-4.3" />
    <path d="M4 3v3.5H7.5" />
  </svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m3 4.5 3 3 3-3" />
  </svg>
)

export const BackArrowIcon = (p: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 2 3 7l5 5" />
    <path d="M3 7h9" />
  </svg>
)

// Placement handlers
export const UpDownArrowIcon = (p: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 3v12" />
    <path d="m5 6 4-3 4 3" />
    <path d="m5 12 4 3 4-3" />
  </svg>
)

export const RotateCcwIcon = (p: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 9a6 6 0 1 0 1.5-4" />
    <path d="M3 3v3h3" />
  </svg>
)

export const RotateCwIcon = (p: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 9a6 6 0 1 1-1.5-4" />
    <path d="M15 3v3h-3" />
  </svg>
)

export const MoveIcon = (p: IconProps) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 2v14" />
    <path d="M2 9h14" />
    <path d="m6 5 3-3 3 3" />
    <path d="m6 13 3 3 3-3" />
    <path d="m5 6-3 3 3 3" />
    <path d="m13 6 3 3-3 3" />
  </svg>
)
