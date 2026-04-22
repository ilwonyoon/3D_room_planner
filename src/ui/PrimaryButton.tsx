import { type ReactNode } from 'react'
import { color, css, radius, text } from '@/constants'

interface Props {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function PrimaryButton({ children, onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 38,
        minWidth: 67,
        padding: '0 18px',
        background: color.brand.primary,
        color: color.white,
        borderRadius: radius.button,
        ...css(text.body14_bold),
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 160ms',
      }}
    >
      {children}
    </button>
  )
}
