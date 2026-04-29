import { useCameraViewStore, useEditorObjectsStore, useUiStore } from '@/store'
import { css, text, zIndex } from '@/constants'
import type { CameraViewMode } from '@/store'

interface Props {
  onReset?: () => void
  onDone?: () => void
}

type NavIcon = {
  label: string
  src: string
  badge?: number
  slotWidth?: number
  slotHeight?: number
  viewportSize?: number
  glyphWidth: number
  glyphHeight: number
  glyphTop?: number
  glyphLeft?: number
  onClick?: () => void
}

export function EditorTopBar({ onReset: _onReset, onDone: _onDone }: Props) {
  const placedCount = useEditorObjectsStore((s) => s.objects.length)
  const setCatalog = useUiStore((s) => s.setCatalog)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const cycleCameraMode = useCameraViewStore((s) => s.cycleMode)

  const rightIcons: NavIcon[] = [
    {
      label: `View mode: ${cameraModeLabel(cameraMode)}`,
      src: '/icons/ui-nav-view.svg',
      glyphWidth: 18,
      glyphHeight: 18,
      glyphTop: 3,
      glyphLeft: 3,
      onClick: cycleCameraMode,
    },
    {
      label: 'Capture',
      src: '/icons/ui-nav-camera.svg',
      glyphWidth: 24,
      glyphHeight: 24,
    },
    {
      label: 'Product list',
      src: '/icons/ui-nav-products.svg',
      badge: placedCount,
      glyphWidth: 18,
      glyphHeight: 20,
      glyphTop: 2,
      glyphLeft: 3,
      onClick: () => setCatalog(true),
    },
    {
      label: 'Menu',
      src: '/icons/ui-nav-menu.svg',
      glyphWidth: 18.5,
      glyphHeight: 13.2,
      glyphTop: 5.4,
      glyphLeft: 2.75,
    },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 88,
        paddingTop: 44,
        paddingLeft: 16,
        paddingRight: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: zIndex.topBar,
        pointerEvents: 'none',
      }}
    >
      <NavIconButton
        label="Back"
        src="/icons/ui-nav-back.svg"
        slotWidth={24}
        slotHeight={44}
        viewportSize={24}
        glyphWidth={20.5}
        glyphHeight={18.8667}
        glyphTop={2.5667}
        glyphLeft={1.75}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pointerEvents: 'auto',
        }}
      >
        {rightIcons.map((icon) => (
          <NavIconButton key={icon.label} {...icon} />
        ))}
      </div>
    </div>
  )
}

function cameraModeLabel(mode: CameraViewMode) {
  if (mode === 'bird') {
    return 'Bird eye'
  }

  if (mode === 'pov') {
    return 'POV'
  }

  return 'Isometric'
}

function NavIconButton({
  label,
  src,
  badge,
  slotWidth = 44,
  slotHeight = 44,
  viewportSize = 24,
  glyphWidth,
  glyphHeight,
  glyphTop,
  glyphLeft,
  onClick,
}: NavIcon) {
  const resolvedGlyphTop = glyphTop ?? (viewportSize - glyphHeight) / 2
  const resolvedGlyphLeft = glyphLeft ?? (viewportSize - glyphWidth) / 2

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        position: 'relative',
        width: slotWidth,
        height: slotHeight,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'auto',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: viewportSize,
          height: viewportSize,
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: resolvedGlyphLeft,
            top: resolvedGlyphTop,
            width: glyphWidth,
            height: glyphHeight,
            display: 'block',
            objectFit: 'fill',
          }}
        />
      </span>
      {typeof badge === 'number' ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 1,
            left: 22,
            minWidth: 22,
            height: 16,
            padding: '0 4px',
            borderRadius: 8,
            background: '#FF7777',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...css(text.detail10_semibold),
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  )
}
