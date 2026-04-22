import { type ReactNode } from 'react'
import { color, viewport } from '@/constants'

interface Props {
  children: ReactNode
}

/**
 * Centers app in a 375x812 mobile frame on desktop.
 * On actual mobile viewport <= 812 wide, fills full viewport.
 */
export function PhoneFrame({ children }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: viewport.width,
          height: viewport.height,
          maxWidth: '100vw',
          maxHeight: '100vh',
          background: color.scene.bg,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          borderRadius: 'clamp(0px, calc((100vw - 375px) * 999), 44px)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
