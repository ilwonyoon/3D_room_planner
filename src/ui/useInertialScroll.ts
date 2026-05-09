import { useEffect, type RefObject } from 'react'

type ScrollPhysicsConfig = {
  friction: number
  maxVelocity: number
  minVelocity: number
  wheelGain: number
}

type InertialScrollOptions = Partial<ScrollPhysicsConfig> & {
  enabled?: boolean
}

const IOS_FEED_SCROLL_PHYSICS: ScrollPhysicsConfig = {
  friction: 0.92,
  maxVelocity: 34,
  minVelocity: 0.2,
  wheelGain: 0.18,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeWheelDelta(event: WheelEvent, container: HTMLElement) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * container.clientHeight
  }

  return event.deltaY
}

function shouldAllowNativeWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    return true
  }

  return Math.abs(event.deltaX) > Math.abs(event.deltaY)
}

export function useInertialScroll(
  scrollRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    friction = IOS_FEED_SCROLL_PHYSICS.friction,
    maxVelocity = IOS_FEED_SCROLL_PHYSICS.maxVelocity,
    minVelocity = IOS_FEED_SCROLL_PHYSICS.minVelocity,
    wheelGain = IOS_FEED_SCROLL_PHYSICS.wheelGain,
  }: InertialScrollOptions = {},
) {
  useEffect(() => {
    const container = scrollRef.current

    if (!enabled || !container) {
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let frameId = 0
    let lastFrameAt = 0
    let velocity = 0

    const stop = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }

      lastFrameAt = 0
      velocity = 0
    }

    const animate = (now: number) => {
      const delta = lastFrameAt === 0 ? 16.67 : Math.min(now - lastFrameAt, 40)
      lastFrameAt = now

      const maxScrollTop = container.scrollHeight - container.clientHeight
      const currentScrollTop = container.scrollTop
      const nextScrollTop = clamp(
        currentScrollTop + velocity * (delta / 16.67),
        0,
        maxScrollTop,
      )

      container.scrollTop = nextScrollTop

      const hitBoundary =
        (nextScrollTop <= 0 && velocity < 0) ||
        (nextScrollTop >= maxScrollTop && velocity > 0)

      if (hitBoundary) {
        stop()
        return
      }

      velocity *= Math.pow(friction, delta / 16.67)

      if (Math.abs(velocity) <= minVelocity) {
        stop()
        return
      }

      frameId = window.requestAnimationFrame(animate)
    }

    const start = () => {
      if (frameId !== 0) {
        return
      }

      frameId = window.requestAnimationFrame(animate)
    }

    const handleWheel = (event: WheelEvent) => {
      if (shouldAllowNativeWheel(event)) {
        return
      }

      const deltaY = normalizeWheelDelta(event, container)

      event.preventDefault()
      velocity = clamp(
        velocity + deltaY * wheelGain,
        -maxVelocity,
        maxVelocity,
      )

      start()
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('pointerdown', stop)

    return () => {
      stop()
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('pointerdown', stop)
    }
  }, [enabled, friction, maxVelocity, minVelocity, scrollRef, wheelGain])
}
