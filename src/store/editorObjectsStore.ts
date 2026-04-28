import { create } from 'zustand'
import { modelUrlWithBestVariant, modelVariantUrlsFor } from '@/constants/modelVariants'
import type { ProductCategory } from '@/constants/productCatalog'
import { normalizeRotation } from '@/domain/placementConstraints'
import type { Vec2 } from '@/domain/types'

export type EditorObjectPlacement = 'floor' | 'wall' | 'ceiling'
export type WallSurfacePlane = 'xy' | 'yz'
export type EditorObjectRotationMode = 'orthogonal' | 'free'
export type EditorObjectRenderKind =
  | 'book-stack'
  | 'model'
  | 'area-rug'
  | 'desktop-computer'
  | 'floor-lamp'
  | 'laptop'
  | 'plant'
  | 'smart-speaker'
  | 'wall-art'
  | 'window-opening'
  | 'window-curtains'

export type EditorObjectAnchor = {
  parentId: string
  slotId: string
  localOffsetM?: { x: number; y: number; z: number }
  localRotationY?: number
}

export type EditorObject = {
  id: string
  label: string
  url: string
  sourceModelUrl?: string
  runtimeModelUrl?: string
  heroModelUrl?: string
  catalogItemId?: string
  productCategory?: ProductCategory
  renderKind?: EditorObjectRenderKind
  position: Vec2
  placement: EditorObjectPlacement
  elevationM: number
  rotationMode?: EditorObjectRotationMode
  rotationY: number
  boundsRotationY?: number
  wallSurfacePlane?: WallSurfacePlane
  targetSize: number
  dimensionsM: { x: number; y: number; z: number }
  anchor?: EditorObjectAnchor
  locked?: boolean
}

export type PlacementEditMode = 'idle' | 'move' | 'lift'
export type PlacementDragMode = Exclude<PlacementEditMode, 'idle'>

interface EditorObjectsState {
  objects: EditorObject[]
  editMode: PlacementEditMode
  activeDragMode: PlacementDragMode | null
  resetObjects: () => void
  addObject: (object: EditorObject) => void
  setObjectsForDebug: (objects: EditorObject[]) => void
  setEditMode: (mode: PlacementEditMode) => void
  setActiveDragMode: (mode: PlacementDragMode | null) => void
  removeObject: (id: string) => void
  replaceObject: (
    id: string,
    replacement: Pick<EditorObject, 'label' | 'url' | 'targetSize' | 'dimensionsM'> &
      Partial<
        Pick<
          EditorObject,
          | 'catalogItemId'
          | 'productCategory'
          | 'renderKind'
          | 'rotationMode'
          | 'sourceModelUrl'
          | 'runtimeModelUrl'
          | 'heroModelUrl'
        >
      >,
  ) => void
  updateObject: (
    id: string,
    patch: Partial<Pick<EditorObject, 'position' | 'elevationM' | 'rotationY' | 'boundsRotationY' | 'dimensionsM'>>,
  ) => void
}

type AnchorSlot = {
  localPositionM: { x: number; y: number; z: number }
}

const ANCHOR_SLOTS_BY_PARENT_ID: Record<string, Record<string, AnchorSlot>> = {
  'bookcase-left': {
    'top-left-books': { localPositionM: { x: -0.2, y: 1.44, z: 0.02 } },
    'top-center-vase': { localPositionM: { x: 0.18, y: 1.42, z: 0.02 } },
    'top-right-books': { localPositionM: { x: 0.14, y: 1.44, z: 0.02 } },
    'middle-left-books': { localPositionM: { x: -0.22, y: 1.01, z: 0.02 } },
    'middle-center-books': { localPositionM: { x: 0.16, y: 1.01, z: 0.02 } },
    'middle-center-bookend': { localPositionM: { x: 0.34, y: 1.01, z: 0.02 } },
    'middle-right-bookend': { localPositionM: { x: 0.36, y: 0.59, z: 0.02 } },
    'lower-center-books': { localPositionM: { x: -0.18, y: 0.59, z: 0.02 } },
    'lower-right-vase': { localPositionM: { x: 0.18, y: 0.59, z: 0.02 } },
  },
}

function rotateLocalOffset(localX: number, localZ: number, rotationY: number) {
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)

  return {
    x: localX * cos - localZ * sin,
    z: localX * sin + localZ * cos,
  }
}

