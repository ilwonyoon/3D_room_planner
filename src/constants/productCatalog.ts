import { modelUrlWithBestVariant, modelVariantUrlsFor } from './modelVariants'
import {
  manualModelSeedsByCategory,
  manualRetailAliasById,
} from './manualProductCatalog.generated'
import { RUG_CATALOG } from './rugCatalog'

export type ProductCategory =
  | 'sofa'
  | 'chair'
  | 'table'
  | 'storage'
  | 'rug'
  | 'decor'
  | 'lighting'
  | 'appliance'
  | 'bed'
  | 'pets'

export type ProductAssetSource = 'polyhaven' | 'khronos' | 'sharetextures' | 'objaverse' | 'manual' | 'procedural'
export type ProductRenderCost = 'standard' | 'heavy'

export type ProductCatalogItem = {
  id: string
  name: string
  brand: string
  category: ProductCategory
  source: ProductAssetSource
  renderCost: ProductRenderCost
  modelUrl: string
  sourceModelUrl: string
  runtimeModelUrl?: string
  heroModelUrl?: string
  thumbnailUrl: string
  dimensionsCm: [number, number, number]
}

export type ProductCatalogSeed = {
  id: string
  source?: ProductAssetSource
  dimensionsCm?: [number, number, number]
}

export type ProductRetailAlias = {
  brand: string
  name: string
}

const dimensionByCategory: Record<ProductCategory, [number, number, number]> = {
  sofa: [210, 86, 92],
  chair: [82, 78, 88],
  table: [120, 68, 42],
  storage: [120, 44, 92],
  rug: [240, 160, 2],
  decor: [46, 34, 62],
  lighting: [36, 36, 82],
  appliance: [84, 32, 72],
  bed: [210, 164, 94],
  pets: [64, 48, 48],
}

