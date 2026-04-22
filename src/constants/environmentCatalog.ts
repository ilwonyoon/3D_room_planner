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
  displayLabel: string
}

export type RoomSettingsItem = RoomMaterialItem | RoomModelItem

const POLYHAVEN_MODEL_IDS = new Set([
  'dartboard',
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
): RoomModelItem {
  const isPolyHaven = id.includes('_') || POLYHAVEN_MODEL_IDS.has(id)
  const modelUrl = isPolyHaven
    ? `/assets/models/polyhaven/${id}.optimized.glb`
    : `/assets/models/environment/${category === 'wall-decor' ? 'shell' : category}/${id}.optimized.glb`

  return {
    kind: 'model',
    id,
    name,
    source: isPolyHaven ? 'Poly Haven' : 'Kenney',
    category,
    modelUrl,
    thumbnailUrl: `/assets/model-thumbnails/${id}.png`,
    placement,
    targetSize: Math.max(dimensionsM.x, dimensionsM.y, dimensionsM.z),
    dimensionsM,
    defaultPosition: placement === 'wall' ? { x: 0, z: -2.46 } : { x: 0.1, z: 0.45 },
    defaultElevationM: placement === 'wall' ? 1.1 : 0.02,
    defaultRotationY,
    displayLabel,
  }
}

export const WALL_MATERIALS = wallMaterialIds.map(toWallMaterial)
export const FLOOR_MATERIALS = floorMaterialIds.map(toFloorMaterial)

export const DEFAULT_WALL_MATERIAL = WALL_MATERIALS[6]
export const DEFAULT_FLOOR_MATERIAL = FLOOR_MATERIALS[0]

const WINDOW_ITEMS = [
  ['wall-window-wide-round-detailed', 'Wide Round Window', { x: 1.2, y: 0.72, z: 0.06 }],
  ['wall-window-square-detailed', 'Square Window', { x: 1, y: 1.2, z: 0.1 }],
  ['wall-window-wide-square-detailed', 'Wide Square Window', { x: 1.2, y: 0.72, z: 0.06 }],
  ['wall-window-square', 'Plain Square Window', { x: 1, y: 1.2, z: 0.1 }],
  ['wall-window-wide-round', 'Plain Wide Round Window', { x: 1.2, y: 0.72, z: 0.06 }],
  ['wall-window-round-detailed', 'Round Window', { x: 1, y: 1.2, z: 0.1 }],
  ['wall-window-wide-square', 'Plain Wide Square Window', { x: 1.2, y: 0.72, z: 0.06 }],
  ['wall-window-round', 'Plain Round Window', { x: 1, y: 1.2, z: 0.1 }],
  ['barricade-window-a', 'Window Cover A', { x: 1.2, y: 0.92, z: 0.07 }],
  ['barricade-window-b', 'Window Cover B', { x: 1.2, y: 1.04, z: 0.07 }],
  ['barricade-window-c', 'Window Cover C', { x: 1.11, y: 1.2, z: 0.09 }],
] as const

const DOOR_ITEMS = [
  ['door-rotate-square-a', 'Square Door A', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-square-b', 'Square Door B', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-square-c', 'Square Door C', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-square-d', 'Square Door D', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-round-a', 'Round Door A', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-round-b', 'Round Door B', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-round-c', 'Round Door C', { x: 0.9, y: 2.05, z: 0.24 }],
  ['door-rotate-round-d', 'Round Door D', { x: 0.9, y: 2.05, z: 0.24 }],
  ['wall-doorway-square', 'Square Doorway', { x: 1.71, y: 2.05, z: 0.17 }],
  ['wall-doorway-round', 'Round Doorway', { x: 1.71, y: 2.05, z: 0.17 }],
  ['wall-doorway-wide-square', 'Wide Square Doorway', { x: 2.05, y: 1.23, z: 0.1 }],
  ['wall-doorway-wide-round', 'Wide Round Doorway', { x: 2.05, y: 1.23, z: 0.1 }],
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
    environmentModel('windows', id, name, 'Window', 'wall', dimensionsM, Math.PI / 2),
  ),
  ...DOOR_ITEMS.map(([id, name, dimensionsM]) =>
    environmentModel('doors', id, name, 'Door', 'wall', dimensionsM, Math.PI / 2),
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
