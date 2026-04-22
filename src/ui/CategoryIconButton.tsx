import { color, css, text } from '@/constants'

interface Props {
  label: string
  icon: string
  active?: boolean
  onClick?: () => void
}

export function CategoryIconButton({ label, icon, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48,
        height: 68,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flexShrink: 0,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: active ? 1 : 0.5,
        }}
      >
        <img src={icon} width={24} height={24} alt={label} style={{ objectFit: 'contain' }} />
      </span>
      <span
        style={{
          ...css(text.body14_medium),
          fontWeight: active ? 600 : 500,
          color: active ? color.base[1] : color.base[2],
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  )
}
