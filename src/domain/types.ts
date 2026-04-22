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
  source: 'kenney' | 'polypizza' | 'meshy' | 'procedural' | 'ikea-ref'
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

export const DEFAULT_ROOM: Room = {
  id: 'default',
  widthM: 4.2,
  depthM: 5.0,
  heightM: 2.4,
  floor: { material: 'wood', colorHex: '#C9A97E' },
  wall: { colorHex: '#EAEAEA' },
}
