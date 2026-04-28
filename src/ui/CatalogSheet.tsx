import { Fragment, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode, WheelEvent } from 'react'
import {
  ROOM_SETTINGS_BY_MODEL_URL,
  ROOM_SETTINGS_CATALOG,
  type RoomMaterialItem,
  type RoomModelItem,
  type RoomSettingsCategory,
  type RoomSettingsItem,
} from '@/constants/environmentCatalog'
import {
  PRODUCT_BY_ID,
  PRODUCT_BY_MODEL_URL,
  PRODUCT_CATALOG,
  type ProductAssetSource,
  type ProductCatalogItem,
  type ProductCategory,
} from '@/constants/productCatalog'
import { color, css, fontFamily, radius, shadow, text, zIndex } from '@/constants'
import {
  useCameraViewStore,
  useEditorObjectsStore,
  useRenderQualityStore,
  useRoomSettingsStore,
  useRoomStore,
  useSelectionStore,
  useUiStore,
} from '@/store'
import type { EditorObject } from '@/store/editorObjectsStore'
import type { RenderQuality } from '@/store/renderQualityStore'

type SheetSegment = 'product' | 'room-settings' | 'explore'
type FilterId = 'search' | 'in-room' | 'saved' | ProductCategory
type RoomFilterId = 'wall-materials' | 'floor-materials' | 'windows' | 'doors' | 'wall-decor' | 'decor'

type Chip = {
  id: FilterId
  label: string
  category?: ProductCategory
}

type RoomChip = {
  id: RoomFilterId
  label: string
  category: RoomSettingsCategory
}

type CardTile = {
  id: string
  brand: string
  thumbnailUrl: string
  displayDimensions: string
  imageFit?: 'contain' | 'cover'
  selected?: boolean
  ariaLabel?: string
}

type ProductTile = ProductCatalogItem & {
  placedObjectId?: string
  displayDimensions: string
  ariaLabel?: string
}

type SelectedProductContext = {
  object: EditorObject
  item: ProductCatalogItem
  candidates: ProductCatalogItem[]
}

type RoomSettingsTile = CardTile & {
  item: RoomSettingsItem
}

type ExploreFeedItem = {
  id: string
  author: string
  timeAgo: string
  imageUrl: string
  title: string
  description: string
  likes: number
  comments: number
  views: number
  shares: number
  remixes: number
  commentAuthor: string
  commentText: string
  info: string
}

type SheetPointerState = {
  pointerId: number
  startY: number
  lastY: number
  dragged: boolean
}

const SHEET_HEIGHT = 705
const COLLAPSED_VISIBLE_HEIGHT = 162
const COLLAPSED_OFFSET = SHEET_HEIGHT - COLLAPSED_VISIBLE_HEIGHT
const DRAG_THRESHOLD = 36
const SHEET_SIDE_PADDING = 16
const SECTION_GAP = 12
const CHIPS_HEIGHT = 54
const TOP_TABS_HEIGHT = 44
const CHIP_BUTTON_HEIGHT = 30
const EDIT_CONTEXT_RAIL_TILE_SIZE = 72
const EDIT_CONTEXT_RAIL_PADDING_Y = 12
const EDIT_CONTEXT_RAIL_HEIGHT = EDIT_CONTEXT_RAIL_TILE_SIZE + EDIT_CONTEXT_RAIL_PADDING_Y * 2
const EDIT_CONTEXT_CARD_HEIGHT = 88
const EDIT_CONTEXT_CARD_BOTTOM = 28
const EDIT_CONTEXT_MODULE_GAP = 3
const CHIP_FONT_FAMILY = fontFamily.text
const EXPLORE_FEED_LETTER_SPACING = '-0.4px'

const chips: Chip[] = [
  { id: 'search', label: 'Search' },
  { id: 'in-room', label: 'In this room' },
  { id: 'saved', label: 'Saved' },
  { id: 'table', label: 'Table', category: 'table' },
  { id: 'storage', label: 'Drawers', category: 'storage' },
  { id: 'rug', label: 'Rug', category: 'rug' },
  { id: 'decor', label: 'Deco', category: 'decor' },
  { id: 'chair', label: 'Chair', category: 'chair' },
  { id: 'bed', label: 'Bed', category: 'bed' },
  { id: 'sofa', label: 'Sofa', category: 'sofa' },
  { id: 'lighting', label: 'Light', category: 'lighting' },
  { id: 'appliance', label: 'Electronics', category: 'appliance' },
  { id: 'pets', label: 'Pets', category: 'pets' },
]

const chairScenarioPriority = [
  'dimensiva-plan-chair-by-fredericia',
  'GreenChair_01',
  'designconnected-roly-poly-chair-8816',
  'dimensiva-roly-poly-chair-by-driade',
  'zeel-by-furniture-blown-armchair',
  'mid_century_lounge_chair',
  'WoodenChair_01',
  'modern_arm_chair_01',
  'ArmChair_01',
  'BarberShopChair_01',
  'Rockingchair_01',
  'dining_chair_02',
  'painted_wooden_chair_01',
  'painted_wooden_chair_02',
  'dimensiva-eames-armchair-rocker-rar-by-vitra',
  'sheen-chair',
]
const chairScenarioPriorityRank = new Map(chairScenarioPriority.map((id, index) => [id, index]))

function chairScenarioRank(item: Pick<ProductCatalogItem, 'id' | 'category' | 'source'>) {
  if (item.category !== 'chair') {
    return Number.MAX_SAFE_INTEGER
  }

  const explicitRank = chairScenarioPriorityRank.get(item.id)
  if (explicitRank !== undefined) {
    return explicitRank
  }

  if (item.source === 'manual') {
    return 200
  }

  return 300
}

function sortScenarioProducts<T extends Pick<ProductCatalogItem, 'id' | 'category' | 'source'>>(items: T[]) {
  return [...items].sort((a, b) => {
    const rankDelta = chairScenarioRank(a) - chairScenarioRank(b)
    return rankDelta === 0 ? 0 : rankDelta
  })
}

const roomChips: RoomChip[] = [
  { id: 'wall-materials', label: 'Wallpaper', category: 'wall-materials' },
  { id: 'floor-materials', label: 'Flooring', category: 'floor-materials' },
  { id: 'windows', label: 'Windows', category: 'windows' },
  { id: 'doors', label: 'Doors', category: 'doors' },
  { id: 'wall-decor', label: 'Wall deco', category: 'wall-decor' },
  { id: 'decor', label: 'Decor', category: 'decor' },
]

