import type { Room, Vec2 } from './types'

export type Footprint = {
  id: string
  position: Vec2
  rotationY: number
  size: { x: number; z: number }
}

export type Bounds2D = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

const QUARTER_TURN = Math.PI / 2

export function snapToQuarterTurn(rotationY: number) {
  return Math.round(rotationY / QUARTER_TURN) * QUARTER_TURN
}

export function normalizeRotation(rotationY: number, mode: 'orthogonal' | 'free' = 'orthogonal') {
  return mode === 'free' ? rotationY : snapToQuarterTurn(rotationY)
}

export function snapToGrid(value: number, stepM = 0.05) {
  return Math.round(value / stepM) * stepM
}

export function snappedPosition(position: Vec2, stepM = 0.05): Vec2 {
  return {
    x: snapToGrid(position.x, stepM),
    z: snapToGrid(position.z, stepM),
  }
}

export function normalizedQuarterTurns(rotationY: number) {
  const turns = Math.round(rotationY / QUARTER_TURN)
  return ((turns % 4) + 4) % 4
}

export function rotatedFootprintSize(size: { x: number; z: number }, rotationY: number) {
  return normalizedQuarterTurns(rotationY) % 2 === 1
    ? { x: size.z, z: size.x }
    : size
}

export function footprintBounds(footprint: Footprint): Bounds2D {
  const size = rotatedFootprintSize(footprint.size, footprint.rotationY)

  return {
    minX: footprint.position.x - size.x / 2,
    maxX: footprint.position.x + size.x / 2,
    minZ: footprint.position.z - size.z / 2,
    maxZ: footprint.position.z + size.z / 2,
  }
}

export function clampToRoom(position: Vec2, size: { x: number; z: number }, room: Room) {
  const halfX = size.x / 2
  const halfZ = size.z / 2
  const minX = -room.widthM / 2 + halfX
  const maxX = room.widthM / 2 - halfX
  const minZ = -room.depthM / 2 + halfZ
  const maxZ = room.depthM / 2 - halfZ

  return {
    x: Math.min(maxX, Math.max(minX, position.x)),
    z: Math.min(maxZ, Math.max(minZ, position.z)),
  }
}

export function boundsOverlap(a: Bounds2D, b: Bounds2D, paddingM = 0.02) {
  return (
    a.minX < b.maxX + paddingM &&
    a.maxX > b.minX - paddingM &&
    a.minZ < b.maxZ + paddingM &&
    a.maxZ > b.minZ - paddingM
  )
}

export function hasCollision(candidate: Footprint, others: Footprint[], paddingM = 0.02) {
  const candidateBounds = footprintBounds(candidate)
  return others.some((other) => boundsOverlap(candidateBounds, footprintBounds(other), paddingM))
}

export function constrainFloorMove({
  candidate,
  others,
  room,
  gridM = 0.05,
  avoidCollisions = true,
}: {
  candidate: Footprint
  others: Footprint[]
  room: Room
  gridM?: number
  avoidCollisions?: boolean
}) {
  const rotatedSize = rotatedFootprintSize(candidate.size, candidate.rotationY)
  const snapped = snappedPosition(candidate.position, gridM)
  const clamped = clampToRoom(snapped, rotatedSize, room)
  const constrained = { ...candidate, position: clamped }

  if (avoidCollisions && hasCollision(constrained, others)) {
    return null
  }

  return constrained.position
}

export function canRotate(candidate: Footprint, others: Footprint[], room: Room) {
  const rotatedSize = rotatedFootprintSize(candidate.size, candidate.rotationY)
  const clamped = clampToRoom(candidate.position, rotatedSize, room)
  const constrained = { ...candidate, position: clamped }

  if (hasCollision(constrained, others)) {
    return null
  }

  return clamped
}
