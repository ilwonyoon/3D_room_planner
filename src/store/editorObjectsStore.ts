import { create } from 'zustand'
import type { ProductCategory } from '@/constants/productCatalog'
import { normalizeRotation } from '@/domain/placementConstraints'
import type { Vec2 } from '@/domain/types'

export type EditorObjectPlacement = 'floor' | 'wall' | 'ceiling'
export type WallSurfacePlane = 'xy' | 'yz'
export type EditorObjectRotationMode = 'orthogonal' | 'free'
export type EditorObjectRenderKind =
  | 'book-stack'
  | 'desk-styling'
  | 'model'
  | 'area-rug'
  | 'desktop-computer'
  | 'floor-cushion-set'
  | 'floor-lamp'
  | 'laptop'
  | 'plant'
  | 'sofa-textiles'
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
    'top-left-books': { localPositionM: { x: -0.2, y: 1.428, z: 0.02 } },
    'top-center-vase': { localPositionM: { x: 0.18, y: 1.408, z: 0.02 } },
    'top-right-books': { localPositionM: { x: 0.14, y: 1.428, z: 0.02 } },
    'middle-left-books': { localPositionM: { x: -0.22, y: 0.998, z: 0.02 } },
    'middle-center-books': { localPositionM: { x: 0.16, y: 0.998, z: 0.02 } },
    'middle-center-bookend': { localPositionM: { x: 0.34, y: 0.998, z: 0.02 } },
    'middle-right-bookend': { localPositionM: { x: 0.36, y: 0.578, z: 0.02 } },
    'lower-center-books': { localPositionM: { x: -0.18, y: 0.578, z: 0.02 } },
    'lower-right-vase': { localPositionM: { x: 0.18, y: 0.578, z: 0.02 } },
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