const exploreFeedItems: ExploreFeedItem[] = [
  {
    id: 'green-glass-study',
    author: 'Studio Yoon',
    timeAgo: '7h ago',
    imageUrl: '/assets/explore-feed/explore-room-02.webp',
    title: 'Riverfront Apt 804, Hannam',
    description: 'Layout memo for the work corner.',
    likes: 18,
    comments: 1,
    views: 72,
    shares: 4,
    remixes: 6,
    commentAuthor: 'roomnote',
    commentText: 'Desk placement feels stable.',
    info: '12.4 pyeong (5m x 8m)',
  },
  {
    id: 'soft-brown-living',
    author: 'Moa',
    timeAgo: 'Yesterday',
    imageUrl: '/assets/explore-feed/explore-room-03.webp',
    title: 'Yeonnam House B-302',
    description: 'Checking the sofa side only.',
    likes: 31,
    comments: 0,
    views: 98,
    shares: 7,
    remixes: 5,
    commentAuthor: '',
    commentText: '',
    info: '9.6 pyeong (4m x 7m)',
  },
  {
    id: 'compact-loft-bedroom',
    author: 'Haru Layout',
    timeAgo: 'Yesterday',
    imageUrl: '/assets/explore-feed/explore-room-04.webp',
    title: 'Mullae Studio 5F',
    description: 'Bed and storage spacing draft.',
    likes: 44,
    comments: 1,
    views: 143,
    shares: 11,
    remixes: 8,
    commentAuthor: 'minspace',
    commentText: 'Storage placement looks practical.',
    info: '6.2 pyeong (3m x 6m)',
  },
  {
    id: 'reading-corner',
    author: 'Green Room',
    timeAgo: '2d ago',
    imageUrl: '/assets/explore-feed/explore-room-05.webp',
    title: 'Bundang Green Villa 203',
    description: 'Small room plan around the shelf.',
    likes: 27,
    comments: 0,
    views: 88,
    shares: 3,
    remixes: 4,
    commentAuthor: '',
    commentText: '',
    info: '8.1 pyeong (4m x 6m)',
  },
  {
    id: 'white-winter-studio',
    author: 'Light Home',
    timeAgo: '2d ago',
    imageUrl: '/assets/explore-feed/explore-room-06.webp',
    title: 'Jamsil L Tower 1611',
    description: 'White room lighting test.',
    likes: 36,
    comments: 0,
    views: 121,
    shares: 9,
    remixes: 7,
    commentAuthor: '',
    commentText: '',
    info: '10.7 pyeong (5m x 7m)',
  },
  {
    id: 'open-office-plan',
    author: 'Plan Maker',
    timeAgo: '3d ago',
    imageUrl: '/assets/explore-feed/explore-room-07.webp',
    title: 'Nonhyeon Office 2F',
    description: 'Aisle check before adding desks.',
    likes: 12,
    comments: 0,
    views: 67,
    shares: 2,
    remixes: 3,
    commentAuthor: '',
    commentText: '',
    info: '34.5 pyeong (11m x 13m)',
  },
  {
    id: 'yellow-rug-dining',
    author: 'Yellow Rug',
    timeAgo: '3d ago',
    imageUrl: '/assets/explore-feed/explore-room-08.webp',
    title: 'Mangwon Terrace 402',
    description: 'Dining rug zone test.',
    likes: 53,
    comments: 1,
    views: 188,
    shares: 13,
    remixes: 10,
    commentAuthor: 'diningnote',
    commentText: 'The rug works well as an anchor.',
    info: '11.3 pyeong (4m x 8m)',
  },
  {
    id: 'plant-living-room',
    author: 'plantable',
    timeAgo: '4d ago',
    imageUrl: '/assets/explore-feed/explore-room-09.webp',
    title: 'Gwanggyo Lake View 907',
    description: 'Plant placement draft.',
    likes: 41,
    comments: 0,
    views: 132,
    shares: 5,
    remixes: 9,
    commentAuthor: '',
    commentText: '',
    info: '14.2 pyeong (5m x 9m)',
  },
  {
    id: 'top-view-apartment',
    author: 'Plan Notes',
    timeAgo: '5d ago',
    imageUrl: '/assets/explore-feed/explore-room-10.webp',
    title: 'Sinchon One Room 301',
    description: 'Top-view path check.',
    likes: 9,
    comments: 0,
    views: 44,
    shares: 1,
    remixes: 2,
    commentAuthor: '',
    commentText: '',
    info: '7.8 pyeong (4m x 6m)',
  },
  {
    id: 'soft-family-room',
    author: 'Warm Room',
    timeAgo: '5d ago',
    imageUrl: '/assets/explore-feed/explore-room-11.webp',
    title: 'Pangyo Family Apt 1102',
    description: 'Low furniture arrangement note.',
    likes: 25,
    comments: 0,
    views: 94,
    shares: 4,
    remixes: 5,
    commentAuthor: '',
    commentText: '',
    info: '13.5 pyeong (5m x 8m)',
  },
  {
    id: 'atelier-long-room',
    author: 'Choco Studio',
    timeAgo: '5h ago',
    imageUrl: '/assets/explore-feed/explore-room-01.webp',
    title: 'Maple Tower 1204, Seongsu-dong',
    description: 'My current room plan. Keeping this note short for reference.',
    likes: 2,
    comments: 0,
    views: 14,
    shares: 1,
    remixes: 1,
    commentAuthor: '',
    commentText: '',
    info: '21.8 pyeong (8m x 9m)',
  },
]


function formatCm(values: [number, number, number]) {
  return `${values[0]} x ${values[1]} x ${values[2]} cm`
}

function formatObjectDimensions(object: EditorObject) {
  const width = Math.round(object.dimensionsM.x * 100)
  const depth = Math.round(object.dimensionsM.z * 100)
  const height = Math.round(object.dimensionsM.y * 100)
  return `${width} x ${depth} x ${height} cm`
}

function productSourceForRoomSource(source: string): ProductAssetSource {
  return source === 'ShareTextures' ? 'sharetextures' : 'polyhaven'
}

