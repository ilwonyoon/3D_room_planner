import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { rotatedFootprintSize } from '@/domain/placementConstraints'
import { useEditorObjectsStore, useRoomStore, useSelectionStore } from '@/store'

const EDITOR_OVERLAY_LAYER = 1

function setEditorOverlayLayer(object: THREE.Object3D) {
  object.layers.set(EDITOR_OVERLAY_LAYER)
}

function useEditorOverlayLayer<T extends THREE.Object3D>() {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    ref.current?.layers.set(EDITOR_OVERLAY_LAYER)
  }, [])

  return ref
}

function makeGridGeometry(width: number, depth: number, step: number) {
  const points: number[] = []
  const halfW = width / 2
  const halfD = depth / 2

  for (let x = -halfW; x <= halfW + 0.001; x += step) {
    points.push(x, 0, -halfD, x, 0, halfD)
  }

  for (let z = -halfD; z <= halfD + 0.001; z += step) {
    points.push(-halfW, 0, z, halfW, 0, z)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return geometry
}

function makeBoxGeometry(width: number, height: number, depth: number) {
  const x = width / 2
  const z = depth / 2
  const y0 = 0
  const y1 = height
  const corners = [
    [-x, y0, -z], [x, y0, -z], [x, y0, z], [-x, y0, z],
    [-x, y1, -z], [x, y1, -z], [x, y1, z], [-x, y1, z],
  ]
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  const points = edges.flatMap(([a, b]) => [...corners[a], ...corners[b]])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return geometry
}

type DistanceGuide = {
  key: string
  distanceM: number
  points: [[number, number, number], [number, number, number]]
  labelPosition: [number, number, number]
  tickAxis: 'x' | 'z'
}

function makeDistanceGuideGeometry(guide: DistanceGuide) {
  const tick = 0.08
  const [[sx, sy, sz], [ex, ey, ez]] = guide.points
  const points = [
    sx, sy, sz, ex, ey, ez,
  ]

  if (guide.tickAxis === 'x') {
    points.push(sx - tick, sy, sz, sx + tick, sy, sz)
    points.push(ex - tick, ey, ez, ex + tick, ey, ez)
  } else {
    points.push(sx, sy, sz - tick, sx, sy, sz + tick)
    points.push(ex, ey, ez - tick, ex, ey, ez + tick)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return geometry
}

function getNearestDistanceGuides({
  roomWidth,
  roomDepth,
  position,
  size,
}: {
  roomWidth: number
  roomDepth: number
  position: { x: number; z: number }
  size: { x: number; z: number }
}): DistanceGuide[] {
  const halfW = roomWidth / 2
  const halfD = roomDepth / 2
  const minX = position.x - size.x / 2
  const maxX = position.x + size.x / 2
  const minZ = position.z - size.z / 2
  const maxZ = position.z + size.z / 2
  const y = 0.045

  const candidates: DistanceGuide[] = [
    {
      key: 'left',
      distanceM: Math.max(0, minX + halfW),
      points: [[minX, y, position.z], [-halfW, y, position.z]],
      labelPosition: [(minX - halfW) / 2, y + 0.06, position.z],
      tickAxis: 'z',
    },
    {
      key: 'right',
      distanceM: Math.max(0, halfW - maxX),
      points: [[maxX, y, position.z], [halfW, y, position.z]],
      labelPosition: [(maxX + halfW) / 2, y + 0.06, position.z],
      tickAxis: 'z',
    },
    {
      key: 'back',
      distanceM: Math.max(0, minZ + halfD),
      points: [[position.x, y, minZ], [position.x, y, -halfD]],
      labelPosition: [position.x, y + 0.06, (minZ - halfD) / 2],
      tickAxis: 'x',
    },
    {
      key: 'front',
      distanceM: Math.max(0, halfD - maxZ),
      points: [[position.x, y, maxZ], [position.x, y, halfD]],
      labelPosition: [position.x, y + 0.06, (maxZ + halfD) / 2],
      tickAxis: 'x',
    },
  ]

  return candidates.sort((a, b) => a.distanceM - b.distanceM).slice(0, 2)
}

function DistanceLabel({
  children,
  position,
}: {
  children: string
  position: [number, number, number]
}) {
  return (
    <Html position={position} center occlude={false} style={{ pointerEvents: 'none' }}>
      <span
        style={{
          color: '#2f3438',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: '14px',
          textShadow: '0 1px 2px rgba(255,255,255,0.9)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
    </Html>
  )
}

function DistanceGuideLine({
  guide,
  material,
}: {
  guide: DistanceGuide
  material: THREE.LineBasicMaterial
}) {
  const geometry = useMemo(() => makeDistanceGuideGeometry(guide), [guide])
  const ref = useEditorOverlayLayer<THREE.LineSegments>()

  return (
    <lineSegments
      ref={ref}
      geometry={geometry}
      material={material}
      renderOrder={7}
      onUpdate={setEditorOverlayLayer}
    />
  )
}

export function SelectionGizmos() {
  const invalidate = useThree((state) => state.invalidate)
  const room = useRoomStore((state) => state.room)
  const objects = useEditorObjectsStore((state) => state.objects)
  const activeDragMode = useEditorObjectsStore((state) => state.activeDragMode)
  const selectedId = useSelectionStore((state) => state.selectedId)
  const selected = objects.find((object) => object.id === selectedId)

  const floorGrid = useMemo(
    () => makeGridGeometry(room.widthM, room.depthM, 0.1),
    [room.depthM, room.widthM],
  )
  const floorGridMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#76d67a',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    [],
  )

  const bounds = useMemo(() => {
    if (!selected) return null
    const size = selected.placement === 'wall'
      ? { x: selected.dimensionsM.x, z: selected.dimensionsM.z }
      : rotatedFootprintSize(selected.dimensionsM, selected.rotationY)

    return {
      size,
      geometry: makeBoxGeometry(size.x, selected.dimensionsM.y, size.z),
    }
  }, [selected])

  const boundsMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#34d12f',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    [],
  )
  const distanceGuideMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#34d12f',
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
      }),
    [],
  )
  const floorGridRef = useEditorOverlayLayer<THREE.LineSegments>()
  const boundsRef = useEditorOverlayLayer<THREE.LineSegments>()

  useEffect(() => {
    invalidate()
  }, [
    activeDragMode,
    invalidate,
    selected?.boundsRotationY,
    selected?.dimensionsM.x,
    selected?.dimensionsM.y,
    selected?.dimensionsM.z,
    selected?.elevationM,
    selected?.position.x,
    selected?.position.z,
    selected?.rotationY,
    selectedId,
  ])

  if (!selected || !bounds) {
    return null
  }

  const centerY = selected.elevationM + 0.018
  const showFloorMoveGuides = activeDragMode === 'move' && selected.placement === 'floor'
  const distanceGuides = showFloorMoveGuides
    ? getNearestDistanceGuides({
        roomWidth: room.widthM,
        roomDepth: room.depthM,
        position: selected.position,
        size: bounds.size,
      })
    : []

  return (
    <>
      {showFloorMoveGuides && (
        <lineSegments
          ref={floorGridRef}
          geometry={floorGrid}
          material={floorGridMaterial}
          position={[0, 0.026, 0]}
          renderOrder={5}
          onUpdate={setEditorOverlayLayer}
        />
      )}

      <lineSegments
        ref={boundsRef}
        geometry={bounds.geometry}
        material={boundsMaterial}
        position={[selected.position.x, centerY, selected.position.z]}
        rotation={[0, selected.boundsRotationY ?? selected.rotationY, 0]}
        renderOrder={6}
        onUpdate={setEditorOverlayLayer}
      />

      {showFloorMoveGuides && (
        <>
          {distanceGuides.map((guide) => (
            <DistanceGuideLine
              key={guide.key}
              guide={guide}
              material={distanceGuideMaterial}
            />
          ))}
          {distanceGuides.map((guide) => (
            <DistanceLabel key={`${guide.key}-label`} position={guide.labelPosition}>
              {`${Math.round(guide.distanceM * 100)}cm`}
            </DistanceLabel>
          ))}
        </>
      )}
    </>
  )
}
