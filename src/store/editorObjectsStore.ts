import { create } from 'zustand'
import { modelUrlWithBestVariant } from '@/constants/modelVariants'
import type { ProductCategory } from '@/constants/productCatalog'
import { normalizeRotation } from '@/domain/placementConstraints'
import type { Vec2 } from '@/domain/types'

export type EditorObjectPlacement = 'floor' | 'wall' | 'ceiling'
export type WallSurfacePlane = 'xy' | 'yz'
export type EditorObjectRotationMode = 'orthogonal' | 'free'
export type EditorObjectRenderKind =
  | 'model'
  | 'area-rug'
  | 'floor-lamp'
  | 'plant'
  | 'desk-monitor'
  | 'laptop'
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
    label: 'Dita Writing Desk',
    url: modelUrlWithBestVariant('/assets/models/manual/designconnected-dita-desk-with-drawer-10712.optimized.glb'),
    catalogItemId: 'designconnected-dita-desk-with-drawer-10712',
    productCategory: 'table',
    renderKind: 'model',
    position: { x: 0.3, z: -2.02 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.2,
    dimensionsM: { x: 1.2, y: 0.84, z: 0.55 },
    locked: true,
  },
  {
    id: 'armchair',
    label: 'Mikado Task Chair',
    url: modelUrlWithBestVariant('/assets/models/manual/vitra-mikado-armchair-5-star-base-9343625.optimized.glb'),
    catalogItemId: 'vitra-mikado-armchair-5-star-base-9343625',
    productCategory: 'chair',
    renderKind: 'model',
    position: { x: 0.28, z: -1.13 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI,
    boundsRotationY: Math.PI,
    targetSize: 0.88,
    dimensionsM: { x: 0.66, y: 0.88, z: 0.7 },
  },
  {
    id: 'desk-lamp',
    label: 'Quille Desk Lamp',
    url: modelUrlWithBestVariant('/assets/models/manual/designconnected-quille-desk-lamp-8203.optimized.glb'),
    catalogItemId: 'designconnected-quille-desk-lamp-8203',
    productCategory: 'lighting',
    renderKind: 'model',
    position: { x: 0.86, z: -1.9 },
    placement: 'floor',
    elevationM: 0.86,
    rotationY: -Math.PI / 12,
    targetSize: 0.58,
    dimensionsM: { x: 0.53, y: 0.58, z: 0.03 },
    locked: true,
  },
  {
    id: 'desk-organizer',
    label: 'Desktop Organizer',
    url: modelUrlWithBestVariant('/assets/models/manual/muuto-arrange-dekstop-series-878326222384693.optimized.glb'),
    catalogItemId: 'muuto-arrange-dekstop-series-878326222384693',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 0.54, z: -1.86 },
    placement: 'floor',
    elevationM: 0.87,
    rotationY: Math.PI / 18,
    targetSize: 0.3,
    dimensionsM: { x: 0.23, y: 0.3, z: 0.1 },
    locked: true,
  },
  {
    id: 'desk-monitor',
    label: 'Slim Monitor',
    url: '/procedural/desk-monitor',
    renderKind: 'desk-monitor',
    position: { x: 0.18, z: -2.2 },
    placement: 'floor',
    elevationM: 0.86,
    rotationY: 0,
    targetSize: 0.46,
    dimensionsM: { x: 0.46, y: 0.42, z: 0.14 },
    locked: true,
  },
  {
    id: 'laptop',
    label: 'Open Laptop',
    url: '/procedural/laptop',
    renderKind: 'laptop',
    position: { x: 0.2, z: -1.88 },
    placement: 'floor',
    elevationM: 0.865,
    rotationY: 0,
    targetSize: 0.32,
    dimensionsM: { x: 0.32, y: 0.2, z: 0.23 },
    locked: true,
  },
  {
    id: 'bookcase-left',
    label: 'Stacked Bookcase',
    url: modelUrlWithBestVariant('/assets/models/manual/muuto-stacked-storage-system-324705387045373.optimized.glb'),
    catalogItemId: 'muuto-stacked-storage-system-324705387045373',
    productCategory: 'storage',
    renderKind: 'model',
    position: { x: -1.62, z: -2.12 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.72,
    dimensionsM: { x: 1.23, y: 1.01, z: 1.72 },
    locked: true,
  },
  {
    id: 'storage-right',
    label: 'White File Pedestal',
    url: modelUrlWithBestVariant('/assets/models/manual/dimensiva-next-desk-body-by-mobimex.optimized.glb'),
    catalogItemId: 'dimensiva-next-desk-body-by-mobimex',
    productCategory: 'storage',
    renderKind: 'model',
    position: { x: 1.35, z: -1.72 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.68,
    dimensionsM: { x: 0.45, y: 0.68, z: 0.7 },
  },
  {
    id: 'reading-lamp',
    label: 'Hello Floor Lamp',
    url: modelUrlWithBestVariant('/assets/models/manual/dimensiva-hello-floor-lamp-by-normann-copenhagen.optimized.glb'),
    catalogItemId: 'dimensiva-hello-floor-lamp-by-normann-copenhagen',
    productCategory: 'lighting',
    renderKind: 'model',
    position: { x: -1.62, z: 0.62 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: -Math.PI / 8,
    targetSize: 1.6,
    dimensionsM: { x: 0.51, y: 1.6, z: 1.31 },
  },
  {
    id: 'lounge-chair',
    label: 'Oyster Reading Chair',
    url: modelUrlWithBestVariant('/assets/models/manual/dimensiva-oyster-light-armchair-by-i4marini.optimized.glb'),
    catalogItemId: 'dimensiva-oyster-light-armchair-by-i4marini',
    productCategory: 'chair',
    renderKind: 'model',
    position: { x: -0.96, z: 0.95 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 5,
    boundsRotationY: Math.PI / 5,
    targetSize: 0.88,
    dimensionsM: { x: 0.75, y: 0.88, z: 0.91 },
  },
  {
    id: 'round-side-table',
    label: 'Side Table',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/side_table_01.optimized.glb'),
    catalogItemId: 'side_table_01',
    productCategory: 'table',
    renderKind: 'model',
    position: { x: -1.62, z: 1.24 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.56,
    dimensionsM: { x: 0.559, y: 0.56, z: 0.458 },
  },
  {
    id: 'office-rug',
    label: 'Wool Area Rug',
    url: '/procedural/area-rug',
    renderKind: 'area-rug',
    position: { x: -0.1, z: -0.18 },
    placement: 'floor',
    elevationM: 0.012,
    rotationY: 0,
    targetSize: 1.92,
    dimensionsM: { x: 1.92, y: 0.03, z: 1.28 },
    locked: true,
  },
  {
    id: 'window-main',
    label: 'Modern Awning Crank Out',
    url: modelUrlWithBestVariant('/assets/models/architectural/modern-wide-picture-window.optimized.glb'),
    renderKind: 'model',
    position: { x: 1.05, z: -2.45 },
    placement: 'wall',
    elevationM: 1.18,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 1.58,
    dimensionsM: { x: 1.58, y: 0.98, z: 0.1 },
    locked: true,
  },
  {
    id: 'window-curtains-main',
    label: 'Sheer Curtains',
    url: '/procedural/window-curtains',
    renderKind: 'window-curtains',
    position: { x: 1.05, z: -2.44 },
    placement: 'wall',
    elevationM: 0.88,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 1.9,
    dimensionsM: { x: 1.9, y: 1.36, z: 0.08 },
    locked: true,
  },
  {
    id: 'wall-art-back',
    label: 'Framed Print',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb'),
    catalogItemId: 'hanging_picture_frame_02',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -0.55, z: -2.485 },
    placement: 'wall',
    elevationM: 1.42,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 0.48,
    dimensionsM: { x: 0.48, y: 0.32, z: 0.03 },
  },
  {
    id: 'wall-art-small',
    label: 'Small Print',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb'),
    catalogItemId: 'hanging_picture_frame_01',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -0.08, z: -2.485 },
    placement: 'wall',
    elevationM: 1.45,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 0.38,
    dimensionsM: { x: 0.268, y: 0.38, z: 0.007 },
  },
  {
    id: 'floor-plant',
    label: 'Potted Plant',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/potted_plant_04.optimized.glb'),
    catalogItemId: 'potted_plant_04',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 1.66, z: -1.12 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.76,
    dimensionsM: { x: 0.477, y: 0.76, z: 0.525 },
  },
  {
    id: 'small-plant',
    label: 'Lotus Vase',
    url: modelUrlWithBestVariant('/assets/models/manual/dimensiva-lotus-vase-by-101-copenhagen.optimized.glb'),
    catalogItemId: 'dimensiva-lotus-vase-by-101-copenhagen',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -0.78, z: -2.08 },
    placement: 'floor',
    elevationM: 0.86,
    rotationY: 0,
    targetSize: 0.34,
    dimensionsM: { x: 0.34, y: 0.23, z: 0.19 },
  },
  {
    id: 'desk-bookend',
    label: 'Marble Bookend',
    url: modelUrlWithBestVariant('/assets/models/manual/dimensiva-stop-bookend-by-e15.optimized.glb'),
    catalogItemId: 'dimensiva-stop-bookend-by-e15',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -0.06, z: -1.92 },
    placement: 'floor',
    elevationM: 0.87,
    rotationY: -Math.PI / 10,
    targetSize: 0.22,
    dimensionsM: { x: 0.22, y: 0.15, z: 0.09 },
    locked: true,
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