const proceduralProductByUrl: Record<string, ProductCatalogItem> = {
  '/procedural/desktop-computer/imac': {
    id: 'apple-imac-24-silver',
    name: 'iMac 24-inch',
    brand: 'Apple',
    category: 'appliance',
    source: 'procedural',
    renderCost: 'standard',
    modelUrl: '/procedural/desktop-computer/imac',
    sourceModelUrl: '/assets/models/apple-official/imac-with-accessories-silver.usdz',
    thumbnailUrl: '/assets/model-thumbnails/apple-imac-24-silver.svg',
    dimensionsCm: [55, 24, 46],
  },
  '/procedural/laptop/macbook-air': {
    id: 'apple-macbook-air-13-starlight',
    name: 'MacBook Air 13-inch',
    brand: 'Apple',
    category: 'appliance',
    source: 'procedural',
    renderCost: 'standard',
    modelUrl: '/procedural/laptop/macbook-air',
    sourceModelUrl: '/assets/models/apple-official/macbook-air-13in-starlight.usdz',
    thumbnailUrl: '/assets/model-thumbnails/apple-macbook-air-13-starlight.svg',
    dimensionsCm: [31, 22, 4],
  },
  '/procedural/smart-speaker/homepod-mini': {
    id: 'apple-homepod-mini-white',
    name: 'HomePod mini',
    brand: 'Apple',
    category: 'appliance',
    source: 'procedural',
    renderCost: 'standard',
    modelUrl: '/procedural/smart-speaker/homepod-mini',
    sourceModelUrl: '/assets/models/apple-official/homepod-mini-white.usdz',
    thumbnailUrl: '/assets/model-thumbnails/apple-homepod-mini-white.svg',
    dimensionsCm: [10, 10, 9],
  },
  '/procedural/window-curtains': {
    id: 'ikea-hilja-sheer-curtains',
    name: 'HILJA Sheer Curtains',
    brand: 'IKEA',
    category: 'decor',
    source: 'procedural',
    renderCost: 'standard',
    modelUrl: '/procedural/window-curtains',
    sourceModelUrl: '/procedural/window-curtains',
    thumbnailUrl: '/assets/model-thumbnails/ikea-hilja-sheer-curtains.svg',
    dimensionsCm: [206, 8, 156],
  },
  '/procedural/wall-art-left': {
    id: 'moebe-frame-oak-a3-abstract',
    name: 'Frame Oak A3',
    brand: 'Moebe',
    category: 'decor',
    source: 'procedural',
    renderCost: 'standard',
    modelUrl: '/procedural/wall-art-left',
    sourceModelUrl: '/procedural/wall-art-left',
    thumbnailUrl: '/assets/model-thumbnails/hanging_picture_frame_03.png',
    dimensionsCm: [42, 4, 58],
  },
  '/procedural/wall-art-right': {
    id: 'moebe-frame-black-a4-accent',
    name: 'Frame Black A4',
    brand: 'Moebe',
    category: 'decor',
    source: 'procedural',
    renderCost: 'standard',
    modelUrl: '/procedural/wall-art-right',
    sourceModelUrl: '/procedural/wall-art-right',
    thumbnailUrl: '/assets/model-thumbnails/hanging_picture_frame_01.png',
    dimensionsCm: [30, 4, 44],
  },
}

function objectToTile(object: EditorObject): ProductTile {
  const catalogItem = (object.catalogItemId ? PRODUCT_BY_ID.get(object.catalogItemId) : undefined) ?? PRODUCT_BY_MODEL_URL.get(object.url)

  if (catalogItem) {
    return {
      ...catalogItem,
      placedObjectId: object.id,
      displayDimensions: catalogItem.name,
      ariaLabel: `${catalogItem.brand} ${catalogItem.name} ${formatObjectDimensions(object)}`,
    }
  }

  const roomItem = ROOM_SETTINGS_BY_MODEL_URL.get(object.url)

  if (roomItem) {
    return {
      id: object.id,
      name: roomItem.name,
      brand: roomItem.source,
      category: 'decor',
      source: productSourceForRoomSource(roomItem.source),
      renderCost: 'standard',
      modelUrl: object.url,
      sourceModelUrl: object.sourceModelUrl ?? object.url,
      runtimeModelUrl: object.runtimeModelUrl,
      heroModelUrl: object.heroModelUrl,
      thumbnailUrl: roomItem.thumbnailUrl,
      dimensionsCm: [
        Math.round(roomItem.dimensionsM.x * 100),
        Math.round(roomItem.dimensionsM.z * 100),
        Math.round(roomItem.dimensionsM.y * 100),
      ],
      placedObjectId: object.id,
      displayDimensions: roomItem.name,
      ariaLabel: `${roomItem.name} ${roomItem.source} ${formatObjectDimensions(object)}`,
    }
  }

  const proceduralItem = proceduralProductByUrl[object.url]

  if (proceduralItem) {
    return {
      ...proceduralItem,
      placedObjectId: object.id,
      displayDimensions: proceduralItem.name,
      ariaLabel: `${proceduralItem.brand} ${proceduralItem.name} ${formatObjectDimensions(object)}`,
    }
  }

  return {
    id: object.id,
    name: object.label,
    brand: 'Asset Library',
    category: 'decor',
    source: 'polyhaven',
    renderCost: 'standard',
    modelUrl: object.url,
    sourceModelUrl: object.sourceModelUrl ?? object.url,
    runtimeModelUrl: object.runtimeModelUrl,
    heroModelUrl: object.heroModelUrl,
    thumbnailUrl: '/assets/model-thumbnails/sheen-chair.png',
    dimensionsCm: [80, 80, 80],
    placedObjectId: object.id,
    displayDimensions: object.label,
    ariaLabel: `${object.label} ${formatObjectDimensions(object)}`,
  }
}

function getCatalogTiles(filter: FilterId, renderQuality: RenderQuality): ProductTile[] {
  const selected = chips.find((chip) => chip.id === filter)

  if (!selected?.category) {
    return []
  }

  return sortScenarioProducts(PRODUCT_CATALOG.filter(
    (item) => item.category === selected.category && (renderQuality === 'high' || item.renderCost !== 'heavy'),
  )).map((item) => ({
    ...item,
    displayDimensions: item.name,
    ariaLabel: `${item.brand} ${item.name} ${formatCm(item.dimensionsCm)}`,
  }))
}

function roomSettingToTile(
  item: RoomSettingsItem,
  selectedWallMaterialId: string,
  selectedFloorMaterialId: string,
): RoomSettingsTile {
  const selected =
    item.kind === 'material' &&
    ((item.target === 'wall' && item.id === selectedWallMaterialId) ||
      (item.target === 'floor' && item.id === selectedFloorMaterialId))

  return {
    id: item.id,
    brand: item.kind === 'material' ? (item.brand ?? item.source) : item.source,
    thumbnailUrl: item.thumbnailUrl,
    displayDimensions: item.kind === 'material' ? item.name : item.displayLabel,
    imageFit: item.kind === 'material' ? 'cover' : 'contain',
    selected,
    ariaLabel: `${item.kind === 'material' ? (item.brand ?? item.source) : item.source} ${item.name}${item.kind === 'material' && item.catalogCode ? ` ${item.catalogCode}` : ''}`,
    item,
  }
}

function getRoomSettingTiles(
  filter: RoomFilterId,
  selectedWallMaterialId: string,
  selectedFloorMaterialId: string,
): RoomSettingsTile[] {
  return ROOM_SETTINGS_CATALOG.filter((item) => item.category === filter).map((item) =>
    roomSettingToTile(item, selectedWallMaterialId, selectedFloorMaterialId),
  )
}

function dimensionsToObjectSize(values: [number, number, number]) {
  const [width, depth, height] = values
  return {
    x: width / 100,
    y: height / 100,
    z: depth / 100,
  }
}

function productPriceMeta(item: ProductCatalogItem) {
  const baseSeed = item.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const discount = 12 + (baseSeed % 27)
  const categoryBase =
    item.category === 'chair'
      ? 89000
      : item.category === 'table'
        ? 139000
        : item.category === 'storage'
          ? 189000
          : item.category === 'lighting'
            ? 79000
            : item.category === 'sofa'
              ? 429000
              : 59000
  const price = Math.round((categoryBase + (baseSeed % 37) * 3000) / 1000) * 1000

  return {
    discountLabel: `${discount}%`,
    priceLabel: price.toLocaleString('ko-KR'),
  }
}

