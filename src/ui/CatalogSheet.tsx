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

const chips: Chip[] = [
  { id: 'search', label: 'Search' },
  { id: 'in-room', label: 'In this room' },
  { id: 'saved', label: 'Saved' },
  { id: 'table', label: 'Table', category: 'table' },
  { id: 'storage', label: 'Drawers', category: 'storage' },
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
  const catalogItem = PRODUCT_BY_MODEL_URL.get(object.url)

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
    brand: item.source,
    thumbnailUrl: item.thumbnailUrl,
    displayDimensions: item.kind === 'material' ? (item.target === 'wall' ? 'Wall material' : 'Floor material') : item.displayLabel,
    imageFit: item.kind === 'material' ? 'cover' : 'contain',
    selected,
    ariaLabel: `${item.name} ${item.kind === 'material' ? item.source : item.displayLabel}`,
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
  const cameraMode = useCameraViewStore((s) => s.mode)
  const catalogExpanded = useUiStore((s) => s.catalogExpanded)
  const toggleCatalog = useUiStore((s) => s.toggleCatalog)
  const setCatalog = useUiStore((s) => s.setCatalog)

  const inRoomTiles = useMemo(() => objects.map(objectToTile), [objects])
  const catalogTiles = useMemo(() => getCatalogTiles(activeFilter, renderQuality), [activeFilter, renderQuality])
  const productTiles = activeFilter === 'in-room' ? inRoomTiles : catalogTiles
  const roomTiles = useMemo(
    () => getRoomSettingTiles(activeRoomFilter, wallMaterial.id, floorMaterial.id),
    [activeRoomFilter, floorMaterial.id, wallMaterial.id],
  )
  if (cameraMode === 'pov') {
    return null
  }

  const expandSheet = () => setCatalog(true)
  const collapseSheet = () => setCatalog(false)

  const handleSheetClickCapture = (event: MouseEvent<HTMLDivElement>) => {
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
    const state = pointerRef.current
    if (!state || state.pointerId !== event.pointerId) {
      return
    }

    state.lastY = event.clientY
    state.dragged = state.dragged || Math.abs(event.clientY - state.startY) > 8
  }

  const handleSheetPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
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

    addObject({
      id,
      label: item.brand,
      url: item.modelUrl,
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
          gap: 4,
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
          gap: 4,
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
