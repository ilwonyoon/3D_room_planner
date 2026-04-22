export type ProductCategory =
  | 'sofa'
  | 'chair'
  | 'table'
  | 'storage'
  | 'decor'
  | 'lighting'
  | 'appliance'
  | 'bed'
  | 'pets'

export type ProductAssetSource = 'polyhaven' | 'khronos' | 'kenney-furniture'

export type ProductCatalogItem = {
  id: string
  brand: string
  category: ProductCategory
  source: ProductAssetSource
  modelUrl: string
  thumbnailUrl: string
  dimensionsCm: [number, number, number]
}

type ProductCatalogSeed = {
  id: string
  source?: ProductAssetSource
  dimensionsCm?: [number, number, number]
}

const dimensionByCategory: Record<ProductCategory, [number, number, number]> = {
  sofa: [210, 86, 92],
  chair: [82, 78, 88],
  table: [120, 68, 42],
  storage: [120, 44, 92],
  decor: [46, 34, 62],
  lighting: [36, 36, 82],
  appliance: [84, 32, 72],
  bed: [210, 164, 94],
  pets: [64, 48, 48],
}

const modelSeedsByCategory: Record<ProductCategory, ProductCatalogSeed[]> = {
  sofa: [
    { id: 'sheen-wood-leather-sofa', source: 'khronos', dimensionsCm: [210, 86, 92] },
    { id: 'loungeDesignSofa', source: 'kenney-furniture', dimensionsCm: [190, 82, 78] },
    { id: 'loungeSofa', source: 'kenney-furniture', dimensionsCm: [190, 86, 78] },
    { id: 'loungeSofaLong', source: 'kenney-furniture', dimensionsCm: [230, 90, 78] },
    { id: 'loungeSofaOttoman', source: 'kenney-furniture', dimensionsCm: [170, 90, 78] },
    { id: 'benchCushion', source: 'kenney-furniture', dimensionsCm: [130, 48, 55] },
    { id: 'benchCushionLow', source: 'kenney-furniture', dimensionsCm: [120, 44, 42] },
    { id: 'Sofa_01' },
    { id: 'sofa_02' },
    { id: 'sofa_03' },
    { id: 'chinese_sofa' },
    { id: 'painted_wooden_sofa' },
    { id: 'painted_wooden_bench' },
    { id: 'Ottoman_01' },
  ],
  chair: [
    { id: 'sheen-chair', source: 'khronos', dimensionsCm: [82, 78, 88] },
    { id: 'chairModernCushion', source: 'kenney-furniture', dimensionsCm: [54, 58, 82] },
    { id: 'chairModernFrameCushion', source: 'kenney-furniture', dimensionsCm: [56, 60, 82] },
    { id: 'chairRounded', source: 'kenney-furniture', dimensionsCm: [56, 56, 78] },
    { id: 'chairCushion', source: 'kenney-furniture', dimensionsCm: [54, 58, 80] },
    { id: 'chairDesk', source: 'kenney-furniture', dimensionsCm: [58, 58, 84] },
    { id: 'loungeChair', source: 'kenney-furniture', dimensionsCm: [74, 82, 78] },
    { id: 'loungeDesignChair', source: 'kenney-furniture', dimensionsCm: [74, 78, 82] },
    { id: 'stoolBar', source: 'kenney-furniture', dimensionsCm: [42, 42, 92] },
    { id: 'stoolBarSquare', source: 'kenney-furniture', dimensionsCm: [42, 42, 92] },
    { id: 'modern_arm_chair_01' },
    { id: 'ArmChair_01' },
    { id: 'mid_century_lounge_chair' },
    { id: 'plastic_monobloc_chair_01' },
    { id: 'bar_chair_round_01' },
    { id: 'SchoolChair_01' },
    { id: 'Rockingchair_01' },
    { id: 'painted_wooden_chair_01' },
    { id: 'painted_wooden_chair_02' },
    { id: 'BarberShopChair_01' },
    { id: 'chinese_stool' },
    { id: 'gallinera_chair' },
    { id: 'dining_chair_02' },
    { id: 'folding_wooden_stool' },
    { id: 'metal_stool_01' },
    { id: 'metal_stool_02' },
    { id: 'chinese_armchair' },
    { id: 'GreenChair_01' },
    { id: 'WoodenChair_01' },
    { id: 'painted_wooden_stool' },
    { id: 'wooden_stool_01' },
    { id: 'wooden_stool_02' },
  ],
  table: [
    { id: 'desk', source: 'kenney-furniture', dimensionsCm: [140, 70, 75] },
    { id: 'deskCorner', source: 'kenney-furniture', dimensionsCm: [150, 150, 75] },
    { id: 'tableCoffee', source: 'kenney-furniture', dimensionsCm: [110, 62, 42] },
    { id: 'tableCoffeeGlass', source: 'kenney-furniture', dimensionsCm: [110, 62, 42] },
    { id: 'tableCoffeeGlassSquare', source: 'kenney-furniture', dimensionsCm: [82, 82, 42] },
    { id: 'tableCoffeeSquare', source: 'kenney-furniture', dimensionsCm: [82, 82, 42] },
    { id: 'tableGlass', source: 'kenney-furniture', dimensionsCm: [130, 80, 75] },
    { id: 'tableRound', source: 'kenney-furniture', dimensionsCm: [110, 110, 75] },
    { id: 'sideTable', source: 'kenney-furniture', dimensionsCm: [48, 48, 56] },
    { id: 'sideTableDrawers', source: 'kenney-furniture', dimensionsCm: [48, 48, 58] },
    { id: 'CoffeeCart_01', dimensionsCm: [80, 46, 84] },
    { id: 'CoffeeTable_01' },
    { id: 'modern_coffee_table_01' },
    { id: 'modern_coffee_table_02' },
    { id: 'gothic_coffee_table' },
    { id: 'gallinera_table' },
    { id: 'painted_wooden_table' },
    { id: 'small_wooden_table_01' },
    { id: 'wooden_picnic_table' },
    { id: 'wooden_table_02' },
    { id: 'metal_office_desk' },
    { id: 'chinese_console_table' },
    { id: 'WoodenTable_01' },
    { id: 'WoodenTable_02' },
    { id: 'WoodenTable_03' },
    { id: 'coffee_table_round_01' },
    { id: 'industrial_coffee_table' },
    { id: 'SchoolDesk_01' },
    { id: 'round_wooden_table_01' },
    { id: 'round_wooden_table_02' },
    { id: 'chinese_tea_table' },
    { id: 'side_table_01' },
    { id: 'side_table_tall_01' },
    { id: 'outdoor_table_chair_set_01' },
  ],
  storage: [
    { id: 'bookcaseClosed', source: 'kenney-furniture', dimensionsCm: [84, 36, 172] },
    { id: 'bookcaseClosedDoors', source: 'kenney-furniture', dimensionsCm: [84, 38, 172] },
    { id: 'bookcaseClosedWide', source: 'kenney-furniture', dimensionsCm: [132, 38, 172] },
    { id: 'bookcaseOpen', source: 'kenney-furniture', dimensionsCm: [84, 36, 172] },
    { id: 'bookcaseOpenLow', source: 'kenney-furniture', dimensionsCm: [92, 36, 86] },
    { id: 'cabinetTelevision', source: 'kenney-furniture', dimensionsCm: [160, 42, 54] },
    { id: 'cabinetTelevisionDoors', source: 'kenney-furniture', dimensionsCm: [160, 42, 58] },
    { id: 'kitchenCabinet', source: 'kenney-furniture', dimensionsCm: [80, 60, 90] },
    { id: 'kitchenCabinetDrawer', source: 'kenney-furniture', dimensionsCm: [80, 60, 90] },
    { id: 'kitchenCabinetUpper', source: 'kenney-furniture', dimensionsCm: [80, 34, 72] },
    { id: 'kitchenCabinetUpperDouble', source: 'kenney-furniture', dimensionsCm: [120, 34, 72] },
    { id: 'kitchenCabinetUpperLow', source: 'kenney-furniture', dimensionsCm: [80, 34, 46] },
    { id: 'GothicCabinet_01' },
    { id: 'ClassicConsole_01' },
    { id: 'ClassicNightstand_01' },
    { id: 'painted_wooden_shelves' },
    { id: 'Shelf_01' },
    { id: 'chinese_cabinet' },
    { id: 'wooden_bookshelf_worn' },
    { id: 'drawer_cabinet' },
    { id: 'wooden_display_shelves_01' },
    { id: 'steel_frame_shelves_01' },
    { id: 'painted_wooden_cabinet' },
    { id: 'painted_wooden_nightstand' },
    { id: 'steel_frame_shelves_02' },
    { id: 'painted_wooden_cabinet_02' },
    { id: 'steel_frame_shelves_03' },
    { id: 'GothicCommode_01' },
    { id: 'vintage_cabinet_01' },
    { id: 'vintage_wooden_drawer_01' },
    { id: 'modern_wooden_cabinet' },
    { id: 'chinese_commode' },
  ],
  decor: [
    { id: 'rugRectangle', source: 'kenney-furniture', dimensionsCm: [160, 110, 3] },
    { id: 'rugRound', source: 'kenney-furniture', dimensionsCm: [130, 130, 3] },
    { id: 'pottedPlant', source: 'kenney-furniture', dimensionsCm: [38, 38, 76] },
    { id: 'plantSmall1', source: 'kenney-furniture', dimensionsCm: [26, 26, 42] },
    { id: 'plantSmall2', source: 'kenney-furniture', dimensionsCm: [26, 26, 42] },
    { id: 'plantSmall3', source: 'kenney-furniture', dimensionsCm: [26, 26, 42] },
    { id: 'coatRackStanding', source: 'kenney-furniture', dimensionsCm: [52, 52, 176] },
    { id: 'pillow', source: 'kenney-furniture', dimensionsCm: [55, 18, 35] },
    { id: 'pillowLong', source: 'kenney-furniture', dimensionsCm: [78, 18, 32] },
    { id: 'chinese_screen_panels', dimensionsCm: [160, 12, 180] },
    { id: 'potted_plant_01' },
    { id: 'potted_plant_02' },
    { id: 'potted_plant_04' },
    { id: 'ornate_mirror_01' },
  ],
  lighting: [
    { id: 'lampSquareCeiling', source: 'kenney-furniture', dimensionsCm: [48, 48, 18] },
    { id: 'lampSquareFloor', source: 'kenney-furniture', dimensionsCm: [38, 38, 160] },
    { id: 'lampRoundFloor', source: 'kenney-furniture', dimensionsCm: [38, 38, 160] },
    { id: 'lampSquareTable', source: 'kenney-furniture', dimensionsCm: [28, 28, 48] },
    { id: 'lampRoundTable', source: 'kenney-furniture', dimensionsCm: [28, 28, 48] },
    { id: 'lampWall', source: 'kenney-furniture', dimensionsCm: [18, 16, 32] },
    { id: 'industrial_wall_sconce' },
    { id: 'caged_hanging_light' },
    { id: 'industrial_wall_lamp' },
    { id: 'hanging_industrial_lamp' },
    { id: 'industrial_pipe_lamp' },
    { id: 'desk_lamp_arm_01' },
    { id: 'modern_ceiling_lamp_01' },
  ],
  appliance: [
    { id: 'televisionModern', source: 'kenney-furniture', dimensionsCm: [120, 12, 70] },
    { id: 'laptop', source: 'kenney-furniture', dimensionsCm: [32, 22, 3] },
    { id: 'computerScreen', source: 'kenney-furniture', dimensionsCm: [54, 18, 36] },
    { id: 'kitchenFridge', source: 'kenney-furniture', dimensionsCm: [70, 72, 180] },
    { id: 'kitchenFridgeLarge', source: 'kenney-furniture', dimensionsCm: [90, 78, 180] },
    { id: 'kitchenMicrowave', source: 'kenney-furniture', dimensionsCm: [52, 42, 32] },
    { id: 'kitchenStoveElectric', source: 'kenney-furniture', dimensionsCm: [60, 60, 90] },
    { id: 'hoodModern', source: 'kenney-furniture', dimensionsCm: [80, 45, 50] },
    { id: 'washer', source: 'kenney-furniture', dimensionsCm: [60, 65, 85] },
    { id: 'dryer', source: 'kenney-furniture', dimensionsCm: [60, 65, 85] },
    { id: 'washerDryerStacked', source: 'kenney-furniture', dimensionsCm: [60, 65, 170] },
    { id: 'radio', source: 'kenney-furniture', dimensionsCm: [42, 18, 28] },
    { id: 'speaker', source: 'kenney-furniture', dimensionsCm: [22, 22, 90] },
    { id: 'speakerSmall', source: 'kenney-furniture', dimensionsCm: [18, 18, 42] },
  ],
  bed: [
    { id: 'bedSingle', source: 'kenney-furniture', dimensionsCm: [105, 210, 70] },
    { id: 'bedDouble', source: 'kenney-furniture', dimensionsCm: [160, 210, 75] },
    { id: 'bedBunk', source: 'kenney-furniture', dimensionsCm: [105, 210, 160] },
    { id: 'GothicBed_01' },
  ],
  pets: [],
}

