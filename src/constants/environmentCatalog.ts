export type RoomSettingsCategory =
  | 'wall-materials'
  | 'floor-materials'
  | 'windows'
  | 'doors'
  | 'wall-decor'
  | 'decor'

export type RoomMaterialTarget = 'wall' | 'floor'

export type RoomMaterialMaps = {
  color: string
  normal: string
  roughness: string
  displacement?: string
  ao?: string
}

export type RoomMaterialItem = {
  kind: 'material'
  id: string
  name: string
  source: string
  category: RoomSettingsCategory
  target: RoomMaterialTarget
  thumbnailUrl: string
  maps: RoomMaterialMaps
  repeat: readonly [number, number]
}

export type RoomModelItem = {
  kind: 'model'
  id: string
  name: string
  source: string
  category: RoomSettingsCategory
  modelUrl: string
  thumbnailUrl: string
  placement: 'floor' | 'wall'
  targetSize: number
  dimensionsM: { x: number; y: number; z: number }
  defaultPosition: { x: number; z: number }
  defaultElevationM: number
  defaultRotationY: number
  wallSurfacePlane?: 'xy' | 'yz'
  displayLabel: string
}

export type RoomSettingsItem = RoomMaterialItem | RoomModelItem

const POLYHAVEN_MODEL_IDS = new Set([
  'dartboard',
])

const ARCHITECTURAL_MODEL_IDS = new Set([
  'modern-wide-picture-window',
  'modern-sliding-window',
  'modern-tall-casement-window',
  'modern-square-awning-window',
  'modern-transom-window',
  'modern-flush-white-door',
  'modern-slim-glass-door',
  'modern-sliding-glass-door',
  'modern-double-glass-door',
  'modern-ribbed-oak-door',
])

const wallMaterialIds = [
  'Wallpaper001A',
  'Wallpaper002A',
  'Wallpaper001B',
  'Wallpaper001C',
  'Wallpaper002B',
  'Wallpaper002C',
  'Plaster001',
  'Plaster002',
  'Plaster003',
  'Plaster007',
] as const

const floorMaterialIds = [
  'WoodFloor051',
  'WoodFloor064',
  'Concrete048',
  'Concrete047A',
  'Carpet016',
  'WoodFloor070',
  'WoodFloor071',
  'WoodFloor069',
  'WoodFloor007',
  'WoodFloor062',
] as const

const materialIdsWithAo = new Set<string>([
  'Carpet016',
  'Concrete047A',
  'Concrete048',
  'Plaster007',
  'WoodFloor007',
  'WoodFloor051',
])

function materialMaps(group: 'walls' | 'floors', id: string): RoomMaterialMaps {
  const base = `/assets/textures-runtime/${group}/${id}/${id}_1K-JPG`

  return {
    color: `${base}_Color.jpg`,
    normal: `${base}_NormalGL.jpg`,
    roughness: `${base}_Roughness.jpg`,
    displacement: `${base}_Displacement.jpg`,
    ...(materialIdsWithAo.has(id) ? { ao: `${base}_AmbientOcclusion.jpg` } : {}),
  }
}

function toWallMaterial(id: string): RoomMaterialItem {
  return {
    kind: 'material',
    id,
    name: id.replace(/([a-z])([A-Z])/g, '$1 $2'),
    source: 'ambientCG',
    category: 'wall-materials',
    target: 'wall',
    thumbnailUrl: materialMaps('walls', id).color,
    maps: materialMaps('walls', id),
    repeat: [1.15, 0.85],
  }
}

function toFloorMaterial(id: string): RoomMaterialItem {
  return {
    kind: 'material',
    id,
    name: id.replace(/([a-z])([A-Z])/g, '$1 $2'),
    source: 'ambientCG',
    category: 'floor-materials',
    target: 'floor',
    thumbnailUrl: materialMaps('floors', id).color,
    maps: materialMaps('floors', id),
    repeat: [0.36, 0.36],
  }
}

function environmentModel(
  category: RoomSettingsCategory,
  id: string,
  name: string,
  displayLabel: string,
  placement: 'floor' | 'wall',
  dimensionsM: { x: number; y: number; z: number },
  defaultRotationY = 0,
  wallSurfacePlane: 'xy' | 'yz' = 'xy',
): RoomModelItem {
  const isPolyHaven = id.includes('_') || POLYHAVEN_MODEL_IDS.has(id)
  const isArchitectural = ARCHITECTURAL_MODEL_IDS.has(id)
  const modelUrl = isPolyHaven
    ? `/assets/models/polyhaven/${id}.optimized.glb`
    : isArchitectural
      ? `/assets/models/architectural/${id}.optimized.glb`
      : `/assets/models/environment/${category === 'wall-decor' ? 'shell' : category}/${id}.optimized.glb`

  return {
    kind: 'model',
    id,
    name,
    source: isPolyHaven ? 'Poly Haven' : 'Pocketroom',
    category,
    modelUrl,
    thumbnailUrl: `/assets/model-thumbnails/${id}.png`,
    placement,
    targetSize: Math.max(dimensionsM.x, dimensionsM.y, dimensionsM.z),
    dimensionsM,
    defaultPosition: placement === 'wall' ? { x: 0, z: -2.46 } : { x: 0.1, z: 0.45 },
    defaultElevationM: placement === 'wall' ? 1.1 : 0.02,
    defaultRotationY,
    wallSurfacePlane: placement === 'wall' ? wallSurfacePlane : undefined,
    displayLabel,
  }
}