function inferRotationMode(object: EditorObject): EditorObjectRotationMode {
  if (object.rotationMode) {
    return object.rotationMode
  }

  return object.anchor ? 'free' : 'orthogonal'
}

function normalizeEditorObject(object: EditorObject) {
  const rotationMode = inferRotationMode(object)
  const rotationY = normalizeRotation(object.rotationY, rotationMode)
  const boundsRotationY = object.boundsRotationY === undefined
    ? undefined
    : normalizeRotation(object.boundsRotationY, object.placement === 'wall' ? 'orthogonal' : rotationMode)

  return {
    ...object,
    rotationMode,
    rotationY,
    boundsRotationY,
  }
}

function modelAsset(sourceModelUrl: string) {
  return {
    url: modelUrlWithBestVariant(sourceModelUrl),
    ...modelVariantUrlsFor(sourceModelUrl),
  }
}

function cloneObject(object: EditorObject): EditorObject {
  return normalizeEditorObject({
    ...object,
    position: { ...object.position },
    dimensionsM: { ...object.dimensionsM },
    anchor: object.anchor
      ? {
          ...object.anchor,
          localOffsetM: object.anchor.localOffsetM ? { ...object.anchor.localOffsetM } : undefined,
        }
      : undefined,
  })
}

function mergeObjectPatch(object: EditorObject, patch: Partial<Pick<EditorObject, 'position' | 'elevationM' | 'rotationY' | 'boundsRotationY' | 'dimensionsM'>>) {
  const next: EditorObject = {
    ...object,
    ...patch,
    position: patch.position ? { ...patch.position } : object.position,
    dimensionsM: patch.dimensionsM ? { ...patch.dimensionsM } : object.dimensionsM,
  }

  if (object.placement !== 'wall' && patch.rotationY !== undefined && patch.boundsRotationY === undefined && object.boundsRotationY !== undefined) {
    next.boundsRotationY = patch.rotationY
  }

  return normalizeEditorObject(next)
}

function resolveAnchoredObjects(objects: EditorObject[]) {
  const byId = new Map(objects.map((object) => [object.id, object]))

  return objects.map((object) => {
    if (!object.anchor) {
      return object
    }

    const parent = byId.get(object.anchor.parentId)
    const slot = ANCHOR_SLOTS_BY_PARENT_ID[object.anchor.parentId]?.[object.anchor.slotId]

    if (!parent || !slot) {
      return object
    }

    const offset = object.anchor.localOffsetM ?? { x: 0, y: 0, z: 0 }
    const local = {
      x: slot.localPositionM.x + offset.x,
      y: slot.localPositionM.y + offset.y,
      z: slot.localPositionM.z + offset.z,
    }
    const rotated = rotateLocalOffset(local.x, local.z, parent.rotationY)
    const rotationMode = inferRotationMode(object)

    return {
      ...object,
      position: {
        x: parent.position.x + rotated.x,
        z: parent.position.z + rotated.z,
      },
      elevationM: parent.elevationM + local.y,
      rotationMode,
      rotationY: normalizeRotation(parent.rotationY + (object.anchor.localRotationY ?? 0), rotationMode),
      boundsRotationY: object.boundsRotationY,
    }
  })
}

