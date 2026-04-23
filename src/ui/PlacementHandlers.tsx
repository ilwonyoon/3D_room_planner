import { useEffect, useRef } from 'react'
import type { CSSProperties, MouseEventHandler, PointerEventHandler } from 'react'
import { flushSync } from 'react-dom'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

import {
  canRotate,
  constrainFloorMove,
  type Footprint,
} from '@/domain/placementConstraints'
import {
  useEditorObjectsStore,
  useRoomStore,
  useSelectionStore,
  type EditorObject,
  type PlacementDragMode,
} from '@/store'
import { color, shadow, zIndex } from '@/constants'

type DragKind = PlacementDragMode

type DragState = {
  kind: DragKind
  pointerId: number
  startClientX: number
  startClientY: number
  startPosition: { x: number; z: number }
  startElevationM: number
  floorOffset?: { x: number; z: number }
  wallOffset?: { u: number; y: number }
  wallSide?: WallSide
  moved: boolean
}

type WallSide = 'back' | 'front' | 'left' | 'right'

type WallHit = {
  side: WallSide
  u: number
  y: number
}

type PlacementHandlersVariant = 'full' | 'pov-move'

const HANDLER_ICON = {
  lift: '/icons/handler-up-down-arrow.svg',
  rotateCcw: '/icons/handler-rotate-left.svg',
  rotateCw: '/icons/handler-rotate-right.svg',
  move: '/icons/handler-move-4way.svg',
  delete: '/icons/handler-delete.svg',
  edit: '/icons/handler-edit.svg',
} as const

function toFootprint(object: EditorObject): Footprint {
  return {
    id: object.id,
    position: object.position,
    rotationY: object.rotationY,
    size: { x: object.dimensionsM.x, z: object.dimensionsM.z },
  }
}

function isFloorObject(object: EditorObject) {
  return object.placement === 'floor'
}

function wallCoordinate(object: EditorObject, side: WallSide) {
  return side === 'back' || side === 'front' ? object.position.x : object.position.z
}

function wallSideForObject(object: EditorObject, room: { widthM: number; depthM: number }): WallSide {
  const distances: Array<{ side: WallSide; distance: number }> = [
    { side: 'back', distance: Math.abs(object.position.z + room.depthM / 2) },
    { side: 'front', distance: Math.abs(object.position.z - room.depthM / 2) },
    { side: 'left', distance: Math.abs(object.position.x + room.widthM / 2) },
    { side: 'right', distance: Math.abs(object.position.x - room.widthM / 2) },
  ]

  distances.sort((a, b) => a.distance - b.distance)
  return distances[0].side
}

function wallBoundsRotationY(side: WallSide) {
  return side === 'back'
    ? 0
    : side === 'front'
      ? Math.PI
      : side === 'left'
        ? Math.PI / 2
        : -Math.PI / 2
}

function wallModelRotationY(object: EditorObject, side: WallSide) {
  if (object.wallSurfacePlane === 'yz') {
    return side === 'back'
      ? Math.PI / 2
      : side === 'front'
        ? -Math.PI / 2
        : side === 'left'
          ? 0
          : Math.PI
  }

  return wallBoundsRotationY(side)
}

function HandlerButton({
  label,
  active,
  icon,
  iconViewportSize = 16,
  glyphWidth,
  glyphHeight,
  glyphTop,
  glyphLeft,
  size = 40,
  style,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  label: string
  active?: boolean
  icon: string
  iconViewportSize?: number
  glyphWidth: number
  glyphHeight: number
  glyphTop?: number
  glyphLeft?: number
  size?: number
  style: CSSProperties
  onClick?: () => void
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  onPointerMove?: PointerEventHandler<HTMLButtonElement>
  onPointerUp?: PointerEventHandler<HTMLButtonElement>
}) {
  const stopClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick?.()
  }

  const stopPointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (onPointerDown) {
      onPointerDown(event)
      return
    }

    event.preventDefault()
    event.stopPropagation()
  }

  const stopPointerMove: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (onPointerMove) {
      onPointerMove(event)
      return
    }

    event.preventDefault()
    event.stopPropagation()
  }

  const stopPointerUp: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (onPointerUp) {
      onPointerUp(event)
      return
    }

    event.preventDefault()
    event.stopPropagation()
  }

  const resolvedGlyphTop = glyphTop ?? (iconViewportSize - glyphHeight) / 2
  const resolvedGlyphLeft = glyphLeft ?? (iconViewportSize - glyphWidth) / 2

  return (
    <button
      aria-label={label}
      onClick={stopClick}
      onPointerDown={stopPointerDown}
      onPointerMove={stopPointerMove}
      onPointerUp={stopPointerUp}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: 999,
        background: active ? color.brand.primary : '#f6f6f6',
        color: active ? color.white : color.base[1],
        boxShadow: shadow.handler,
        display: 'grid',
        placeItems: 'center',
        touchAction: 'none',
        pointerEvents: 'auto',
        transition: 'background 120ms ease, color 120ms ease, transform 120ms ease',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: iconViewportSize,
          height: iconViewportSize,
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <img
          src={icon}
          alt=""
          style={{
            position: 'absolute',
            left: resolvedGlyphLeft,
            top: resolvedGlyphTop,
            width: glyphWidth,
            height: glyphHeight,
            display: 'block',
            objectFit: 'fill',
            filter: active ? 'brightness(0) invert(1)' : 'none',
          }}
        />
      </span>
    </button>
  )
}

