import { assetUrlWithRevision } from './modelVariants'

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
  brand?: string
  source: string
  sourceUrl?: string
  catalogCode?: string
  category: RoomSettingsCategory
  target: RoomMaterialTarget
  thumbnailUrl: string
  maps: RoomMaterialMaps
  repeat?: readonly [number, number]
  sampleSizeM?: readonly [number, number]
  relief?: {
    normalScale: number
    displacementScale?: number
    displacementBias?: number
    aoIntensity?: number
  }
}

type RoomMaterialCatalogSpec = {
  id: string
  brand: string
  source: string
  name: string
  sourceUrl: string
  catalogCode?: string
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
  'modern-triple-window',
  'modern-sliding-window',
  'modern-sliding-door-window',
  'modern-tall-casement-window',
  'modern-upper-transom-window',
  'modern-dynamic-window',
  'modern-casement-slider-window',
  'modern-pvc-transom-window',
  'modern-flush-white-door',
  'modern-slim-glass-door',
  'modern-sliding-glass-door',
  'modern-double-glass-door',
  'modern-ribbed-oak-door',
])

const wallMaterialSpecs: readonly RoomMaterialCatalogSpec[] = [
  {
    id: 'Wallpaper001A',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Besti Natural Painting White',
    catalogCode: '82483-01',
    sourceUrl:
      'https://cpas.lxhausys.co.kr/rn/productcategory/category3/list.jsp?fin_category=A020406&mid_category=A0204&sup_category=A02&tab=3',
  },
  {
    id: 'Wallpaper002A',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Besti Lime Plaster Painting White',
    catalogCode: '82390-01',
    sourceUrl:
      'https://cpas.lxhausys.co.kr/rn/productcategory/category3/list.jsp?fin_category=A020406&mid_category=A0204&sup_category=A02&tab=3',
  },
  {
    id: 'Wallpaper001B',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Besti Cross Cotton Cream',
    catalogCode: '11801',
    sourceUrl:
      'https://cpas.lxhausys.co.kr/rn/productcategory/category3/view.jsp?fin_category=A020406&mid_category=A0204&prd_id=11801&sup_category=A02',
  },
  {
    id: 'Wallpaper001C',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Besti Real Zeolite White',
    catalogCode: '82443-01',
    sourceUrl:
      'https://cpas.lxhausys.co.kr/rn/productcategory/category3/list.jsp?fin_category=A020406&mid_category=A0204&sup_category=A02&tab=3',
  },
  {
    id: 'Wallpaper002B',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Diamant Plaster White',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/1101',
  },
  {
    id: 'Wallpaper002C',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Diamant Stone White',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/1101',
  },
  {
    id: 'Plaster001',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Diamant Painting White',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/1101',
  },
  {
    id: 'Plaster002',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Zia Fabric White Series',
    sourceUrl:
      'https://cpas.lxhausys.co.kr/rn/productcategory/category2/list.jsp?mid_category=A0201&sup_category=A02',
  },
  {
    id: 'Plaster003',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Sium Tile Sandstone Light Gray',
    sourceUrl:
      'https://cpas.lxhausys.co.kr/rn/productcategory/category3/view.jsp?fin_category=A020601&mid_category=A0206&prd_id=13323&sup_category=A02',
  },
  {
    id: 'Plaster007',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Diamant Fortis Soft White',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/1581',
  },
] as const

