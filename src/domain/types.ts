import type { CategoryId } from '@/constants/categories'

export type Vec2 = { x: number; z: number }
export type Vec3 = { x: number; y: number; z: number }

export type WallSide = 'north' | 'south' | 'east' | 'west'

export type StyleTag =
  | 'modern_bw' | 'warm_nordic' | 'minimal_japandi' | 'retro_70s'
  | 'industrial' | 'boho' | 'kids' | 'luxury'

export interface Room {
  id: string
  widthM: number
  depthM: number
  heightM: number
  entrance?: { wall: WallSide; centerX: number; widthM: number }
  windows?: Array<{ wall: WallSide; centerX: number; widthM: number; sillHeightM: number }>
  floor: { material: 'wood' | 'tile' | 'carpet'; colorHex: string }
  wall: { colorHex: string }
}

export interface FurnitureCatalogItem {
  id: string
  name: string
  nameEn: string
  brand: string
  category: CategoryId
  tags: string[]
  styleTags: StyleTag[]
  glbUrl: string
  thumbnail: string
  dimensionsM: Vec3
  placement: 'floor' | 'wall' | 'ceiling'
  snapToWall: boolean
  clearanceM: { front: number; sides: number; back?: number }
  source: 'polyhaven' | 'sharetextures' | 'khronos' | 'polypizza' | 'meshy' | 'procedural' | 'ikea-ref'
  license: 'CC0' | 'CC-BY' | 'commercial'
}

export interface PlacedFurniture {
  instanceId: string
  catalogId: string
  position: Vec2
  rotationY: number
  createdAt: number
}

export interface RoomPlan {
  version: 1
  id: string
  room: Room
  placements: PlacedFurniture[]
  styleTag?: StyleTag
  createdAt: string
  updatedAt: string
}

// Powder/three-quarter bathroom proportions — front-elevation framing
// (per docs/bond-demo/19): wide enough for vanity+toilet on the back wall,
// tub on the right, narrow enough that the camera sees the full back wall
// without panning. 2.4m × 1.6m × 2.4m matches common Lowe's tear-out remod
// reference floorplans.
// Powder/three-quarter bathroom proportions — front-elevation framing
// (per docs/bond-demo/19): wide enough for vanity + toilet + tub on a
// back-left-right arrangement, depth shallow so the camera sees the full
// back wall in one frame. 3.6m × 1.8m × 2.4m matches Lowe's standard
// "three-quarter bath" reference floor plans.
export const DEFAULT_ROOM: Room = {
  id: 'default',
  widthM: 3.6,
  depthM: 1.8,
  heightM: 2.4,
  floor: { material: 'wood', colorHex: '#8a8580' },
  wall: { colorHex: '#ede8df' },
}