const brandsByCategory: Record<ProductCategory, string[]> = {
  sofa: ['LIVART', 'Jackson Chameleon', 'HANSSEM', 'VILLA RECORDS'],
  chair: ['SIDIZ', 'iloom', 'MARKET B', 'DESKER', 'LIVART'],
  table: ['MARKET B', 'LIVART', 'DESKER', 'VILLA RECORDS', 'HANSSEM'],
  storage: ['MARKET B', 'iloom', 'LIVART', 'HANSSEM', 'DESKER'],
  decor: ['VILLA RECORDS', 'MARKET B', 'Ohouse'],
  lighting: ['MARKET B', 'Jackson Chameleon', 'Ohouse'],
  appliance: ['Ohouse'],
  bed: ['iloom', 'LIVART', 'HANSSEM'],
  pets: ['iloom'],
}

function modelUrlFor(id: string, source: ProductAssetSource) {
  if (source === 'khronos') {
    return `/assets/models/${id}.optimized.glb`
  }

  if (source === 'kenney-furniture') {
    return `/assets/models/kenney/furniture/${id}.optimized.glb`
  }

  return `/assets/models/polyhaven/${id}.optimized.glb`
}

function toItem(category: ProductCategory, seed: ProductCatalogSeed, index: number): ProductCatalogItem {
  const brandPool = brandsByCategory[category]
  const source = seed.source ?? 'polyhaven'

  return {
    id: seed.id,
    brand: source === 'khronos' ? 'Ohouse' : source === 'kenney-furniture' ? 'Kenney' : brandPool[index % brandPool.length],
    category,
    source,
    modelUrl: modelUrlFor(seed.id, source),
    thumbnailUrl: `/assets/model-thumbnails/${seed.id}.png`,
    dimensionsCm: seed.dimensionsCm ?? dimensionByCategory[category],
  }
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = Object.entries(modelSeedsByCategory).flatMap(
  ([category, seeds]) => seeds.map((seed, index) => toItem(category as ProductCategory, seed, index)),
)

export const PRODUCT_BY_MODEL_URL = new Map(PRODUCT_CATALOG.map((item) => [item.modelUrl, item]))
