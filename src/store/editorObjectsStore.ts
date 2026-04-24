import { create } from 'zustand'
import { modelUrlWithBestVariant } from '@/constants/modelVariants'
import type { Vec2 } from '@/domain/types'

export type EditorObjectPlacement = 'floor' | 'wall' | 'ceiling'
export type WallSurfacePlane = 'xy' | 'yz'
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

export type EditorObject = {
  id: string
  label: string
  url: string
  renderKind?: EditorObjectRenderKind
  position: Vec2
  placement: EditorObjectPlacement
  elevationM: number
  rotationY: number
  boundsRotationY?: number
  wallSurfacePlane?: WallSurfacePlane
  targetSize: number
  dimensionsM: { x: number; y: number; z: number }
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
  updateObject: (
    id: string,
    patch: Partial<Pick<EditorObject, 'position' | 'elevationM' | 'rotationY' | 'boundsRotationY' | 'dimensionsM'>>,
  ) => void
}

const INITIAL_OBJECTS: EditorObject[] = [
  {
    id: 'desk',
    label: 'Dita Writing Desk',
    url: modelUrlWithBestVariant('/assets/models/manual/designconnected-dita-desk-with-drawer-10712.optimized.glb'),
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
    label: 'Picture Window',
    url: modelUrlWithBestVariant('/assets/models/architectural/modern-wide-picture-window.optimized.glb'),
    renderKind: 'window-opening',
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
    id: 'wall-art-back',
    label: 'Framed Print',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb'),
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
  return INITIAL_OBJECTS.map((object) => ({
    ...object,
    position: { ...object.position },
    dimensionsM: { ...object.dimensionsM },
  }))
}

export const useEditorObjectsStore = create<EditorObjectsState>((set) => ({
  objects: cloneInitialObjects(),
  editMode: 'idle',
  activeDragMode: null,
  resetObjects: () => set({ objects: cloneInitialObjects(), editMode: 'idle', activeDragMode: null }),
  addObject: (object) =>
    set((state) => ({
      objects: [...state.objects, object],
      editMode: 'idle',
      activeDragMode: null,
    })),
  setObjectsForDebug: (objects) =>
    set({
      objects: objects.map((object) => ({
        ...object,
        position: { ...object.position },
        dimensionsM: { ...object.dimensionsM },
      })),
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
  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id
          ? {
              ...object,
              ...patch,
              position: patch.position ? { ...patch.position } : object.position,
            }
          : object,
      ),
    })),
}))