const floorMaterialSpecs: readonly RoomMaterialCatalogSpec[] = [
  {
    id: 'WoodFloor051',
    brand: 'KCC HOMECC',
    source: 'homecc',
    name: 'Soop Gangmaru Modern White',
    catalogCode: 'J1101',
    sourceUrl: 'https://www.homecc.co.kr/images/homecc_catalog_livingroom.pdf',
  },
  {
    id: 'WoodFloor064',
    brand: 'KCC HOMECC',
    source: 'homecc',
    name: 'Soop Gangmaru New Smoky Oak',
    catalogCode: 'J1104',
    sourceUrl: 'https://www.homecc.co.kr/images/homecc_catalog_livingroom.pdf',
  },
  {
    id: 'Concrete048',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'ZEA Nature Gray Concrete',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/901',
  },
  {
    id: 'Concrete047A',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Editone Stone',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/1561',
  },
  {
    id: 'Carpet016',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'XComfort 5.0',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/1581',
  },
  {
    id: 'WoodFloor070',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Ganggreen Pro Raw Oak',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/415',
  },
  {
    id: 'WoodFloor071',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Ganggreen Pro Golden Teak',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/415',
  },
  {
    id: 'WoodFloor069',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Ganggreen Pro Pure Walnut',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/415',
  },
  {
    id: 'WoodFloor007',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Zia Sarangae Evernin Oak',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/431',
  },
  {
    id: 'WoodFloor062',
    brand: 'LX Z:IN',
    source: 'lxhausys',
    name: 'Zia Maru Nature Wood',
    sourceUrl: 'https://www.lxhausys.co.kr/company/pr/news/289',
  },
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

function toWallMaterial(spec: (typeof wallMaterialSpecs)[number]): RoomMaterialItem {
  return {
    kind: 'material',
    id: spec.id,
    name: spec.name,
    brand: spec.brand,
    source: spec.source,
    sourceUrl: spec.sourceUrl,
    catalogCode: spec.catalogCode,
    category: 'wall-materials',
    target: 'wall',
    thumbnailUrl: materialMaps('walls', spec.id).color,
    maps: materialMaps('walls', spec.id),
    repeat: [1.15, 0.85],
  }
}

function toFloorMaterial(spec: (typeof floorMaterialSpecs)[number]): RoomMaterialItem {
  const isWood = spec.id.startsWith('WoodFloor')
  const isConcrete = spec.id.startsWith('Concrete')

  return {
    kind: 'material',
    id: spec.id,
    name: spec.name,
    brand: spec.brand,
    source: spec.source,
    sourceUrl: spec.sourceUrl,
    catalogCode: spec.catalogCode,
    category: 'floor-materials',
    target: 'floor',
    thumbnailUrl: materialMaps('floors', spec.id).color,
    maps: materialMaps('floors', spec.id),
    sampleSizeM: isWood ? [1.6, 1.6] : isConcrete ? [1.4, 1.4] : [1.2, 1.2],
    relief: isWood
      ? {
          normalScale: 0.14,
          displacementScale: 0.0032,
          displacementBias: -0.0012,
          aoIntensity: 0.68,
        }
      : isConcrete
        ? {
            normalScale: 0.1,
            displacementScale: 0.002,
            displacementBias: -0.0008,
            aoIntensity: 0.62,
          }
        : {
            normalScale: 0.08,
            displacementScale: 0.0012,
            displacementBias: -0.0004,
            aoIntensity: 0.54,
          },
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
  sourceOverride?: string,
): RoomModelItem {
  const isPolyHaven = id.includes('_') || POLYHAVEN_MODEL_IDS.has(id)
  const isArchitectural = ARCHITECTURAL_MODEL_IDS.has(id)
  const source = sourceOverride ?? (isPolyHaven ? 'Poly Haven' : isArchitectural ? 'Architectural Library' : 'Curated Assets')
  const modelUrl = isPolyHaven
    ? `/assets/models/polyhaven/${id}.optimized.glb`
    : isArchitectural
      ? `/assets/models/architectural/${id}.optimized.glb`
      : `/assets/models/environment/${category === 'wall-decor' ? 'shell' : category}/${id}.optimized.glb`

  return {
    kind: 'model',
    id,
    name,
    source,
    category,
    modelUrl: assetUrlWithRevision(modelUrl),
    thumbnailUrl: assetUrlWithRevision(`/assets/model-thumbnails/${id}.png`),
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

export const WALL_MATERIALS = wallMaterialSpecs.map(toWallMaterial)
export const FLOOR_MATERIALS = floorMaterialSpecs.map(toFloorMaterial)

export const DEFAULT_WALL_MATERIAL = WALL_MATERIALS[6]
export const DEFAULT_FLOOR_MATERIAL = FLOOR_MATERIALS[1]

const WINDOW_ITEMS = [
  ['modern-wide-picture-window', 'Marvin', 'Modern Awning Crank Out', { x: 1.524, y: 1.0668, z: 0.1143 }],
  ['modern-triple-window', 'Marvin', 'Modern Casement Crank Out MultiW 1H', { x: 4.1656, y: 1.3716, z: 0.1143 }],
  ['modern-sliding-window', 'Marvin', 'Modern Direct Glaze Rectangle', { x: 0.9144, y: 1.3716, z: 0.1143 }],
  ['modern-sliding-door-window', 'Marvin', 'Modern Awning Crank Out 2H', { x: 1.524, y: 1.9812, z: 0.1143 }],
  ['modern-tall-casement-window', 'Marvin', 'Modern Casement Crank Out', { x: 0.9144, y: 1.3716, z: 0.1143 }],
  ['modern-upper-transom-window', 'Pella', 'Impervia Transom', { x: 0.6985, y: 0.4445, z: 0.0892 }],
  ['modern-dynamic-window', 'Pella', 'Impervia Casement Vent', { x: 0.7493, y: 1.2065, z: 0.0892 }],
  ['modern-casement-slider-window', 'Pella', 'Impervia Casement Fixed', { x: 0.7493, y: 1.2065, z: 0.0892 }],
  ['modern-pvc-transom-window', 'Marvin', 'Modern Casement Picture', { x: 0.9144, y: 1.3716, z: 0.1143 }],
] as const

const DOOR_ITEMS = [
  ['modern-flush-white-door', 'Masonite', 'Flush White Door', { x: 1.02, y: 2.16, z: 0.16 }],
  ['modern-slim-glass-door', 'Marvin', 'Slim Glass Panel Door', { x: 1.02, y: 2.16, z: 0.16 }],
  ['modern-sliding-glass-door', 'Marvin', 'Sliding Glass Door', { x: 1.86, y: 2.12, z: 0.13 }],
  ['modern-double-glass-door', 'Pella', 'Double Glass Door', { x: 1.5, y: 2.16, z: 0.16 }],
  ['modern-ribbed-oak-door', 'Masonite', 'Ribbed Oak Door', { x: 1.02, y: 2.16, z: 0.16 }],
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
  ...WINDOW_ITEMS.map(([id, source, name, dimensionsM]) =>
    environmentModel('windows', id, name, name, 'wall', dimensionsM, 0, 'xy', source),
  ),
  ...DOOR_ITEMS.map(([id, source, name, dimensionsM]) =>
    environmentModel('doors', id, name, name, 'wall', dimensionsM, 0, 'xy', source),
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
