import { type ReactNode } from 'react'
import { color, css, radius, text } from '@/constants'

interface Props {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
}

export function GhostButton({ children, icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 38,
        padding: '0 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        color: color.white,
        borderRadius: radius.button,
        ...css(text.body14_medium),
      }}
    >
      {icon}
      {children}
    </button>
  )
}
