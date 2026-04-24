import { useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent, WheelEvent } from 'react'
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
import { color, css, radius, shadow, text, zIndex } from '@/constants'
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
const CHIPS_HEIGHT = 44
const TOP_TABS_HEIGHT = 44
const CHIP_BUTTON_HEIGHT = 32
const TOP_STACK_HEIGHT = TOP_TABS_HEIGHT + SECTION_GAP + CHIPS_HEIGHT
const EDIT_CONTEXT_RAIL_TILE_SIZE = 72
const EDIT_CONTEXT_RAIL_PADDING_Y = 12
const EDIT_CONTEXT_RAIL_HEIGHT = EDIT_CONTEXT_RAIL_TILE_SIZE + EDIT_CONTEXT_RAIL_PADDING_Y * 2
const EDIT_CONTEXT_CARD_HEIGHT = 88
const EDIT_CONTEXT_CARD_BOTTOM = 28
const EDIT_CONTEXT_MODULE_GAP = 3

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

const roomChips: RoomChip[] = [
  { id: 'wall-materials', label: 'Wallpaper', category: 'wall-materials' },
  { id: 'floor-materials', label: 'Flooring', category: 'floor-materials' },
  { id: 'windows', label: 'Windows', category: 'windows' },
  { id: 'doors', label: 'Doors', category: 'doors' },
  { id: 'wall-decor', label: 'Wall deco', category: 'wall-decor' },
  { id: 'decor', label: 'Decor', category: 'decor' },
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

  return {
    id: object.id,
    name: object.label,
    brand: 'Pocketroom',
    category: 'decor',
    source: 'polyhaven',
    renderCost: 'standard',
    modelUrl: object.url,
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

  return PRODUCT_CATALOG.filter(
    (item) => item.category === selected.category && (renderQuality === 'high' || item.renderCost !== 'heavy'),
  ).map((item) => ({
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

    const candidates = PRODUCT_CATALOG.filter(
      (item) =>
        item.category === selectedItem.category &&
        (item.id === selectedItem.id || renderQuality === 'high' || item.renderCost !== 'heavy'),
    )

    return {
      object: selectedObject,
      item: selectedItem,
      candidates,
    }
  }, [objects, renderQuality, selectedId])

  if (cameraMode === 'pov') {
    return null
  }

  const showSelectedEditMode = selectedProductContext !== null
  const expandSheet = () => setCatalog(true)
  const collapseSheet = () => setCatalog(false)

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
        ) : (
          <ExploreSpacer />
        )}

        <div
          className="no-scrollbar"
          style={{
            height: `calc(100% - ${23 + TOP_STACK_HEIGHT}px)`,
            padding: '20px 10px 24px',
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

          {activeSegment === 'explore' ||
          (activeSegment === 'product' && productTiles.length === 0) ||
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
              {activeSegment === 'explore'
                ? 'No explore items yet'
                : activeSegment === 'room-settings'
                  ? 'No room settings yet'
                  : 'No products yet'}
            </div>
          ) : null}
        </div>
      </div>
    </>
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
        {context.candidates.map((item) => {
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
                fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontSize: 12,
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: 0,
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
                  fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: '18px',
                  letterSpacing: 0,
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
                fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: 0,
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
                ...css(active ? text.body14_bold : text.body14_medium),
                letterSpacing: '-0.4px',
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
          padding: `12px ${SHEET_SIDE_PADDING}px 0`,
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
        }}
      >
        {chips.map((chip) => {
          const active = chip.id === activeFilter

          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setInteractiveFilter(chip.id, onChange)}
              style={{
                flex: '0 0 auto',
                height: CHIP_BUTTON_HEIGHT,
                padding: chip.id === 'search' ? '0 12px' : '0 14px',
                borderRadius: 30,
                background: active ? '#000000' : '#FFFFFF',
                border: active ? '1px solid #000000' : '1px solid #DADDE0',
                color: active ? '#FFFFFF' : color.base[1],
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontSize: 15,
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '-0.4px',
              }}
            >
              {chip.id === 'search' ? <SearchIcon active={active} /> : null}
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
          padding: `12px ${SHEET_SIDE_PADDING}px 0`,
          display: 'flex',
          gap: 6,
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
              style={{
                flex: '0 0 auto',
                height: CHIP_BUTTON_HEIGHT,
                padding: '0 14px',
                borderRadius: 30,
                background: active ? '#000000' : '#FFFFFF',
                border: active ? '1px solid #000000' : '1px solid #DADDE0',
                color: active ? '#FFFFFF' : color.base[1],
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontSize: 15,
                fontWeight: 500,
                lineHeight: '20px',
                letterSpacing: '-0.4px',
              }}
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

function ExploreSpacer() {
  return <div style={{ height: CHIPS_HEIGHT }} />
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

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 2.25 8.25 6 4.5 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.8 3.6C6.8 2.93726 7.33726 2.4 8 2.4H16C16.6627 2.4 17.2 2.93726 17.2 3.6V21L12 17.782L6.8 21V3.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