export function PlacementHandlers({
  variant = 'full',
}: {
  variant?: PlacementHandlersVariant
}) {
  const { camera, gl, invalidate } = useThree()
  const room = useRoomStore((state) => state.room)
  const selectedId = useSelectionStore((state) => state.selectedId)
  const objects = useEditorObjectsStore((state) => state.objects)
  const setEditMode = useEditorObjectsStore((state) => state.setEditMode)
  const activeDragMode = useEditorObjectsStore((state) => state.activeDragMode)
  const setActiveDragMode = useEditorObjectsStore((state) => state.setActiveDragMode)
  const removeObject = useEditorObjectsStore((state) => state.removeObject)
  const updateObject = useEditorObjectsStore((state) => state.updateObject)
  const select = useSelectionStore((state) => state.select)
  const dragRef = useRef<DragState | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const pointerRef = useRef(new THREE.Vector2())
  const floorPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  const selected = objects.find((object) => object.id === selectedId)

  useEffect(() => {
    const finishDrag = () => {
      if (!dragRef.current && useEditorObjectsStore.getState().activeDragMode === null) {
        return
      }

      dragRef.current = null
      setActiveDragMode(null)
      setEditMode('idle')
      requestAnimationFrame(() => invalidate())
    }

    window.addEventListener('pointerup', finishDrag, true)
    window.addEventListener('pointercancel', finishDrag, true)
    window.addEventListener('blur', finishDrag)

    return () => {
      window.removeEventListener('pointerup', finishDrag, true)
      window.removeEventListener('pointercancel', finishDrag, true)
      window.removeEventListener('blur', finishDrag)
    }
  }, [invalidate, setActiveDragMode, setEditMode])

  useEffect(() => {
    if (selected) {
      return
    }

    dragRef.current = null
    setActiveDragMode(null)
    setEditMode('idle')
    requestAnimationFrame(() => invalidate())
  }, [invalidate, selected, setActiveDragMode, setEditMode])

  if (!selected) {
    return null
  }

  const others = objects
    .filter((object) => object.id !== selected.id && isFloorObject(object))
    .map(toFootprint)

  const moveSelected = (position: { x: number; z: number }) => {
    const constrained = constrainFloorMove({
      candidate: { ...toFootprint(selected), position },
      others,
      room,
      gridM: 0.01,
      avoidCollisions: false,
    })

    if (constrained) {
      updateObject(selected.id, { position: constrained })
      invalidate()
    }
  }

  const moveWallSelected = (hit: WallHit, elevationM: number) => {
    const wallDepth = selected.dimensionsM.z
    const halfWallWidth = selected.dimensionsM.x / 2
    const minU = hit.side === 'back' || hit.side === 'front'
      ? -room.widthM / 2 + halfWallWidth
      : -room.depthM / 2 + halfWallWidth
    const maxU = hit.side === 'back' || hit.side === 'front'
      ? room.widthM / 2 - halfWallWidth
      : room.depthM / 2 - halfWallWidth
    const u = Math.min(maxU, Math.max(minU, hit.u))
    const y = Math.min(
      Math.max(0.02, room.heightM - selected.dimensionsM.y),
      Math.max(0.02, Math.round(elevationM * 100) / 100),
    )
    const rotationY = wallModelRotationY(selected, hit.side)
    const boundsRotationY = wallBoundsRotationY(hit.side)

    const patch =
      hit.side === 'back'
        ? {
            position: { x: u, z: -room.depthM / 2 + wallDepth / 2 },
          }
        : hit.side === 'front'
          ? {
              position: { x: u, z: room.depthM / 2 - wallDepth / 2 },
            }
          : hit.side === 'left'
          ? {
              position: { x: -room.widthM / 2 + wallDepth / 2, z: u },
            }
          : {
              position: { x: room.widthM / 2 - wallDepth / 2, z: u },
            }

    updateObject(selected.id, { ...patch, elevationM: y, rotationY, boundsRotationY })
    invalidate()
  }

  const rotateSelected = (deltaRad: number) => {
    setActiveDragMode(null)
    setEditMode('idle')
    if (selected.placement === 'wall') {
      return
    }

    const rotationY = selected.rotationY + deltaRad
    const constrainedPosition = canRotate(
      { ...toFootprint(selected), rotationY },
      others,
      room,
    )

    if (constrainedPosition) {
      updateObject(selected.id, { rotationY, position: constrainedPosition })
      invalidate()
    }
  }

  const liftSelected = (elevationM: number) => {
    const maxElevation = selected.placement === 'wall'
      ? Math.max(0.02, room.heightM - selected.dimensionsM.y)
      : 1.2
    const next = Math.min(maxElevation, Math.max(0.02, Math.round(elevationM * 100) / 100))
    updateObject(selected.id, { elevationM: next })
    invalidate()
  }

  const deleteSelected = () => {
    removeObject(selected.id)
    select(null)
  }

  const floorPointFromClient = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    pointerRef.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycasterRef.current.setFromCamera(pointerRef.current, camera)

    const hit = new THREE.Vector3()
    const result = raycasterRef.current.ray.intersectPlane(floorPlaneRef.current, hit)
    return result ? { x: hit.x, z: hit.z } : null
  }

  const wallPointFromClient = (
    clientX: number,
    clientY: number,
    preferredSide?: WallSide,
  ): WallHit | null => {
    const rect = gl.domElement.getBoundingClientRect()
    pointerRef.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycasterRef.current.setFromCamera(pointerRef.current, camera)

    const halfW = room.widthM / 2
    const halfD = room.depthM / 2
    const candidates: Array<WallHit & { distance: number }> = []
    const planes: Array<{ side: WallSide; plane: THREE.Plane }> = [
      { side: 'back', plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), halfD) },
      { side: 'front', plane: new THREE.Plane(new THREE.Vector3(0, 0, -1), halfD) },
      { side: 'left', plane: new THREE.Plane(new THREE.Vector3(1, 0, 0), halfW) },
      { side: 'right', plane: new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfW) },
    ]

    planes.forEach(({ side, plane }) => {
      const hit = new THREE.Vector3()
      const result = raycasterRef.current.ray.intersectPlane(plane, hit)

      if (!result) {
        return
      }

      const preferred = side === preferredSide
      const withinY = hit.y >= 0 && hit.y <= room.heightM
      const withinU = side === 'back' || side === 'front'
        ? hit.x >= -halfW && hit.x <= halfW
        : hit.z >= -halfD && hit.z <= halfD

      if (!preferred && (!withinY || !withinU)) {
        return
      }

      if (side === 'back' || side === 'front') {
        candidates.push({ side, u: hit.x, y: hit.y, distance: raycasterRef.current.ray.origin.distanceTo(hit) })
      } else {
        candidates.push({ side, u: hit.z, y: hit.y, distance: raycasterRef.current.ray.origin.distanceTo(hit) })
      }
    })

    candidates.sort((a, b) => a.distance - b.distance)
    if (preferredSide) {
      const preferred = candidates.find((candidate) => candidate.side === preferredSide)
      if (preferred) {
        return preferred
      }
    }

    return candidates[0] ?? null
  }

  const beginDrag = (kind: DragKind, event: Parameters<PointerEventHandler<HTMLButtonElement>>[0]) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    flushSync(() => {
      setActiveDragMode(kind)
      setEditMode(kind)
    })
    const floorPoint = kind === 'move' && selected.placement === 'floor'
      ? floorPointFromClient(event.clientX, event.clientY)
      : null
    const selectedWallSide = selected.placement === 'wall'
      ? wallSideForObject(selected, room)
      : undefined
    const wallPoint = kind === 'move' && selected.placement === 'wall'
      ? wallPointFromClient(event.clientX, event.clientY, selectedWallSide)
      : null
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: { ...selected.position },
      startElevationM: selected.elevationM,
      floorOffset: floorPoint
        ? {
            x: selected.position.x - floorPoint.x,
            z: selected.position.z - floorPoint.z,
          }
        : undefined,
      wallOffset: wallPoint
        ? {
            u: wallCoordinate(selected, selectedWallSide ?? wallPoint.side) - wallPoint.u,
            y: selected.elevationM - wallPoint.y,
          }
        : undefined,
      wallSide: selectedWallSide,
      moved: false,
    }
  }

  const drag: PointerEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    event.stopPropagation()

    const state = dragRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    const dx = event.clientX - state.startClientX
    const dy = event.clientY - state.startClientY
    state.moved = state.moved || Math.hypot(dx, dy) > 4

    if (state.kind === 'move') {
      if (selected.placement === 'wall') {
        const wallPoint = wallPointFromClient(event.clientX, event.clientY, state.wallSide)
        if (wallPoint && state.wallOffset) {
          state.wallSide = wallPoint.side
          moveWallSelected(
            {
              ...wallPoint,
              u: wallPoint.u + state.wallOffset.u,
            },
            wallPoint.y + state.wallOffset.y,
          )
        }
        return
      }

      const floorPoint = floorPointFromClient(event.clientX, event.clientY)
      if (floorPoint && state.floorOffset) {
        moveSelected({
          x: floorPoint.x + state.floorOffset.x,
          z: floorPoint.z + state.floorOffset.z,
        })
      }
    } else {
      liftSelected(state.startElevationM - dy * 0.006)
    }
  }

  const endDrag = (event: Parameters<PointerEventHandler<HTMLButtonElement>>[0]) => {
    event.preventDefault()
    event.stopPropagation()

    const state = dragRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    flushSync(() => {
      setActiveDragMode(null)
    })
    setEditMode('idle')
    requestAnimationFrame(() => invalidate())
  }

  if (variant === 'pov-move') {
    return (
      <Html
        position={[
          selected.position.x,
          selected.elevationM + selected.dimensionsM.y * 0.62,
          selected.position.z,
        ]}
        center
        occlude={false}
        pointerEvents="none"
        zIndexRange={[zIndex.topBar - 1, zIndex.sheet + 1]}
      >
        <div
          aria-label="Selected furniture POV move control"
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            pointerEvents: 'none',
          }}
        >
          <HandlerButton
            label="Move selected object"
            active={activeDragMode === 'move'}
            icon={HANDLER_ICON.move}
            iconViewportSize={16}
            glyphWidth={13.65}
            glyphHeight={13.65}
            glyphTop={1.175}
            glyphLeft={1.175}
            size={38}
            style={{ left: 7, top: 7 }}
            onPointerDown={(event) => beginDrag('move', event)}
            onPointerMove={drag}
            onPointerUp={endDrag}
          />
        </div>
      </Html>
    )
  }

  return (
    <Html
      position={[
        selected.position.x,
        selected.elevationM + selected.dimensionsM.y * 0.55,
        selected.position.z,
      ]}
      center
      occlude={false}
      pointerEvents="none"
      zIndexRange={[zIndex.topBar - 1, zIndex.sheet + 1]}
    >
      <div
        aria-label="Selected furniture controls"
        style={{
          position: 'relative',
          width: 176,
          height: 264,
          pointerEvents: 'none',
        }}
      >
        <HandlerButton
          label="Delete"
          icon={HANDLER_ICON.delete}
          iconViewportSize={16}
          glyphWidth={16}
          glyphHeight={16}
          style={{ left: 6, top: 26 }}
          onClick={deleteSelected}
        />

        <HandlerButton
          label="Edit"
          icon={HANDLER_ICON.edit}
          iconViewportSize={16}
          glyphWidth={16}
          glyphHeight={16}
          style={{ right: 6, top: 26 }}
          onClick={() => undefined}
        />

        <HandlerButton
          label="Move up and down"
          active={activeDragMode === 'lift'}
          icon={HANDLER_ICON.lift}
          iconViewportSize={18}
          glyphWidth={6.75}
          glyphHeight={17.55}
          glyphTop={0.225}
          glyphLeft={5.625}
          size={52}
          style={{ left: 62, top: 0 }}
          onPointerDown={(event) => beginDrag('lift', event)}
          onPointerMove={drag}
          onPointerUp={endDrag}
        />

        <HandlerButton
          label="Rotate left 90 degrees"
          icon={HANDLER_ICON.rotateCcw}
          iconViewportSize={16}
          glyphWidth={13.2}
          glyphHeight={14.8}
          glyphTop={0.6}
          glyphLeft={1.4}
          style={{ left: 6, bottom: 32 }}
          onClick={() => rotateSelected(-Math.PI / 2)}
        />

        <HandlerButton
          label="Rotate right 90 degrees"
          icon={HANDLER_ICON.rotateCw}
          iconViewportSize={16}
          glyphWidth={13.2}
          glyphHeight={14.8}
          glyphTop={0.6}
          glyphLeft={1.4}
          style={{ right: 6, bottom: 32 }}
          onClick={() => rotateSelected(Math.PI / 2)}
        />

        <HandlerButton
          label="Move on floor"
          active={activeDragMode === 'move'}
          icon={HANDLER_ICON.move}
          iconViewportSize={18}
          glyphWidth={17.55}
          glyphHeight={17.55}
          glyphTop={0.225}
          glyphLeft={0.225}
          size={52}
          style={{ left: 62, bottom: 0 }}
          onPointerDown={(event) => beginDrag('move', event)}
          onPointerMove={drag}
          onPointerUp={endDrag}
        />
      </div>
    </Html>
  )
}