// Bathroom MVP seed — eight real Trellis-generated GLBs.
//
// Room is 3.6w × 1.8d × 2.4h m (x ∈ [-1.8, 1.8], z ∈ [-0.9, 0.9]).
// Camera faces -z (looks at the back wall). Layout reads as a front
// elevation, matching the reference framing in docs/bond-demo/19:
//
//   x = -1.2 (back, left of center)  → toilet, facing forward (+z)
//   x =  0.0 (back center)           → vanity flush to back wall
//                                       → mirror + sconces above
//                                       → faucet on counter
//   x = +1.3 (back, right of center) → tub freestanding, against right wall
//   x = -1.65 (left wall)            → shower head fixture, height-mounted
//   x = -0.6 (back wall)             → towel bar
//
// All fixtures: rotationY 0 means model's "front" faces +z (toward camera).
// `targetSize` = LONGEST native dim in meters (R3F loader scales accordingly).
// `dimensionsM` is informational; here matches Lowe's standard fixture specs.
// Eight default fixtures, each pinned to a real catalog SKU.
// `catalogItemId` is the source of truth — that ID drives the cart bar
// (price lookup) and lets the agent swap models by referencing catalog rows.
// `url` mirrors the catalog's `glb_path` so R3F can load the mesh directly
// without an extra lookup pass. To replace any of these with another SKU,
// just swap catalogItemId + url together.
//
// Anchors picked from data/catalog.json (465 SKUs):
//   vanity   → Avery Dark Blue 48-in (scenario A anchor, navy + brushed gold)
//   mirror   → Black 18×35 Oval
//   faucet   → Delta Arvo Chrome 4-in centerset
//   sconce   → Adani Black Double
//   toilet   → American Standard Cadet
//   tub      → Brooklyn 60×30 Freestanding
//   shower   → Delta Arcadia Champagne Bronze Tub+Shower System
//   towelbar → Delta Arcadia Matte Black 22-in
const INITIAL_OBJECTS: EditorObject[] = [
  {
    id: 'bathroom-vanity',
    catalogItemId: '1b15849d-6f94-46cd-af1c-c6f09fd5f09a',
    label: 'Avery 48-in Dark Blue Vanity (Wyndham Collection)',
    url: '/models/vanities/1b15849d-6f94-46cd-af1c-c6f09fd5f09a.glb',
    productCategory: 'storage',
    renderKind: 'model',
    position: { x: 0.0, z: -0.68 },
    placement: 'floor',
    elevationM: 0.0,
    rotationY: 0,
    targetSize: 1.22,
    dimensionsM: { x: 1.22, y: 0.91, z: 0.55 },
    locked: false,
  },
  {
    id: 'bathroom-mirror',
    catalogItemId: 'b473d228-86b4-497b-bca2-5f3fcfed4b12',
    label: 'Black 18-in x 35-in Oval Mirror',
    url: '/models/mirror/b473d228-86b4-497b-bca2-5f3fcfed4b12.glb',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 0.0, z: -0.89 },
    placement: 'wall',
    elevationM: 1.35,
    rotationY: 0,
    targetSize: 0.89,
    dimensionsM: { x: 0.46, y: 0.89, z: 0.05 },
    locked: false,
  },
  {
    id: 'bathroom-faucet',
    catalogItemId: 'a3b77ec6-0449-4ca8-928b-fdd090051cc7',
    label: 'Delta Arvo Chrome 4-in Centerset Faucet',
    url: '/models/faucets/a3b77ec6-0449-4ca8-928b-fdd090051cc7.glb',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: 0.0, z: -0.74 },
    placement: 'floor',
    elevationM: 0.91,
    rotationY: 0,
    targetSize: 0.20,
    dimensionsM: { x: 0.20, y: 0.12, z: 0.11 },
    locked: false,
  },
  {
    id: 'bathroom-lighting',
    catalogItemId: '484d76c7-7b82-4af4-aab6-218d1ff750b9',
    label: 'Adani Black Double Sconce',
    url: '/models/decorative-lighting/484d76c7-7b82-4af4-aab6-218d1ff750b9.glb',
    productCategory: 'lighting',
    renderKind: 'model',
    position: { x: 0.0, z: -0.89 },
    placement: 'wall',
    elevationM: 2.05,
    rotationY: 0,
    targetSize: 0.30,
    dimensionsM: { x: 0.30, y: 0.20, z: 0.13 },
    locked: false,
  },
  {
    id: 'bathroom-toilet',
    catalogItemId: '9bcad876-2d1b-4653-8f6c-a1f551d4aa4c',
    label: 'American Standard Cadet White Toilet',
    url: '/models/toilet/9bcad876-2d1b-4653-8f6c-a1f551d4aa4c.glb',
    productCategory: 'chair',
    renderKind: 'model',
    position: { x: -1.2, z: -0.5 },
    placement: 'floor',
    elevationM: 0.0,
    rotationY: 0,
    targetSize: 0.78,
    dimensionsM: { x: 0.44, y: 0.78, z: 0.75 },
    locked: false,
  },
  {
    id: 'bathroom-tub',
    catalogItemId: '7f19f1e0-5287-4a07-af89-c1c8ad0e688c',
    label: 'Brooklyn 60×30 White Freestanding Tub',
    url: '/models/tubs/7f19f1e0-5287-4a07-af89-c1c8ad0e688c.glb',
    productCategory: 'sofa',
    renderKind: 'model',
    position: { x: 1.45, z: -0.14 },
    placement: 'floor',
    elevationM: 0.0,
    rotationY: Math.PI,
    targetSize: 1.52,
    dimensionsM: { x: 1.52, y: 0.59, z: 0.76 },
    locked: false,
  },
  {
    id: 'bathroom-shower',
    catalogItemId: '19126f90-60ea-4a2a-9138-03ff575c4b17',
    label: 'Delta Arcadia Champagne Bronze Shower System',
    url: '/models/shower-systems/19126f90-60ea-4a2a-9138-03ff575c4b17.glb',
    productCategory: 'storage',
    renderKind: 'model',
    position: { x: 1.46, z: -0.65 },
    placement: 'wall',
    elevationM: 0.81,
    rotationY: 0,
    targetSize: 1.0,
    dimensionsM: { x: 0.21, y: 1.0, z: 0.51 },
    locked: false,
  },
  {
    id: 'bathroom-towelbar',
    catalogItemId: 'd2b5d0c6-c697-40e4-938d-f8e9f6c04523',
    label: 'Delta Arcadia Matte Black 22-in Towel Bar',
    url: '/models/towel-bars/d2b5d0c6-c697-40e4-938d-f8e9f6c04523.glb',
    productCategory: 'decor',
    renderKind: 'model',
    position: { x: -1.21, z: -0.83 },
    placement: 'wall',
    elevationM: 1.12,
    rotationY: 0,
    targetSize: 0.56,
    dimensionsM: { x: 0.56, y: 0.06, z: 0.10 },
    locked: false,
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
    set((state) => {
      const next = resolveAnchoredObjects(
        state.objects.map((object) =>
          object.id === id
            ? mergeObjectPatch(object, patch)
            : object,
        ),
      )
      // Dev helper: when you drag a fixture in the browser, this dumps a
      // copy-pasteable snippet of its current position / rotation /
      // elevation so the values can be moved straight into INITIAL_OBJECTS.
      const obj = next.find((o) => o.id === id)
      if (obj) {
        const pos = obj.position
        const rotY = obj.rotationY ?? 0
        const elev = obj.elevationM ?? 0
        console.log(
          `[layout] ${obj.id}\n` +
          `  position: { x: ${pos.x.toFixed(2)}, z: ${pos.z.toFixed(2)} },\n` +
          `  elevationM: ${elev.toFixed(2)},\n` +
          `  rotationY: ${rotY.toFixed(3)},`,
        )
      }
      return { objects: next }
    }),
}))
