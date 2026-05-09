import { useEffect, useRef } from 'react'

type LiquidGlassCursorProps = {
  active?: boolean
}

export function LiquidGlassCursor({ active = true }: LiquidGlassCursorProps) {
  const cursorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!active || !window.matchMedia('(pointer: fine)').matches) {
      return
    }

    const cursor = cursorRef.current

    if (!cursor) {
      return
    }

    let pointerX = 0
    let pointerY = 0
    let rafId = 0

    const renderCursor = () => {
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`
      rafId = 0
    }

    const scheduleRender = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(renderCursor)
      }
    }

    const hideCursor = () => {
      cursor.classList.remove('liquid-glass-cursor--visible', 'liquid-glass-cursor--pressed')
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        hideCursor()
        return
      }

      pointerX = event.clientX
      pointerY = event.clientY
      cursor.classList.add('liquid-glass-cursor--visible')
      scheduleRender()
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        cursor.classList.add('liquid-glass-cursor--pressed')
      }
    }

    const handlePointerUp = () => {
      cursor.classList.remove('liquid-glass-cursor--pressed')
    }

    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', hideCursor, true)
    window.addEventListener('blur', hideCursor)
    document.addEventListener('mouseleave', hideCursor)

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId)
      }

      window.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', hideCursor, true)
      window.removeEventListener('blur', hideCursor)
      document.removeEventListener('mouseleave', hideCursor)
    }
  }, [active])

  if (!active) {
    return null
  }

  return <div ref={cursorRef} aria-hidden="true" className="liquid-glass-cursor" />
}