const baseModelSeedsByCategory: Record<ProductCategory, ProductCatalogSeed[]> = {
  sofa: [
    { id: 'sheen-wood-leather-sofa', source: 'khronos', dimensionsCm: [210, 86, 92] },
    { id: 'sharetextures-bench-32', source: 'sharetextures', dimensionsCm: [150, 52, 72] },
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
    { id: 'sharetextures-chair-25', source: 'sharetextures', dimensionsCm: [50, 54, 82] },
    { id: 'sharetextures-chair-26', source: 'sharetextures', dimensionsCm: [50, 54, 82] },
    { id: 'sharetextures-chair-27', source: 'sharetextures', dimensionsCm: [50, 54, 82] },
    { id: 'sharetextures-chair-28', source: 'sharetextures', dimensionsCm: [50, 54, 82] },
    { id: 'sharetextures-chair-29', source: 'sharetextures', dimensionsCm: [54, 58, 82] },
    { id: 'sharetextures-stool-5', source: 'sharetextures', dimensionsCm: [42, 42, 48] },
    { id: 'sharetextures-stool-7', source: 'sharetextures', dimensionsCm: [42, 42, 48] },
    { id: 'sharetextures-stool-8', source: 'sharetextures', dimensionsCm: [42, 42, 48] },
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
    { id: 'sharetextures-cabinet-3', source: 'sharetextures', dimensionsCm: [80, 42, 112] },
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
  rug: [],
  decor: [
    { id: 'chinese_screen_panels', dimensionsCm: [160, 12, 180] },
    { id: 'potted_plant_01' },
    { id: 'potted_plant_02' },
    { id: 'potted_plant_04' },
    { id: 'pachira_aquatica_01', dimensionsCm: [58, 58, 150] },
    { id: 'planter_box_01', dimensionsCm: [72, 28, 42] },
    { id: 'planter_box_02', dimensionsCm: [72, 28, 42] },
    { id: 'planter_box_03', dimensionsCm: [72, 28, 42] },
    { id: 'planter_pot_clay', dimensionsCm: [34, 34, 44] },
    { id: 'ornate_mirror_01' },
    { id: 'fancy_picture_frame_01', dimensionsCm: [52, 5, 72] },
    { id: 'fancy_picture_frame_02', dimensionsCm: [52, 5, 72] },
    { id: 'hanging_picture_frame_01', dimensionsCm: [48, 5, 64] },
    { id: 'hanging_picture_frame_02', dimensionsCm: [48, 5, 64] },
    { id: 'hanging_picture_frame_03', dimensionsCm: [48, 5, 64] },
    { id: 'standing_picture_frame_01', dimensionsCm: [42, 10, 54] },
    { id: 'standing_picture_frame_02', dimensionsCm: [42, 10, 54] },
    { id: 'ceramic_vase_01', dimensionsCm: [26, 26, 46] },
    { id: 'ceramic_vase_02', dimensionsCm: [24, 24, 42] },
    { id: 'ceramic_vase_03', dimensionsCm: [24, 24, 42] },
    { id: 'ceramic_vase_04', dimensionsCm: [24, 24, 42] },
    { id: 'brass_vase_01', dimensionsCm: [22, 22, 38] },
    { id: 'brass_vase_02', dimensionsCm: [22, 22, 38] },
    { id: 'brass_vase_03', dimensionsCm: [22, 22, 38] },
    { id: 'brass_vase_04', dimensionsCm: [22, 22, 38] },
    { id: 'book_encyclopedia_set_01', dimensionsCm: [46, 24, 22] },
    { id: 'alarm_clock_01', dimensionsCm: [22, 10, 22] },
    { id: 'mantel_clock_01', dimensionsCm: [32, 14, 36] },
    { id: 'vintage_telephone_wall_clock', dimensionsCm: [34, 9, 58] },
    { id: 'dartboard', dimensionsCm: [46, 5, 46] },
  ],
  lighting: [
    { id: 'industrial_wall_sconce' },
    { id: 'caged_hanging_light' },
    { id: 'industrial_wall_lamp' },
    { id: 'hanging_industrial_lamp' },
    { id: 'industrial_pipe_lamp' },
    { id: 'desk_lamp_arm_01' },
    { id: 'modern_ceiling_lamp_01' },
  ],
  appliance: [],
  bed: [
    { id: 'objaverse-messy-bed-2', source: 'objaverse', dimensionsCm: [222, 170, 96] },
    { id: 'objaverse-soho-bed', source: 'objaverse', dimensionsCm: [218, 180, 98] },
    { id: 'objaverse-chelsea-storage-bed', source: 'objaverse', dimensionsCm: [218, 180, 104] },
    { id: 'objaverse-bed-0101', source: 'objaverse', dimensionsCm: [222, 185, 88] },
    { id: 'objaverse-king-floor-bed', source: 'objaverse', dimensionsCm: [224, 200, 70] },
    { id: 'objaverse-large-grantham-bed', source: 'objaverse', dimensionsCm: [230, 190, 142] },
    { id: 'GothicBed_01' },
  ],
  pets: [],
}

const highTierOnlyModelIds = new Set([
  'book_encyclopedia_set_01',
  'polyhaven-caban-boucle-rug',
  'polyhaven-floral-jacquard-rug',
  'polyhaven-quatrefoil-jacquard-rug',
  'polyhaven-wool-boucle-round-rug',
  'industrial_wall_lamp',
  'pachira_aquatica_01',
  'potted_plant_01',
  'potted_plant_02',
  'sheen-chair',
  'sheen-wood-leather-sofa',
  'vintage_cabinet_01',
])

const brandsByCategory: Record<ProductCategory, string[]> = {
  sofa: ['LIVART', 'Jackson Chameleon', 'HANSSEM', 'VILLA RECORDS'],
  chair: ['SIDIZ', 'iloom', 'MARKET B', 'DESKER', 'LIVART'],
  table: ['MARKET B', 'LIVART', 'DESKER', 'VILLA RECORDS', 'HANSSEM'],
  storage: ['MARKET B', 'iloom', 'LIVART', 'HANSSEM', 'DESKER'],
  rug: ['Ferm Living', 'Menu', 'HAY', 'Normann Copenhagen'],
  decor: ['VILLA RECORDS', 'MARKET B', 'Ohouse'],
  lighting: ['MARKET B', 'Jackson Chameleon', 'Ohouse'],
  appliance: ['Ohouse'],
  bed: ['iloom', 'LIVART', 'HANSSEM'],
  pets: ['iloom'],
}

// Retail aliases make catalog cards read like real products; they do not imply the GLB is the exact branded product.
const retailAliasById: Record<string, ProductRetailAlias> = {
  'sheen-wood-leather-sofa': { brand: 'Audo Copenhagen', name: 'Pagode Sofa' },
  'sharetextures-bench-32': { brand: 'HAY', name: 'Triangle Leg Bench' },
  Sofa_01: { brand: 'Muuto', name: 'Outline Sofa' },
  sofa_02: { brand: 'Audo Copenhagen', name: 'Eave Modular Sofa' },
  sofa_03: { brand: 'Herman Miller', name: 'Eames Sofa Compact' },
  chinese_sofa: { brand: 'Roche Bobois', name: 'Mah Jong Sofa' },
  painted_wooden_sofa: { brand: 'IKEA', name: 'STOCKHOLM 2025 Bench' },
  painted_wooden_bench: { brand: 'HAY', name: 'Palissade Bench' },
  Ottoman_01: { brand: 'Audo Copenhagen', name: 'Brasilia Ottoman' },

  'sheen-chair': { brand: 'Herman Miller', name: 'Eames Aluminum Group Lounge Chair' },
  'sharetextures-chair-25': { brand: 'HAY', name: 'About A Chair AAC 22' },
  'sharetextures-chair-26': { brand: 'Audo Copenhagen', name: 'Harbour Side Chair' },
  'sharetextures-chair-27': { brand: 'Muuto', name: 'Fiber Armchair' },
  'sharetextures-chair-28': { brand: 'Audo Copenhagen', name: 'Ready Dining Chair' },
  'sharetextures-chair-29': { brand: 'HAY', name: 'About A Chair AAC 26' },
  'sharetextures-stool-5': { brand: 'Audo Copenhagen', name: 'Passage Stool' },
  'sharetextures-stool-7': { brand: 'Audo Copenhagen', name: 'Afteroom Stool' },
  'sharetextures-stool-8': { brand: 'HAY', name: 'Revolver Stool' },
  modern_arm_chair_01: { brand: 'Audo Copenhagen', name: 'Brasilia Lounge Chair' },
  ArmChair_01: { brand: 'Audo Copenhagen', name: 'Ingeborg Lounge Chair' },
  mid_century_lounge_chair: { brand: 'Herman Miller', name: 'Eames Lounge Chair and Ottoman' },
  plastic_monobloc_chair_01: { brand: 'Kartell', name: 'Generic A Chair' },
  bar_chair_round_01: { brand: 'Audo Copenhagen', name: 'Afteroom Bar & Counter Chair' },
  SchoolChair_01: { brand: 'Muuto', name: 'Nerd Chair' },
  Rockingchair_01: { brand: 'Vitra', name: 'Eames Plastic Armchair RAR' },
  painted_wooden_chair_01: { brand: 'IKEA', name: 'STOCKHOLM 2025 Chair' },
  painted_wooden_chair_02: { brand: 'IKEA', name: 'LISABO Chair' },
  BarberShopChair_01: { brand: 'Takara Belmont', name: 'Apollo 2 Barber Chair' },
  chinese_stool: { brand: 'Audo Copenhagen', name: 'Passage Stool' },
  gallinera_chair: { brand: 'Audo Copenhagen', name: 'The Penguin Dining Chair' },
  dining_chair_02: { brand: 'Audo Copenhagen', name: 'Co Dining Chair' },
  folding_wooden_stool: { brand: 'IKEA', name: 'TERJE Folding Chair' },
  metal_stool_01: { brand: 'HAY', name: 'Revolver Bar Stool' },
  metal_stool_02: { brand: 'Audo Copenhagen', name: 'Afteroom Bar & Counter Chair' },
  chinese_armchair: { brand: 'Audo Copenhagen', name: 'Knitting Lounge Chair' },
  GreenChair_01: { brand: 'Audo Copenhagen', name: 'Tearoom Chair, With Loose Cover' },
  WoodenChair_01: { brand: 'HAY', name: 'Rey Chair' },
  painted_wooden_stool: { brand: 'IKEA', name: 'KYRRE Stool' },
  wooden_stool_01: { brand: 'Audo Copenhagen', name: 'Passage Stool' },
  wooden_stool_02: { brand: 'HAY', name: 'Nelson X-Leg Stool' },

  CoffeeCart_01: { brand: 'Audo Copenhagen', name: 'Barboy Trolley' },
  CoffeeTable_01: { brand: 'HAY', name: 'Kofi Coffee Table' },
  modern_coffee_table_01: { brand: 'Muuto', name: 'Workshop Coffee Table' },
  modern_coffee_table_02: { brand: 'Muuto', name: 'Couple Coffee Table' },
  gothic_coffee_table: { brand: 'Audo Copenhagen', name: 'Marble Plinth Low' },
  gallinera_table: { brand: 'HAY', name: 'Triangle Leg Table' },
  painted_wooden_table: { brand: 'IKEA', name: 'LISTERBY Coffee Table' },
  small_wooden_table_01: { brand: 'IKEA', name: 'LISTERBY Side Table' },
  wooden_picnic_table: { brand: 'HAY', name: 'Palissade Dining Bench' },
  wooden_table_02: { brand: 'HAY', name: 'Tray Table' },
  metal_office_desk: { brand: 'Vitsoe', name: '606 Desk Shelf' },
  chinese_console_table: { brand: 'Audo Copenhagen', name: 'Androgyne Console Table' },
  WoodenTable_01: { brand: 'IKEA', name: 'STOCKHOLM Coffee Table' },
  WoodenTable_02: { brand: 'IKEA', name: 'STOCKHOLM 2025 Coffee Table' },
  WoodenTable_03: { brand: 'IKEA', name: 'LISTERBY Coffee Table' },
  coffee_table_round_01: { brand: 'HAY', name: 'Slit Table Round 65' },
  industrial_coffee_table: { brand: 'Audo Copenhagen', name: 'Androgyne Lounge Table' },
  SchoolDesk_01: { brand: 'Vitsoe', name: '606 Table Shelf' },
  round_wooden_table_01: { brand: 'HAY', name: 'Slit Table Wood Round 45' },
  round_wooden_table_02: { brand: 'HAY', name: 'Slit Table Wood Round 65' },
  chinese_tea_table: { brand: 'Audo Copenhagen', name: 'Androgyne Side Table' },
  side_table_01: { brand: 'HAY', name: 'Slit Table Round 35' },
  side_table_tall_01: { brand: 'HAY', name: 'Tray Table Medium' },
  outdoor_table_chair_set_01: { brand: 'HAY', name: 'Palissade Dining Set' },

  'sharetextures-cabinet-3': { brand: 'Muuto', name: 'Stacked Storage System' },
  GothicCabinet_01: { brand: 'Audo Copenhagen', name: 'Crescent Shelving' },
  ClassicConsole_01: { brand: 'Audo Copenhagen', name: 'Androgyne Sideboard' },
  ClassicNightstand_01: { brand: 'Vitsoe', name: '606 Two Drawer Cabinet' },
  painted_wooden_shelves: { brand: 'IKEA', name: 'IVAR Shelving Unit' },
  Shelf_01: { brand: 'IKEA', name: 'BILLY Bookcase' },
  chinese_cabinet: { brand: 'Vitsoe', name: '606 Cabinet System' },
  wooden_bookshelf_worn: { brand: 'IKEA', name: 'BILLY Bookcase With Glass Doors' },
  drawer_cabinet: { brand: 'IKEA', name: 'MALM Chest of 3 Drawers' },
  wooden_display_shelves_01: { brand: 'Vitsoe', name: '606 Universal Shelving System' },
  steel_frame_shelves_01: { brand: 'Audo Copenhagen', name: 'Crescent Shelving' },
  painted_wooden_cabinet: { brand: 'IKEA', name: 'HAVSTA Cabinet' },
  painted_wooden_nightstand: { brand: 'IKEA', name: 'HEMNES Nightstand' },
  steel_frame_shelves_02: { brand: 'Audo Copenhagen', name: 'Corbel Shelf' },
  painted_wooden_cabinet_02: { brand: 'IKEA', name: 'IDANAS Cabinet' },
  steel_frame_shelves_03: { brand: 'Muuto', name: 'Compile Shelving System' },
  GothicCommode_01: { brand: 'Audo Copenhagen', name: 'Collector Sideboard' },
  vintage_cabinet_01: { brand: 'Vitsoe', name: '606 Sideboard Cabinet' },
  vintage_wooden_drawer_01: { brand: 'IKEA', name: 'MALM Chest of 6 Drawers' },
  modern_wooden_cabinet: { brand: 'Muuto', name: 'Enfold Sideboard' },
  chinese_commode: { brand: 'Audo Copenhagen', name: 'Collector Cabinet' },

  chinese_screen_panels: { brand: 'HAY', name: 'Knit Room Divider' },
  potted_plant_01: { brand: 'Ferm Living', name: 'Plant Box' },
  potted_plant_02: { brand: 'Ferm Living', name: 'Stone Plant Box With Shelf' },
  potted_plant_04: { brand: 'Ferm Living', name: 'Plant Box Round' },
  pachira_aquatica_01: { brand: 'Ferm Living', name: 'Lager Plant Box With Shelf' },
  planter_box_01: { brand: 'Ferm Living', name: 'Plant Box' },
  planter_box_02: { brand: 'Ferm Living', name: 'Lager Plant Box With Shelf' },
  planter_box_03: { brand: 'Ferm Living', name: 'Stone Plant Box With Shelf' },
  planter_pot_clay: { brand: 'Georg Jensen', name: 'Bloom Botanica Flower Pot' },
  ornate_mirror_01: { brand: 'Ferm Living', name: 'Pond Mirror XL' },
  fancy_picture_frame_01: { brand: 'Moebe', name: 'Frame Oak A3' },
  fancy_picture_frame_02: { brand: 'Moebe', name: 'Frame Black A3' },
  hanging_picture_frame_01: { brand: 'Moebe', name: 'Frame A5' },
  hanging_picture_frame_02: { brand: 'Moebe', name: 'Frame A4' },
  hanging_picture_frame_03: { brand: 'Moebe', name: 'Frame A3' },
  standing_picture_frame_01: { brand: 'Moebe', name: 'Standing Frame A5' },
  standing_picture_frame_02: { brand: 'Moebe', name: 'Standing Frame A4' },
  ceramic_vase_01: { brand: 'Ferm Living', name: 'Nium Vase' },
  ceramic_vase_02: { brand: 'Ferm Living', name: 'Fountain Vase Small' },
  ceramic_vase_03: { brand: 'Ferm Living', name: 'Dedali Vase Small' },
  ceramic_vase_04: { brand: 'Ferm Living', name: 'Moire Vase Small' },
  brass_vase_01: { brand: 'Georg Jensen', name: 'Bloom Botanica Vase Small' },
  brass_vase_02: { brand: 'Georg Jensen', name: 'Bloom Botanica Vase Medium' },
  brass_vase_03: { brand: 'Georg Jensen', name: 'Bloom Botanica Vase Large' },
  brass_vase_04: { brand: 'Iittala', name: 'Alvar Aalto Vase' },
  book_encyclopedia_set_01: { brand: 'Taschen', name: 'Decorative Art 60s Book Set' },
  alarm_clock_01: { brand: 'Braun', name: 'BC02 Alarm Clock' },
  mantel_clock_01: { brand: 'Braun', name: 'BC22 Classic Alarm Clock' },
  vintage_telephone_wall_clock: { brand: 'Braun', name: 'BC17 Wall Clock' },
  dartboard: { brand: 'Winmau', name: 'Blade 6 Dartboard' },

  industrial_wall_sconce: { brand: 'IKEA', name: 'HEKTAR Wall Lamp' },
  caged_hanging_light: { brand: 'HAY', name: 'Nelson Bubble Lamp Ball Pendant' },
  industrial_wall_lamp: { brand: 'IKEA', name: 'RANARP Wall/Clamp Spotlight' },
  hanging_industrial_lamp: { brand: 'IKEA', name: 'RANARP Pendant Lamp' },
  industrial_pipe_lamp: { brand: 'IKEA', name: 'HEKTAR Floor Lamp' },
  desk_lamp_arm_01: { brand: 'IKEA', name: 'RANARP Work Lamp' },
  modern_ceiling_lamp_01: { brand: 'Audo Copenhagen', name: 'Levitate Pendant' },

  'objaverse-messy-bed-2': { brand: 'Blu Dot', name: 'Nook Bed' },
  'objaverse-soho-bed': { brand: 'BertO', name: 'Soho Bed' },
  'objaverse-chelsea-storage-bed': { brand: 'BertO', name: 'Chelsea Storage Bed' },
  'objaverse-bed-0101': { brand: 'RH Modern', name: 'Modena Shelter Bed' },
  'objaverse-king-floor-bed': { brand: 'Thuma', name: 'The Bed' },
  'objaverse-large-grantham-bed': { brand: 'Dantone Home', name: 'Grantham Bed' },
  GothicBed_01: { brand: 'IKEA', name: 'MALM Bed Frame' },
}

const modelSeedsByCategory: Record<ProductCategory, ProductCatalogSeed[]> = Object.fromEntries(
  Object.entries(baseModelSeedsByCategory).map(([category, seeds]) => [
    category,
    [...seeds, ...(manualModelSeedsByCategory[category as ProductCategory] ?? [])],
  ]),
) as Record<ProductCategory, ProductCatalogSeed[]>

const productRetailAliasById: Record<string, ProductRetailAlias> = {
  ...retailAliasById,
  ...manualRetailAliasById,
}

const productNameOverrides: Record<string, string> = {
  'sheen-chair': 'Sheen Chair',
  'sheen-wood-leather-sofa': 'Wood Leather Sofa',
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length <= 2 && /^\d+$/.test(word) ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ')
}

function productNameFor(id: string) {
  if (productNameOverrides[id]) {
    return productNameOverrides[id]
  }

  const readable = id
    .replace(/^sharetextures-/, '')
    .replace(/^objaverse-/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b0+(\d+)\b/g, '$1')
    .toLowerCase()

  return titleCase(readable)
}

function modelUrlFor(id: string, source: ProductAssetSource) {
  if (source === 'khronos') {
    return `/assets/models/${id}.optimized.glb`
  }

  if (source === 'sharetextures') {
    return `/assets/models/sharetextures/${id}.optimized.glb`
  }

  if (source === 'objaverse') {
    return `/assets/models/objaverse/${id}.optimized.glb`
  }

  if (source === 'manual') {
    return `/assets/models/manual/${id}.optimized.glb`
  }

  if (source === 'procedural') {
    return `/procedural/${id}`
  }

  return `/assets/models/polyhaven/${id}.optimized.glb`
}

function lightingDimensionsFor(id: string, resolvedName: string): [number, number, number] | null {
  const text = `${id} ${resolvedName}`.toLowerCase()

  if (text.includes('floor')) {
    return [48, 48, 160]
  }

  if (text.includes('wall') || text.includes('sconce')) {
    return [26, 22, 52]
  }

  if (text.includes('pendant') || text.includes('suspension') || text.includes('rail') || text.includes('chandelier')) {
    return [72, 72, 68]
  }

  if (text.includes('desk') || text.includes('table') || text.includes('lamp')) {
    return [34, 34, 52]
  }

  return null
}

function toItem(category: ProductCategory, seed: ProductCatalogSeed, index: number): ProductCatalogItem {
  const brandPool = brandsByCategory[category]
  const source = seed.source ?? 'polyhaven'
  const retailAlias = productRetailAliasById[seed.id]
  const resolvedName = retailAlias?.name ?? productNameFor(seed.id)
  const inferredLightingDimensions = category === 'lighting' ? lightingDimensionsFor(seed.id, resolvedName) : null
  const resolvedDimensions =
    category === 'lighting'
      ? inferredLightingDimensions ?? seed.dimensionsCm ?? dimensionByCategory[category]
      : seed.dimensionsCm ?? dimensionByCategory[category]

  const sourceModelUrl = modelUrlFor(seed.id, source)
  const variantUrls = modelVariantUrlsFor(sourceModelUrl)

  return {
    id: seed.id,
    name: resolvedName,
    brand:
      retailAlias?.brand ??
      (source === 'khronos'
        ? 'Ohouse'
        : source === 'sharetextures'
          ? 'ShareTextures'
          : source === 'objaverse'
            ? 'Objaverse'
            : source === 'manual'
              ? 'Manual Import'
            : source === 'procedural'
                ? 'Product Source'
              : brandPool[index % brandPool.length]),
    category,
    source,
    renderCost: highTierOnlyModelIds.has(seed.id) ? 'heavy' : 'standard',
    modelUrl: modelUrlWithBestVariant(sourceModelUrl),
    ...variantUrls,
    thumbnailUrl: `/assets/model-thumbnails/${seed.id}.png`,
    dimensionsCm: resolvedDimensions,
  }
}

const generatedProductCatalog: ProductCatalogItem[] = Object.entries(modelSeedsByCategory).flatMap(
  ([category, seeds]) => seeds.map((seed, index) => toItem(category as ProductCategory, seed, index)),
)

const rugCatalogItems: ProductCatalogItem[] = RUG_CATALOG.map((item) => ({
  id: item.id,
  name: item.name,
  brand: item.brand,
  category: 'rug',
  source: 'procedural',
  renderCost: highTierOnlyModelIds.has(item.id) ? 'heavy' : 'standard',
  modelUrl: item.modelUrl,
  sourceModelUrl: item.modelUrl,
  thumbnailUrl: item.thumbnailUrl,
  dimensionsCm: item.dimensionsCm,
}))

export const PRODUCT_CATALOG: ProductCatalogItem[] = [...generatedProductCatalog, ...rugCatalogItems]

export const PRODUCT_BY_ID = new Map(PRODUCT_CATALOG.map((item) => [item.id, item]))
export const PRODUCT_BY_MODEL_URL = new Map(
  PRODUCT_CATALOG.flatMap((item) =>
    [item.modelUrl, item.sourceModelUrl, item.runtimeModelUrl, item.heroModelUrl]
      .filter((url): url is string => Boolean(url))
      .map((url) => [url, item] as const),
  ),
)