const INITIAL_OBJECTS: EditorObject[] = [
  {
    id: 'desk',
    label: 'Simple Table',
    url: '/assets/models/manual/zeel-by-furniture-simple-table.optimized.glb',
    catalogItemId: 'zeel-by-furniture-simple-table',
    productCategory: 'table',
    renderKind: 'model',
    position: { x: 0.56, z: -2.08 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 2,
    targetSize: 1.78,
    dimensionsM: { x: 0.729, y: 0.533, z: 1.78 },
    locked: true,
  },
  {
    id: 'armchair',
    label: 'Plan Chair',
    ...modelAsset('/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb'),
    catalogItemId: 'dimensiva-plan-chair-by-fredericia',
    productCategory: 'chair',
    renderKind: 'model',
    position: { x: 0.56, z: -1.42 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI,
    boundsRotationY: Math.PI,
    targetSize: 0.92,
    dimensionsM: { x: 0.504, y: 0.92, z: 0.619 },
  },
  {
    id: 'desk-lamp',
    label: 'Hollie Table Lamp',
    url: '/assets/models/manual/designconnected-hollie-table-lamp-8909.optimized.glb',
    catalogItemId: 'designconnected-hollie-table-lamp-8909',
    productCategory: 'lighting',
    renderKind: 'model',
    position: { x: 1.12, z: -2.24 },
    placement: 'floor',
    elevationM: 0.555,
    rotationY: Math.PI / 2,
    targetSize: 0.26,
    dimensionsM: { x: 0.06, y: 0.061, z: 0.26 },
    locked: true,
  },
  {
    id: 'imac-desk-setup',
    label: 'iMac',
    url: '/procedural/desktop-computer/imac',
    renderKind: 'desktop-computer',
    position: { x: 0.56, z: -2.18 },
    placement: 'floor',
    elevationM: 0.555,
    rotationY: 0,
    targetSize: 0.58,
    dimensionsM: { x: 0.55, y: 0.46, z: 0.24 },
    locked: true,
  },
  {
    id: 'macbook-air',
    label: 'MacBook Air',
    url: '/procedural/laptop/macbook-air',
    renderKind: 'laptop',
    position: { x: 0.92, z: -2.04 },
    placement: 'floor',
    elevationM: 0.555,
    rotationY: 0,
    targetSize: 0.31,
    dimensionsM: { x: 0.31, y: 0.04, z: 0.22 },
    locked: true,
  },
  {
    id: 'homepod-mini',
    label: 'HomePod mini',
    url: '/procedural/smart-speaker/homepod-mini',
    renderKind: 'smart-speaker',
    position: { x: 0.18, z: -2.06 },
    placement: 'floor',
    elevationM: 0.555,
    rotationY: 0,
    targetSize: 0.1,
    dimensionsM: { x: 0.1, y: 0.085, z: 0.1 },
    locked: true,
  },
  {
    id: 'bookcase-left',
    label: '606 Universal Shelving',
    ...modelAsset('/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb'),
    catalogItemId: 'wooden_display_shelves_01',
    productCategory: 'storage',
    renderKind: 'model',
    position: { x: -2.02, z: -2.52 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 2,
    targetSize: 1.98,
    dimensionsM: { x: 0.473, y: 1.98, z: 1.371 },
    locked: true,
  },
  {
    id: 'storage-right',
    label: 'Rounded Commode',
    url: '/assets/models/manual/zeel-by-furniture-rounded-commode.optimized.glb',
    catalogItemId: 'zeel-by-furniture-rounded-commode',
    productCategory: 'storage',
    renderKind: 'model',
    position: { x: 2.02, z: -2.22 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.5,
    dimensionsM: { x: 1.5, y: 0.8, z: 0.5 },
  },
  {
    id: 'office-rug',
    label: 'Caban Boucle Rug',
    url: '/procedural/area-rug/polyhaven-caban-boucle-rug',
    catalogItemId: 'polyhaven-caban-boucle-rug',
    productCategory: 'rug',
    renderKind: 'area-rug',
    position: { x: 0.14, z: 0.58 },
    placement: 'floor',
    elevationM: 0.012,
    rotationY: 0,
    targetSize: 3.25,
    dimensionsM: { x: 3.25, y: 0.03, z: 2.16 },
    locked: true,
  },
  {
    id: 'lounge-sofa',
    label: 'Hackney Sofa',
    ...modelAsset('/assets/models/manual/dimensiva-hackney-sofa-by-hay.optimized.glb'),
    catalogItemId: 'dimensiva-hackney-sofa-by-hay',
    productCategory: 'sofa',
    renderKind: 'model',
    position: { x: 0.76, z: 1.64 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI,
    boundsRotationY: Math.PI,
    targetSize: 2.2,
    dimensionsM: { x: 2.2, y: 0.82, z: 0.94 },
    locked: true,
  },
  {
    id: 'lounge-coffee-table',
    label: 'Ibiza Forte Coffee Table',
    ...modelAsset('/assets/models/manual/dimensiva-ibiza-forte-coffee-table-by-ritzwell.optimized.glb'),
    catalogItemId: 'dimensiva-ibiza-forte-coffee-table-by-ritzwell',
    productCategory: 'table',
    renderKind: 'model',
    position: { x: 0.24, z: 0.44 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.1,
    dimensionsM: { x: 1.1, y: 0.46, z: 0.7 },
    locked: true,
  },
  {
    id: 'coffee-table-books',
    label: 'Coffee Table Books',
    ...modelAsset('/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb'),
    catalogItemId: 'book_encyclopedia_set_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 0.02, z: 0.32 },
    placement: 'floor',
    elevationM: 0.48,
    rotationY: Math.PI / 10,
    targetSize: 0.24,
    dimensionsM: { x: 0.24, y: 0.103, z: 0.071 },
    locked: true,
  },
  {
    id: 'coffee-table-vase',
    label: 'Small Vase',
    ...modelAsset('/assets/models/polyhaven/ceramic_vase_03.optimized.glb'),
    catalogItemId: 'ceramic_vase_03',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 0.42, z: 0.48 },
    placement: 'floor',
    elevationM: 0.48,
    rotationY: -Math.PI / 8,
    targetSize: 0.2,
    dimensionsM: { x: 0.12, y: 0.2, z: 0.12 },
    locked: true,
  },
  {
    id: 'window-main',
    label: 'Modern Awning Crank Out',
    ...modelAsset('/assets/models/architectural/modern-wide-picture-window.optimized.glb'),
    renderKind: 'model',
    position: { x: 0.32, z: -2.84 },
    placement: 'wall',
    elevationM: 0.92,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 1.524,
    dimensionsM: { x: 1.524, y: 1.0668, z: 0.1143 },
    locked: true,
  },
  {
    id: 'window-curtains-main',
    label: 'Sheer Curtains',
    url: '/procedural/window-curtains',
    renderKind: 'window-curtains',
    position: { x: 0.32, z: -2.835 },
    placement: 'wall',
    elevationM: 0.68,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 2.06,
    dimensionsM: { x: 2.06, y: 1.56, z: 0.08 },
    locked: true,
  },
  {
    id: 'wall-art-left',
    label: 'Abstract Print',
    url: '/procedural/wall-art-left',
    renderKind: 'wall-art',
    position: { x: -2.685, z: -1.52 },
    placement: 'wall',
    elevationM: 1.28,
    rotationY: Math.PI / 2,
    boundsRotationY: Math.PI / 2,
    wallSurfacePlane: 'yz',
    targetSize: 0.58,
    dimensionsM: { x: 0.42, y: 0.58, z: 0.04 },
  },
  {
    id: 'wall-art-right',
    label: 'Accent Print',
    url: '/procedural/wall-art-right',
    renderKind: 'wall-art',
    position: { x: -2.685, z: -0.72 },
    placement: 'wall',
    elevationM: 1.16,
    rotationY: Math.PI / 2,
    boundsRotationY: Math.PI / 2,
    wallSurfacePlane: 'yz',
    targetSize: 0.44,
    dimensionsM: { x: 0.3, y: 0.44, z: 0.04 },
  },
  {
    id: 'bookshelf-books-upper',
    label: 'Decorative Book Set',
    url: '/procedural/book-stack/decorative-hardcover',
    catalogItemId: 'polyhaven-decorative-book-set-01',
    productCategory: 'decor',
    renderKind: 'book-stack',
    position: { x: -2.18, z: -1.52 },
    placement: 'floor',
    elevationM: 1.08,
    rotationY: Math.PI / 2,
    targetSize: 0.34,
    dimensionsM: { x: 0.34, y: 0.039, z: 0.044 },
    anchor: { parentId: 'bookcase-left', slotId: 'top-left-books', localRotationY: 0 },
    locked: true,
  },
  {
    id: 'bookshelf-books-upper-right',
    label: 'Paperback Book Set',
    url: '/procedural/book-stack/paperback',
    catalogItemId: 'polyhaven-decorative-book-set-01',
    productCategory: 'decor',
    renderKind: 'book-stack',
    position: { x: -2.18, z: -0.82 },
    placement: 'floor',
    elevationM: 1.08,
    rotationY: Math.PI / 2,
    targetSize: 0.22,
    dimensionsM: { x: 0.22, y: 0.025, z: 0.028 },
    anchor: { parentId: 'bookcase-left', slotId: 'top-right-books', localRotationY: 0 },
    locked: true,
  },
  {
    id: 'bookshelf-vase-top',
    label: 'Shelf Vase',
    ...modelAsset('/assets/models/polyhaven/ceramic_vase_02.optimized.glb'),
    catalogItemId: 'ceramic_vase_02',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -2.18, z: -1.06 },
    placement: 'floor',
    elevationM: 1.34,
    rotationY: Math.PI / 6,
    targetSize: 0.17,
    dimensionsM: { x: 0.12, y: 0.17, z: 0.12 },
    anchor: { parentId: 'bookcase-left', slotId: 'top-center-vase', localRotationY: -Math.PI / 3 },
    locked: true,
  },
  {
    id: 'bookshelf-books-middle',
    label: 'Encyclopedia Stack',
    ...modelAsset('/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb'),
    catalogItemId: 'book_encyclopedia_set_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -2.19, z: -0.92 },
    placement: 'floor',
    elevationM: 0.63,
    rotationY: Math.PI / 2,
    targetSize: 0.24,
    dimensionsM: { x: 0.24, y: 0.103, z: 0.071 },
    anchor: { parentId: 'bookcase-left', slotId: 'middle-center-books', localRotationY: 0 },
    locked: true,
  },
  {
    id: 'bookshelf-books-middle-left',
    label: 'Decorative Hardcover Set',
    url: '/procedural/book-stack/decorative-hardcover',
    catalogItemId: 'polyhaven-decorative-book-set-01',
    productCategory: 'decor',
    renderKind: 'book-stack',
    position: { x: -2.18, z: -1.42 },
    placement: 'floor',
    elevationM: 0.63,
    rotationY: Math.PI / 2,
    targetSize: 0.21,
    dimensionsM: { x: 0.21, y: 0.024, z: 0.027 },
    anchor: { parentId: 'bookcase-left', slotId: 'middle-left-books', localRotationY: 0 },
    locked: true,
  },
  {
    id: 'bookshelf-bookend',
    label: 'Bookend',
    url: '/assets/models/manual/dimensiva-stop-bookend-by-e15.optimized.glb',
    catalogItemId: 'dimensiva-stop-bookend-by-e15',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -2.18, z: -1.01 },
    placement: 'floor',
    elevationM: 0.63,
    rotationY: Math.PI / 2,
    targetSize: 0.16,
    dimensionsM: { x: 0.16, y: 0.109, z: 0.064 },
    anchor: { parentId: 'bookcase-left', slotId: 'middle-center-bookend', localRotationY: 0 },
    locked: true,
  },
  {
    id: 'bookshelf-books-lower',
    label: 'Reference Books',
    ...modelAsset('/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb'),
    catalogItemId: 'book_encyclopedia_set_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -2.18, z: -1.28 },
    placement: 'floor',
    elevationM: 0.19,
    rotationY: Math.PI / 2,
    targetSize: 0.22,
    dimensionsM: { x: 0.22, y: 0.095, z: 0.065 },
    anchor: { parentId: 'bookcase-left', slotId: 'lower-center-books', localRotationY: 0 },
    locked: true,
  },
  {
    id: 'bookshelf-vase-lower',
    label: 'Shelf Vase',
    ...modelAsset('/assets/models/polyhaven/ceramic_vase_02.optimized.glb'),
    catalogItemId: 'ceramic_vase_02',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -2.18, z: -0.88 },
    placement: 'floor',
    elevationM: 0.19,
    rotationY: Math.PI / 6,
    targetSize: 0.15,
    dimensionsM: { x: 0.106, y: 0.15, z: 0.106 },
    anchor: { parentId: 'bookcase-left', slotId: 'lower-right-vase', localRotationY: -Math.PI / 3 },
    locked: true,
  },
  {
    id: 'floor-plant',
    label: 'Potted Plant',
    ...modelAsset('/assets/models/polyhaven/potted_plant_04.optimized.glb'),
    catalogItemId: 'potted_plant_04',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -2.16, z: 1.82 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.78,
    dimensionsM: { x: 0.49, y: 0.78, z: 0.54 },
  },
  {
    id: 'tall-plant-right',
    label: 'Potted Plant',
    ...modelAsset('/assets/models/polyhaven/potted_plant_01.optimized.glb'),
    catalogItemId: 'potted_plant_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 2.2, z: 0.34 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: -Math.PI / 7,
    targetSize: 1.18,
    dimensionsM: { x: 0.48, y: 1.18, z: 0.48 },
    locked: true,
  },
  {
    id: 'small-plant',
    label: 'Ceramic Vase',
    ...modelAsset('/assets/models/polyhaven/ceramic_vase_01.optimized.glb'),
    catalogItemId: 'ceramic_vase_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 2.22, z: -2.02 },
    placement: 'floor',
    elevationM: 0.96,
    rotationY: 0,
    targetSize: 0.32,
    dimensionsM: { x: 0.163, y: 0.32, z: 0.163 },
  },
  {
    id: 'storage-books-top',
    label: 'Commode Book Stack',
    ...modelAsset('/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb'),
    catalogItemId: 'book_encyclopedia_set_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 1.72, z: -2.08 },
    placement: 'floor',
    elevationM: 0.84,
    rotationY: -Math.PI / 8,
    targetSize: 0.24,
    dimensionsM: { x: 0.24, y: 0.103, z: 0.071 },
    locked: true,
  },
  {
    id: 'back-wall-mirror',
    label: 'Arceau Mirror',
    ...modelAsset('/assets/models/manual/designconnected-arceau-mirrors-9820.optimized.glb'),
    catalogItemId: 'designconnected-arceau-mirrors-9820',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 1.92, z: -2.84 },
    placement: 'wall',
    elevationM: 1.25,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 0.72,
    dimensionsM: { x: 0.56, y: 0.72, z: 0.08 },
    locked: true,
  },
  {
    id: 'reading-chair',
    label: 'Blown Armchair',
    url: '/assets/models/manual/zeel-by-furniture-blown-armchair.optimized.glb',
    catalogItemId: 'zeel-by-furniture-blown-armchair',
    productCategory: 'chair',
    renderKind: 'model',
    position: { x: -1.38, z: 0.88 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 5,
    targetSize: 1.02,
    dimensionsM: { x: 1.02, y: 0.787, z: 0.999 },
  },
  {
    id: 'reading-side-table',
    label: 'Slit Side Table',
    url: '/assets/models/manual/dimensiva-slit-side-table-round-high-by-hay.optimized.glb',
    catalogItemId: 'dimensiva-slit-side-table-round-high-by-hay',
    productCategory: 'table',
    renderKind: 'model',
    position: { x: -0.92, z: 1.22 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.48,
    dimensionsM: { x: 0.357, y: 0.48, z: 0.357 },
  },
  {
    id: 'reading-lamp',
    label: 'Toio Floor Lamp',
    ...modelAsset('/assets/models/manual/dimensiva-toio-led-floor-lamp-by-flos.optimized.glb'),
    catalogItemId: 'dimensiva-toio-led-floor-lamp-by-flos',
    productCategory: 'lighting',
    renderKind: 'model',
    position: { x: -2.22, z: 0.72 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.9,
    dimensionsM: { x: 0.478, y: 1.9, z: 0.503 },
  },
]

function cloneInitialObjects() {
  return resolveAnchoredObjects(
    INITIAL_OBJECTS.map(cloneObject),
  )
}

export const useEditorObjectsStore = create<EditorObjectsState>((set) => ({
  objects: cloneInitialObjects(),
  editMode: 'idle',
  activeDragMode: null,
  resetObjects: () => set({ objects: cloneInitialObjects(), editMode: 'idle', activeDragMode: null }),
  addObject: (object) =>
    set((state) => ({
      objects: resolveAnchoredObjects([...state.objects, normalizeEditorObject(object)]),
      editMode: 'idle',
      activeDragMode: null,
    })),
  setObjectsForDebug: (objects) =>
    set({
      objects: resolveAnchoredObjects(
        objects.map(cloneObject),
      ),
      editMode: 'idle',
      activeDragMode: null,
    }),
  setEditMode: (editMode) => set({ editMode }),
  setActiveDragMode: (activeDragMode) => set({ activeDragMode }),
  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      editMode: 'idle',
      activeDragMode: null,
    })),
  replaceObject: (id, replacement) =>
    set((state) => ({
      objects: resolveAnchoredObjects(
        state.objects.map((object) =>
          object.id === id
            ? normalizeEditorObject({
                ...object,
                ...replacement,
                dimensionsM: { ...replacement.dimensionsM },
              })
            : object,
        ),
      ),
      editMode: 'idle',
      activeDragMode: null,
    })),
  updateObject: (id, patch) =>
    set((state) => ({
      objects: resolveAnchoredObjects(
        state.objects.map((object) =>
          object.id === id
            ? mergeObjectPatch(object, patch)
            : object,
        ),
      ),
    })),
}))
