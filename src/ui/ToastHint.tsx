import { color, css, radius, text, zIndex } from '@/constants'

interface Props {
  prefix: string
  highlight: string
  visible?: boolean
  /** distance from top in px (default 521 from Figma) */
  top?: number
}

export function ToastHint({ prefix, highlight, visible = true, top = 521 }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top,
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        background: color.toast.bg,
        borderRadius: radius.toast,
        color: color.toast.text,
        whiteSpace: 'nowrap',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 240ms',
        zIndex: zIndex.toast,
        ...css(text.body14_medium),
      }}
    >
      <span>{prefix}</span>
      <span style={{ color: color.toast.highlight }}>{highlight}</span>
    </div>
  )
}