export const WALL_MATERIALS = wallMaterialIds.map(toWallMaterial)
export const FLOOR_MATERIALS = floorMaterialIds.map(toFloorMaterial)

export const DEFAULT_WALL_MATERIAL = WALL_MATERIALS[6]
export const DEFAULT_FLOOR_MATERIAL = FLOOR_MATERIALS[0]

const WINDOW_ITEMS = [
  ['modern-wide-picture-window', 'Wide Picture Window', { x: 1.58, y: 0.98, z: 0.1 }],
  ['modern-sliding-window', 'Two-Panel Sliding Window', { x: 1.62, y: 1.02, z: 0.11 }],
  ['modern-tall-casement-window', 'Tall Casement Window', { x: 0.88, y: 1.54, z: 0.16 }],
  ['modern-square-awning-window', 'Square Awning Window', { x: 1.04, y: 1, z: 0.11 }],
  ['modern-transom-window', 'Narrow Transom Window', { x: 1.42, y: 0.5, z: 0.1 }],
] as const

const DOOR_ITEMS = [
  ['modern-flush-white-door', 'Flush White Door', { x: 1.02, y: 2.16, z: 0.16 }],
  ['modern-slim-glass-door', 'Slim Glass Panel Door', { x: 1.02, y: 2.16, z: 0.16 }],
  ['modern-sliding-glass-door', 'Sliding Glass Door', { x: 1.86, y: 2.12, z: 0.13 }],
  ['modern-double-glass-door', 'Double Glass Door', { x: 1.5, y: 2.16, z: 0.16 }],
  ['modern-ribbed-oak-door', 'Ribbed Oak Door', { x: 1.02, y: 2.16, z: 0.16 }],
] as const

const WALL_DECOR_ITEMS = [
  ['fancy_picture_frame_01', 'Fancy Picture Frame 01', { x: 0.52, y: 0.4, z: 0.02 }],
  ['fancy_picture_frame_02', 'Fancy Picture Frame 02', { x: 0.45, y: 0.52, z: 0.06 }],
  ['hanging_picture_frame_01', 'Hanging Picture Frame 01', { x: 0.37, y: 0.52, z: 0.01 }],
  ['hanging_picture_frame_02', 'Hanging Picture Frame 02', { x: 0.52, y: 0.35, z: 0.02 }],
  ['hanging_picture_frame_03', 'Hanging Picture Frame 03', { x: 0.4, y: 0.52, z: 0.03 }],
  ['standing_picture_frame_01', 'Standing Picture Frame 01', { x: 0.21, y: 0.52, z: 0.42 }],
  ['standing_picture_frame_02', 'Standing Picture Frame 02', { x: 0.2, y: 0.52, z: 0.42 }],
  ['ornate_mirror_01', 'Ornate Mirror', { x: 0.34, y: 0.52, z: 0.02 }],
  ['vintage_telephone_wall_clock', 'Wall Clock', { x: 0.36, y: 0.52, z: 0.2 }],
  ['dartboard', 'Dartboard', { x: 0.52, y: 0.52, z: 0.05 }],
] as const

const DECOR_ITEMS = [
  ['ceramic_vase_01', 'Ceramic Vase 01', { x: 0.32, y: 0.62, z: 0.32 }],
  ['ceramic_vase_02', 'Ceramic Vase 02', { x: 0.44, y: 0.62, z: 0.44 }],
  ['ceramic_vase_03', 'Ceramic Vase 03', { x: 0.17, y: 0.62, z: 0.17 }],
  ['ceramic_vase_04', 'Ceramic Vase 04', { x: 0.33, y: 0.62, z: 0.33 }],
  ['brass_vase_01', 'Brass Vase 01', { x: 0.2, y: 0.62, z: 0.2 }],
  ['brass_vase_02', 'Brass Vase 02', { x: 0.25, y: 0.62, z: 0.25 }],
  ['planter_box_01', 'Planter Box 01', { x: 0.62, y: 0.29, z: 0.28 }],
  ['planter_box_02', 'Planter Box 02', { x: 0.62, y: 0.23, z: 0.23 }],
  ['pachira_aquatica_01', 'Pachira Aquatica', { x: 0.62, y: 0.17, z: 0.09 }],
  ['book_encyclopedia_set_01', 'Book Set', { x: 0.62, y: 0.27, z: 0.18 }],
] as const

export const ROOM_SETTINGS_CATALOG: RoomSettingsItem[] = [
  ...WALL_MATERIALS,
  ...FLOOR_MATERIALS,
  ...WINDOW_ITEMS.map(([id, name, dimensionsM]) =>
    environmentModel('windows', id, name, name, 'wall', dimensionsM),
  ),
  ...DOOR_ITEMS.map(([id, name, dimensionsM]) =>
    environmentModel('doors', id, name, name, 'wall', dimensionsM),
  ),
  ...WALL_DECOR_ITEMS.map(([id, name, dimensionsM]) =>
    environmentModel('wall-decor', id, name, 'Wall decor', 'wall', dimensionsM),
  ),
  ...DECOR_ITEMS.map(([id, name, dimensionsM]) =>
    environmentModel('decor', id, name, 'Decor', 'floor', dimensionsM),
  ),
]

export const ROOM_SETTINGS_BY_MODEL_URL = new Map(
  ROOM_SETTINGS_CATALOG.filter((item): item is RoomModelItem => item.kind === 'model').map((item) => [item.modelUrl, item]),
)