export function CatalogSheet() {
  const [activeSegment, setActiveSegment] = useState<SheetSegment>('product')
  const [activeFilter, setActiveFilter] = useState<FilterId>('in-room')
  const [activeRoomFilter, setActiveRoomFilter] = useState<RoomFilterId>('wall-materials')
  const pointerRef = useRef<SheetPointerState | null>(null)
  const suppressNextClickRef = useRef(false)
  const objects = useEditorObjectsStore((s) => s.objects)
  const addObject = useEditorObjectsStore((s) => s.addObject)
  const setEditMode = useEditorObjectsStore((s) => s.setEditMode)
  const setActiveDragMode = useEditorObjectsStore((s) => s.setActiveDragMode)
  const wallMaterial = useRoomSettingsStore((s) => s.wallMaterial)
  const floorMaterial = useRoomSettingsStore((s) => s.floorMaterial)
  const setWallMaterial = useRoomSettingsStore((s) => s.setWallMaterial)
  const setFloorMaterial = useRoomSettingsStore((s) => s.setFloorMaterial)
  const renderQuality = useRenderQualityStore((s) => s.quality)
  const room = useRoomStore((s) => s.room)
  const select = useSelectionStore((s) => s.select)
  const selectedId = useSelectionStore((s) => s.selectedId)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const catalogExpanded = useUiStore((s) => s.catalogExpanded)
  const toggleCatalog = useUiStore((s) => s.toggleCatalog)
  const setCatalog = useUiStore((s) => s.setCatalog)
  const replaceObject = useEditorObjectsStore((s) => s.replaceObject)

  const inRoomTiles = useMemo(() => objects.map(objectToTile), [objects])
  const catalogTiles = useMemo(() => getCatalogTiles(activeFilter, renderQuality), [activeFilter, renderQuality])
  const productTiles = activeFilter === 'in-room' ? inRoomTiles : catalogTiles
  const roomTiles = useMemo(
    () => getRoomSettingTiles(activeRoomFilter, wallMaterial.id, floorMaterial.id),
    [activeRoomFilter, floorMaterial.id, wallMaterial.id],
  )
  const selectedProductContext = useMemo<SelectedProductContext | null>(() => {
    const selectedObject = objects.find((object) => object.id === selectedId)

    if (!selectedObject) {
      return null
    }

    const selectedItem =
      (selectedObject.catalogItemId ? PRODUCT_BY_ID.get(selectedObject.catalogItemId) : undefined) ??
      PRODUCT_BY_MODEL_URL.get(selectedObject.url)

    if (!selectedItem) {
      return null
    }

    const candidates = sortScenarioProducts(PRODUCT_CATALOG.filter(
      (item) =>
        item.category === selectedItem.category &&
        (item.id === selectedItem.id || renderQuality === 'high' || item.renderCost !== 'heavy'),
    ))

    return {
      object: selectedObject,
      item: selectedItem,
      candidates,
    }
  }, [objects, renderQuality, selectedId])

  const showSelectedEditMode = selectedProductContext !== null
  const expandSheet = () => setCatalog(true)
  const collapseSheet = () => setCatalog(false)
  const hasFilterChips = activeSegment !== 'explore'
  const controlsHeight = TOP_TABS_HEIGHT + (hasFilterChips ? CHIPS_HEIGHT : 0)

  const handleSheetClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (showSelectedEditMode) {
      return
    }

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (!catalogExpanded) {
      expandSheet()

      const target = event.target
      const allowCollapsedClick =
        target instanceof HTMLElement && target.closest('[data-allow-collapsed-click="true"]')

      if (!allowCollapsedClick) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }

  const handleSheetPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (showSelectedEditMode) {
      return
    }

    if (!event.isPrimary) {
      return
    }

    pointerRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      dragged: false,
    }
  }

  const handleSheetPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (showSelectedEditMode) {
      return
    }

    const state = pointerRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    state.lastY = event.clientY
    state.dragged = state.dragged || Math.abs(event.clientY - state.startY) > 8
  }

  const handleSheetPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (showSelectedEditMode) {
      return
    }

    const state = pointerRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    pointerRef.current = null
    const deltaY = state.lastY - state.startY

    if (deltaY < -DRAG_THRESHOLD) {
      suppressNextClickRef.current = true
      expandSheet()
      return
    }

    if (deltaY > DRAG_THRESHOLD) {
      suppressNextClickRef.current = true
      collapseSheet()
    }
  }

  const handleSheetWheelCapture = (event: WheelEvent<HTMLDivElement>) => {
    if (showSelectedEditMode) {
      return
    }

    if (!catalogExpanded) {
      event.preventDefault()
      event.stopPropagation()
      expandSheet()
    }
  }

  const handleProductClick = (item: ProductTile) => {
    if (item.placedObjectId) {
      select(item.placedObjectId)
      setEditMode('idle')
      setActiveDragMode(null)
      setCatalog(false)
      return
    }

    const dimensionsM = dimensionsToObjectSize(item.dimensionsCm)
    const targetSize = Math.max(dimensionsM.x, dimensionsM.y, dimensionsM.z)
    const id = `${item.id}-${Date.now()}`

    const isRug = item.category === 'rug' || item.modelUrl.startsWith('/procedural/area-rug/')

    addObject({
      id,
      label: item.name,
      url: item.modelUrl,
      sourceModelUrl: item.sourceModelUrl,
      runtimeModelUrl: item.runtimeModelUrl,
      heroModelUrl: item.heroModelUrl,
      catalogItemId: item.id,
      productCategory: item.category,
      renderKind: isRug ? 'area-rug' : 'model',
      position: { x: 0.15, z: 0.35 },
      placement: 'floor',
      elevationM: 0.02,
      rotationY: 0,
      targetSize,
      dimensionsM,
    })
    select(id)
    setEditMode('idle')
    setActiveDragMode(null)
    setCatalog(false)
  }

  const handleReplacementClick = (item: ProductCatalogItem) => {
    if (!selectedProductContext) {
      return
    }

    const dimensionsM = dimensionsToObjectSize(item.dimensionsCm)
    const targetSize = Math.max(dimensionsM.x, dimensionsM.y, dimensionsM.z)

    const isRug = item.category === 'rug' || item.modelUrl.startsWith('/procedural/area-rug/')

    replaceObject(selectedProductContext.object.id, {
      label: item.name,
      url: item.modelUrl,
      sourceModelUrl: item.sourceModelUrl,
      runtimeModelUrl: item.runtimeModelUrl,
      heroModelUrl: item.heroModelUrl,
      catalogItemId: item.id,
      productCategory: item.category,
      renderKind: isRug ? 'area-rug' : 'model',
      targetSize,
      dimensionsM,
    })
    setEditMode('idle')
    setActiveDragMode(null)
  }

  const applyRoomMaterial = (item: RoomMaterialItem) => {
    if (item.target === 'wall') {
      setWallMaterial(item)
    } else {
      setFloorMaterial(item)
    }

    select(null)
    setEditMode('idle')
    setActiveDragMode(null)
    setCatalog(false)
  }

  const addRoomModel = (item: RoomModelItem) => {
    const id = `${item.id}-${Date.now()}`
    const isWindow = item.category === 'windows'
    const wallPosition = {
      x: 0,
      z: -room.depthM / 2 + item.dimensionsM.z / 2,
    }

    addObject({
      id,
      label: item.name,
      url: item.modelUrl,
      renderKind: isWindow ? 'window-opening' : 'model',
      position: item.placement === 'wall' ? wallPosition : item.defaultPosition,
      placement: item.placement,
      elevationM: item.defaultElevationM,
      rotationY: isWindow ? 0 : item.defaultRotationY,
      boundsRotationY: item.placement === 'wall' ? 0 : undefined,
      wallSurfacePlane: isWindow ? 'xy' : item.wallSurfacePlane,
      targetSize: item.targetSize,
      dimensionsM: item.dimensionsM,
    })
    select(id)
    setEditMode('idle')
    setActiveDragMode(null)
    setCatalog(false)
  }

  const handleRoomSettingClick = (tile: RoomSettingsTile) => {
    if (tile.item.kind === 'material') {
      applyRoomMaterial(tile.item)
      return
    }

    addRoomModel(tile.item)
  }

  if (showSelectedEditMode && selectedProductContext) {
    return <SelectedObjectEditOverlay context={selectedProductContext} onReplace={handleReplacementClick} />
  }

  if (cameraMode === 'pov') {
    return null
  }

  return (
    <>
      {catalogExpanded ? (
        <button
          type="button"
          aria-label="Collapse product sheet backdrop"
          onClick={collapseSheet}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: zIndex.sheet - 1,
            pointerEvents: 'auto',
            background: 'transparent',
            cursor: 'default',
          }}
        />
      ) : null}

      <div
        className="safe-bottom"
        onClickCapture={handleSheetClickCapture}
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={handleSheetPointerEnd}
        onPointerCancel={handleSheetPointerEnd}
        onWheelCapture={handleSheetWheelCapture}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: SHEET_HEIGHT,
          background: color.sheet.bg,
          borderTopLeftRadius: radius.card,
          borderTopRightRadius: radius.card,
          boxShadow: shadow.sheet,
          zIndex: zIndex.sheet,
          pointerEvents: 'auto',
          overflow: 'hidden',
          touchAction: 'pan-y',
          transform: catalogExpanded ? 'translateY(0)' : `translateY(${COLLAPSED_OFFSET}px)`,
          transition: 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label={catalogExpanded ? 'Collapse product sheet' : 'Expand product sheet'}
          onClick={(event) => {
            event.stopPropagation()
            toggleCatalog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleCatalog()
            }
          }}
          style={{
            width: '100%',
            height: 23,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: 9,
            cursor: 'grab',
          }}
        >
          <span
            style={{
              width: 38,
              height: 3,
              background: color.sheet.grabber,
              borderRadius: radius.grabber,
              display: 'block',
            }}
          />
        </div>

        <TopTabs activeSegment={activeSegment} onChange={setActiveSegment} />
        {activeSegment === 'product' ? (
          <FilterChips activeFilter={activeFilter} onChange={setActiveFilter} />
        ) : activeSegment === 'room-settings' ? (
          <RoomFilterChips activeFilter={activeRoomFilter} onChange={setActiveRoomFilter} />
        ) : null}

        <div
          className="no-scrollbar"
          style={{
            height: `calc(100% - ${23 + SECTION_GAP + controlsHeight}px)`,
            padding: activeSegment === 'explore' ? '12px 0 24px' : '20px 10px 24px',
            overflowY: catalogExpanded ? 'auto' : 'hidden',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {activeSegment === 'product' && productTiles.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 111px)',
                columnGap: 0,
                rowGap: 20,
                justifyContent: 'space-between',
              }}
            >
              {productTiles.map((item) => (
                <ProductCard
                  key={`${item.id}-${item.placedObjectId ?? 'catalog'}`}
                  item={item}
                  onClick={() => handleProductClick(item)}
                />
              ))}
            </div>
          ) : null}

          {activeSegment === 'room-settings' && roomTiles.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 111px)',
                columnGap: 0,
                rowGap: 20,
                justifyContent: 'space-between',
              }}
            >
              {roomTiles.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onClick={() => handleRoomSettingClick(item)}
                />
              ))}
            </div>
          ) : null}

          {activeSegment === 'explore' ? <ExploreFeed items={exploreFeedItems} /> : null}

          {(activeSegment === 'product' && productTiles.length === 0) ||
          (activeSegment === 'room-settings' && roomTiles.length === 0) ? (
            <div
              style={{
                height: 180,
                display: 'grid',
                placeItems: 'center',
                ...css(text.body14_medium),
                color: color.base[2],
              }}
            >
              {activeSegment === 'room-settings' ? 'No room settings yet' : 'No products yet'}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function ExploreFeed({ items }: { items: ExploreFeedItem[] }) {
  return (
    <div style={{ width: '100%', background: '#FFFFFF' }}>
      {items.map((item) => (
        <ExploreFeedCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function ExploreFeedCard({ item }: { item: ExploreFeedItem }) {
  return (
    <article
      style={{
        width: '100%',
        paddingBottom: 36,
        background: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 42,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              ...css(text.body14_tight_regular),
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#000000',
              letterSpacing: EXPLORE_FEED_LETTER_SPACING,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontWeight: 600 }}>{item.author}</span>
            <span style={{ color: '#828C95' }}>{item.timeAgo}</span>
          </div>
          <IconFrame label="More options" wrapperSize={18} artworkWidth={18} artworkHeight={18}>
            <MoreHorizontalIcon />
          </IconFrame>
        </div>
      </div>

      <div style={{ position: 'relative', height: 300, width: '100%' }}>
        <img
          src={item.imageUrl}
          alt={item.title}
          loading="lazy"
          draggable={false}
          style={{
            position: 'absolute',
            inset: '0 16px',
            width: 'calc(100% - 32px)',
            height: 300,
            borderRadius: 8,
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </div>

      <ExploreReactionBar item={item} />
      <ExploreTextBlock variant="title">{item.title}</ExploreTextBlock>
      <ExploreTextBlock variant="body">{item.description}</ExploreTextBlock>

      {item.comments > 0 ? (
        <div style={{ padding: '0 16px 4px' }}>
          <div
            style={{
              ...css(text.body14_tight_semibold),
              color: '#828C94',
              letterSpacing: EXPLORE_FEED_LETTER_SPACING,
              marginBottom: 4,
              whiteSpace: 'nowrap',
            }}
          >
            View all {item.comments} {item.comments === 1 ? 'comment' : 'comments'}
          </div>
          <div
            style={{
              ...css(text.body15_relaxed_medium),
              width: '100%',
              color: '#2F3438',
              letterSpacing: EXPLORE_FEED_LETTER_SPACING,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            <span style={{ fontWeight: 600 }}>{item.commentAuthor}</span>
            <span> {item.commentText}</span>
          </div>
        </div>
      ) : null}

      <div
        style={{
          ...css(text.detail13_regular),
          padding: '0 16px',
          color: '#828C94',
          letterSpacing: EXPLORE_FEED_LETTER_SPACING,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.info}
      </div>
    </article>
  )
}

function ExploreTextBlock({
  children,
  variant,
}: {
  children: string
  variant: 'title' | 'body'
}) {
  const isTitle = variant === 'title'

  return (
    <div style={{ padding: '0 16px 4px' }}>
      <div
        style={{
          ...css(isTitle ? text.body15_relaxed_bold : text.body15_relaxed_medium),
          width: '100%',
          color: '#2F3438',
          letterSpacing: EXPLORE_FEED_LETTER_SPACING,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: isTitle ? 1 : 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ExploreReactionBar({ item }: { item: ExploreFeedItem }) {
  return (
    <div
      style={{
        width: '100%',
        padding: '16px 16px 12px',
        background: '#FFFFFF',
      }}
    >
      <div
        style={{
          height: 24,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <ReactionMetric count={item.likes} label="Likes">
            <IconFrame label="Likes" wrapperSize={24} artworkWidth={24} artworkHeight={24}>
              <HeartIcon />
            </IconFrame>
          </ReactionMetric>
          <ReactionMetric count={item.comments} label="Comments">
            <IconFrame label="Comments" wrapperSize={24} artworkWidth={24} artworkHeight={24}>
              <CommentIcon />
            </IconFrame>
          </ReactionMetric>
          <ReactionMetric count={item.views} label="Views">
            <IconFrame label="Views" wrapperSize={24} artworkWidth={24} artworkHeight={24}>
              <StatIcon />
            </IconFrame>
          </ReactionMetric>
          <ReactionMetric count={item.shares} label="Shares">
            <IconFrame label="Shares" wrapperSize={24} artworkWidth={24} artworkHeight={24}>
              <ExportIcon />
            </IconFrame>
          </ReactionMetric>
        </div>
        <ReactionMetric count={item.remixes} label="Remixes">
          <IconFrame label="Remixes" wrapperSize={24} artworkWidth={24} artworkHeight={24}>
            <RemixIcon />
          </IconFrame>
        </ReactionMetric>
      </div>
    </div>
  )
}

function ReactionMetric({
  children,
  count,
  label,
}: {
  children: ReactNode
  count: number
  label: string
}) {
  return (
    <div
      aria-label={`${label} ${count}`}
      style={{
        ...css(text.body14_tight_semibold),
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        color: '#2F3438',
        letterSpacing: EXPLORE_FEED_LETTER_SPACING,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
      <span>{count}</span>
    </div>
  )
}

function IconFrame({
  children,
  label,
  wrapperSize,
  artworkWidth,
  artworkHeight,
  left = 0,
  top = 0,
}: {
  children: ReactNode
  label: string
  wrapperSize: number
  artworkWidth: number
  artworkHeight: number
  left?: number
  top?: number
}) {
  return (
    <span
      aria-hidden="true"
      data-icon-wrapper={label}
      style={{
        position: 'relative',
        display: 'inline-block',
        flex: `0 0 ${wrapperSize}px`,
        width: wrapperSize,
        height: wrapperSize,
        minWidth: wrapperSize,
        minHeight: wrapperSize,
        maxWidth: wrapperSize,
        maxHeight: wrapperSize,
        overflow: 'hidden',
      }}
    >
      <span
        data-icon-artwork={label}
        style={{
          position: 'absolute',
          left,
          top,
          width: artworkWidth,
          height: artworkHeight,
          display: 'block',
        }}
      >
        {children}
      </span>
    </span>
  )
}

function SelectedObjectEditOverlay({
  context,
  onReplace,
}: {
  context: SelectedProductContext
  onReplace: (item: ProductCatalogItem) => void
}) {
  const priceMeta = productPriceMeta(context.item)
  const replacementItems = context.candidates.filter((item) => item.id !== context.item.id)
  const railItems = replacementItems.length > 0 ? replacementItems : context.candidates

  return (
    <>
      <div
        className="no-scrollbar"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: EDIT_CONTEXT_CARD_BOTTOM + EDIT_CONTEXT_CARD_HEIGHT + EDIT_CONTEXT_MODULE_GAP,
          zIndex: zIndex.sheet,
          height: EDIT_CONTEXT_RAIL_HEIGHT,
          padding: `0 ${SHEET_SIDE_PADDING}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {railItems.map((item) => {
          const active = item.id === context.item.id

          return (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.brand} ${item.name}`}
              onClick={() => onReplace(item)}
              style={{
                flex: '0 0 auto',
                width: EDIT_CONTEXT_RAIL_TILE_SIZE,
                height: EDIT_CONTEXT_RAIL_TILE_SIZE,
                borderRadius: 9,
                background: active ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(2.5px)',
                WebkitBackdropFilter: 'blur(2.5px)',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={item.thumbnailUrl}
                alt=""
                loading="lazy"
                draggable={false}
                style={{
                  width: 58,
                  height: 58,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </button>
          )
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: SHEET_SIDE_PADDING,
          right: SHEET_SIDE_PADDING,
          bottom: EDIT_CONTEXT_CARD_BOTTOM,
          zIndex: zIndex.sheet,
        }}
      >
        <div
          style={{
            height: EDIT_CONTEXT_CARD_HEIGHT,
            boxSizing: 'border-box',
            borderRadius: 14,
            background: '#242426',
            border: '1px solid #2F3036',
            boxShadow: '0 16px 24px rgba(0,0,0,0.04)',
            padding: '12px 20px 12px 12px',
            display: 'grid',
            gridTemplateColumns: '64px 1fr 24px',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={context.item.thumbnailUrl}
              alt=""
              loading="lazy"
              draggable={false}
              style={{
                width: 64,
                height: 64,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                ...css(text.detail12_regular),
                color: '#A7ABB2',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {context.item.brand}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
                color: '#FFFFFF',
              }}
            >
              <div
                style={{
                  ...css(text.body14_tight_regular),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {context.item.name}
              </div>
              <ChevronRightIcon />
            </div>
            <div
              style={{
                marginTop: 2,
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                ...css(text.body16_relaxed_regular),
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#35C5F0' }}>{priceMeta.discountLabel}</span>
              <span style={{ color: '#FFFFFF' }}>{priceMeta.priceLabel}</span>
            </div>
          </div>

          <button
            type="button"
            aria-label={`Save ${context.item.brand} ${context.item.name}`}
            style={{
              width: 24,
              height: 24,
              alignSelf: 'center',
              display: 'grid',
              placeItems: 'center',
              color: '#FFFFFF',
              padding: 0,
            }}
          >
            <BookmarkIcon />
          </button>
        </div>
      </div>
    </>
  )
}

function TopTabs({
  activeSegment,
  onChange,
}: {
  activeSegment: SheetSegment
  onChange: (segment: SheetSegment) => void
}) {
  const segments: Array<{ id: SheetSegment; label: string }> = [
    { id: 'product', label: 'Product' },
    { id: 'room-settings', label: 'Room' },
    { id: 'explore', label: 'Explore' },
  ]
  const activeIndex = Math.max(0, segments.findIndex((segment) => segment.id === activeSegment))

  return (
    <div style={{ paddingTop: 1 }}>
      <div
        style={{
          position: 'relative',
          height: TOP_TABS_HEIGHT,
          padding: `0 ${SHEET_SIDE_PADDING}px`,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'stretch',
          borderBottom: '1px solid #EAEDEF',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `calc(${SHEET_SIDE_PADDING}px + ((100% - ${SHEET_SIDE_PADDING * 2}px) / 3) * ${activeIndex})`,
            bottom: 0,
            width: `calc((100% - ${SHEET_SIDE_PADDING * 2}px) / 3)`,
            height: 1,
            background: color.base[1],
            transition: 'left 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
        {segments.map((segment) => {
          const active = segment.id === activeSegment

          return (
            <button
              key={segment.id}
              type="button"
              data-allow-collapsed-click="true"
              onClick={() => onChange(segment.id)}
              style={{
                position: 'relative',
                height: TOP_TABS_HEIGHT,
                background: 'transparent',
                color: active ? color.base[1] : color.base[2],
                ...css(text.body15_relaxed_medium),
              }}
            >
              {segment.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FilterChips({
  activeFilter,
  onChange,
}: {
  activeFilter: FilterId
  onChange: (filter: FilterId) => void
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: CHIPS_HEIGHT,
      }}
    >
      <div
        className="no-scrollbar"
        style={{
          height: CHIPS_HEIGHT,
          padding: `12px ${SHEET_SIDE_PADDING}px`,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          overflowX: 'auto',
        }}
      >
        {chips.map((chip) => {
          const active = chip.id === activeFilter

          return (
            <Fragment key={chip.id}>
              <button
                type="button"
                onClick={() => setInteractiveFilter(chip.id, onChange)}
                style={chipButtonStyle(active)}
              >
                {chip.id === 'search' ? <SearchIcon active={active} /> : null}
                {chip.label}
              </button>
              {chip.id === 'search' ? <SearchDivider /> : null}
            </Fragment>
          )
        })}
      </div>
      <ChipEdgeFade side="left" />
      <ChipEdgeFade side="right" />
    </div>
  )
}

function RoomFilterChips({
  activeFilter,
  onChange,
}: {
  activeFilter: RoomFilterId
  onChange: (filter: RoomFilterId) => void
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: CHIPS_HEIGHT,
      }}
    >
      <div
        className="no-scrollbar"
        style={{
          height: CHIPS_HEIGHT,
          padding: `12px ${SHEET_SIDE_PADDING}px`,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          overflowX: 'auto',
        }}
      >
        {roomChips.map((chip) => {
          const active = chip.id === activeFilter

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChange(chip.id)}
              style={chipButtonStyle(active)}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
      <ChipEdgeFade side="left" />
      <ChipEdgeFade side="right" />
    </div>
  )
}

function chipButtonStyle(active: boolean): CSSProperties {
  return {
    flex: '0 0 auto',
    height: CHIP_BUTTON_HEIGHT,
    padding: '0 12px',
    borderRadius: 50,
    background: active ? '#000000' : '#FFFFFF',
    border: active ? '1px solid #000000' : '1px solid #DADDE0',
    color: active ? '#FFFFFF' : '#2F3438',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    fontFamily: CHIP_FONT_FAMILY,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '18px',
    letterSpacing: 0,
    whiteSpace: 'nowrap',
  }
}

function SearchDivider() {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        color: '#2F3438',
        fontFamily: CHIP_FONT_FAMILY,
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '18px',
        padding: '0 4px',
      }}
    >
      |
    </span>
  )
}

function setInteractiveFilter(filter: FilterId, onChange: (filter: FilterId) => void) {
  if (filter === 'search' || filter === 'saved') {
    return
  }

  onChange(filter)
}

function ChipEdgeFade({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 26,
        pointerEvents: 'none',
        background:
          side === 'left'
            ? `linear-gradient(90deg, ${color.sheet.bg} 28%, rgba(255,255,255,0) 100%)`
            : `linear-gradient(270deg, ${color.sheet.bg} 28%, rgba(255,255,255,0) 100%)`,
      }}
    />
  )
}

function ProductCard({ item, onClick }: { item: CardTile; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={item.ariaLabel ?? `${item.brand} ${item.displayDimensions}`}
      onClick={onClick}
      style={{
        width: 111,
        minWidth: 111,
        maxWidth: 111,
        textAlign: 'left',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          marginLeft: -4.5,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 96,
            height: 96,
            minWidth: 96,
            minHeight: 96,
            maxWidth: 96,
            maxHeight: 96,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            borderRadius: item.imageFit === 'cover' ? 6 : 0,
            boxShadow: item.selected ? '0 0 0 2px #000000' : 'none',
          }}
        >
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: item.imageFit ?? 'contain',
              display: 'block',
            }}
          />
        </div>
      </div>
      <div
        style={{
          ...css(text.sf_brand11_semibold),
          width: 92,
          marginTop: 0,
          color: '#AAB2B8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.brand}
      </div>
      <div
        style={{
          ...css(text.detail12_medium),
          width: 106,
          minHeight: 31,
          marginTop: 1,
          color: color.base[1],
          lineHeight: 1.3,
          whiteSpace: 'normal',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {item.displayDimensions}
      </div>
    </button>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M5.35 9.7a4.35 4.35 0 1 1 0-8.7 4.35 4.35 0 0 1 0 8.7Zm3.06-1.29 2.09 2.09"
        stroke={active ? '#FFFFFF' : '#2F3438'}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoreHorizontalIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="4" cy="9" r="1.35" fill="#2F3438" />
      <circle cx="9" cy="9" r="1.35" fill="#2F3438" />
      <circle cx="14" cy="9" r="1.35" fill="#2F3438" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.36625 6.3508C3.79842 7.00378 3.39961 7.95634 3.39961 9.2678C3.39961 10.532 3.89982 11.7985 4.7293 13.024C5.55759 14.2477 6.67924 15.3779 7.83019 16.3496C8.97754 17.3182 10.1294 18.1088 10.9967 18.6579C11.4073 18.9179 11.752 19.1225 11.9996 19.265C12.2472 19.1225 12.5919 18.9179 13.0025 18.6579C13.8698 18.1088 15.0217 17.3182 16.169 16.3496C17.32 15.3779 18.4416 14.2477 19.2699 13.024C20.0994 11.7985 20.5996 10.532 20.5996 9.2678C20.5996 7.95634 20.2008 7.00378 19.633 6.3508C19.06 5.69186 18.2695 5.28575 17.4025 5.15045C15.6546 4.87768 13.6952 5.71451 12.8208 7.66391C12.6757 7.9874 12.3542 8.19555 11.9996 8.19555C11.6451 8.19555 11.3236 7.9874 11.1784 7.66391C10.304 5.71451 8.34459 4.87768 6.59671 5.15045C5.72974 5.28575 4.93926 5.69186 4.36625 6.3508ZM11.9996 20.2955C11.5796 21.0915 11.5791 21.0912 11.5791 21.0912L11.5763 21.0898L11.5696 21.0862L11.546 21.0736C11.5259 21.0627 11.497 21.0471 11.4599 21.0268C11.3858 20.9861 11.279 20.9266 11.144 20.8493C10.8743 20.6948 10.4917 20.4686 10.0338 20.1787C9.11981 19.6 7.89667 18.7614 6.66903 17.725C5.44498 16.6916 4.19163 15.4409 3.23867 14.033C2.2869 12.6268 1.59961 11.0111 1.59961 9.2678C1.59961 7.57174 2.12441 6.18573 3.00797 5.16966C3.88635 4.15955 5.07504 3.56613 6.31917 3.37197C8.34185 3.05632 10.5759 3.79028 11.9996 5.57468C13.4233 3.79028 15.6574 3.05632 17.68 3.37197C18.9242 3.56613 20.1129 4.15955 20.9912 5.16966C21.8748 6.18573 22.3996 7.57174 22.3996 9.2678C22.3996 11.0111 21.7123 12.6268 20.7606 14.033C19.8076 15.4409 18.5542 16.6916 17.3302 17.725C16.1025 18.7614 14.8794 19.6 13.9654 20.1787C13.5075 20.4686 13.125 20.6948 12.8552 20.8493C12.7203 20.9266 12.6134 20.9861 12.5393 21.0268C12.5022 21.0471 12.4733 21.0627 12.4532 21.0736L12.4296 21.0862L12.4229 21.0898L12.4208 21.0909C12.4208 21.0909 12.4196 21.0915 11.9996 20.2955ZM11.9996 20.2955L12.4196 21.0915C12.1568 21.2302 11.8419 21.2299 11.5791 21.0912L11.9996 20.2955Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.2002 4.8C6.2002 3.80589 7.00608 3 8.0002 3H16.0002C16.9943 3 17.8002 3.80589 17.8002 4.8V20.2C17.8002 20.7993 17.1205 21.1457 16.6356 20.7935L12.0002 17.425L7.36478 20.7935C6.87988 21.1457 6.2002 20.7993 6.2002 20.2V4.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.3933 15.8297L18.7056 15.2103C19.2411 14.1486 19.5435 12.9481 19.5435 11.6717C19.5435 7.3243 16.0192 3.8 11.6717 3.8C7.3243 3.8 3.8 7.3243 3.8 11.6717C3.8 16.0192 7.3243 19.5435 11.6717 19.5435C12.9812 19.5435 14.2111 19.2252 15.2932 18.6632L15.9197 18.3379L19.343 19.2801L18.3933 15.8297ZM16.1227 20.2607C14.7904 20.9526 13.2767 21.3435 11.6717 21.3435C6.33019 21.3435 2 17.0133 2 11.6717C2 6.33019 6.33019 2 11.6717 2C17.0133 2 21.3435 6.33019 21.3435 11.6717C21.3435 13.236 20.9722 14.7134 20.3128 16.0208L21.464 20.203C21.6646 20.9319 20.9948 21.6017 20.2659 21.4011L16.1227 20.2607Z"
        fill="currentColor"
      />
    </svg>
  )
}

function StatIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.99961 12.0996C6.49667 12.0996 6.89961 12.5026 6.89961 12.9996L6.89961 18.9996C6.89961 19.4967 6.49667 19.8996 5.99961 19.8996C5.50255 19.8996 5.09961 19.4967 5.09961 18.9996L5.09961 12.9996C5.09961 12.5026 5.50255 12.0996 5.99961 12.0996Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.9996 8.09961C12.4967 8.09961 12.8996 8.50255 12.8996 8.99961L12.8996 18.9996C12.8996 19.4967 12.4967 19.8996 11.9996 19.8996C11.5026 19.8996 11.0996 19.4967 11.0996 18.9996L11.0996 8.99961C11.0996 8.50255 11.5026 8.09961 11.9996 8.09961Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.9996 4.09961C18.4967 4.09961 18.8996 4.50255 18.8996 4.99961V18.9996C18.8996 19.4967 18.4967 19.8996 17.9996 19.8996C17.5026 19.8996 17.0996 19.4967 17.0996 18.9996V4.99961C17.0996 4.50255 17.5026 4.09961 17.9996 4.09961Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.99961 9.85505C4.49667 9.85505 4.89961 10.258 4.89961 10.7551V17.5328C4.89961 18.6926 5.83981 19.6328 6.99961 19.6328H16.9996C18.1594 19.6328 19.0996 18.6926 19.0996 17.5328V10.7551C19.0996 10.258 19.5026 9.85505 19.9996 9.85505C20.4967 9.85505 20.8996 10.258 20.8996 10.7551V17.5328C20.8996 19.6867 19.1535 21.4328 16.9996 21.4328H6.99961C4.8457 21.4328 3.09961 19.6867 3.09961 17.5328V10.7551C3.09961 10.258 3.50255 9.85505 3.99961 9.85505Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.9996 2.19336L16.9027 7.09642C17.2541 7.44789 17.2541 8.01774 16.9027 8.36921C16.5512 8.72069 15.9814 8.72069 15.6299 8.36921L11.9996 4.73894L8.36934 8.36921C8.01787 8.72069 7.44802 8.72069 7.09655 8.36921C6.74507 8.01774 6.74507 7.44789 7.09655 7.09642L11.9996 2.19336Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.9996 3.99948C12.4966 3.99948 12.8996 4.40242 12.8996 4.89948V12.6995C12.8996 13.1965 12.4966 13.5995 11.9996 13.5995C11.5025 13.5995 11.0996 13.1965 11.0996 12.6995V4.89948C11.0996 4.40242 11.5025 3.99948 11.9996 3.99948Z"
        fill="currentColor"
      />
    </svg>
  )
}

function RemixIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11.8665H10M10 11.8665L13.802 7.48843C14.1818 7.05101 14.7327 6.7998 15.312 6.7998H17.5667M10 11.8665L13.802 16.2445C14.1818 16.6819 14.7327 16.9331 15.312 16.9331H17.5667"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21.4068 6.389C21.6938 6.58784 21.6938 7.01216 21.4068 7.211L18.0347 9.54721C17.7031 9.77695 17.25 9.53962 17.25 9.13621L17.25 4.46379C17.25 4.06038 17.7031 3.82305 18.0347 4.05279L21.4068 6.389Z"
        fill="currentColor"
      />
      <path
        d="M21.4068 16.5228C21.6938 16.7216 21.6938 17.1459 21.4068 17.3448L18.0347 19.681C17.7031 19.9107 17.25 19.6734 17.25 19.27L17.25 14.5976C17.25 14.1942 17.7031 13.9568 18.0347 14.1866L21.4068 16.5228Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 2.25 8.25 6 4.5 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
