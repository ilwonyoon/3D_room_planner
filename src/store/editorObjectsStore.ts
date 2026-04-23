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
    label: 'Executive Desk',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/metal_office_desk.optimized.glb'),
    renderKind: 'model',
    position: { x: 0.54, z: -2.02 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.68,
    dimensionsM: { x: 1.68, y: 0.661, z: 0.796 },
    locked: true,
  },
  {
    id: 'armchair',
    label: 'Work Chair',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/modern_arm_chair_01.optimized.glb'),
    renderKind: 'model',
    position: { x: 0.58, z: -1.22 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI,
    boundsRotationY: Math.PI,
    targetSize: 0.84,
    dimensionsM: { x: 0.674, y: 0.84, z: 0.81 },
  },
  {
    id: 'desk-lamp',
    label: 'Desk Lamp',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/desk_lamp_arm_01.optimized.glb'),
    renderKind: 'model',
    position: { x: 1.14, z: -1.95 },
    placement: 'floor',
    elevationM: 0.78,
    rotationY: 0,
    targetSize: 0.48,
    dimensionsM: { x: 0.108, y: 0.48, z: 0.33 },
    locked: true,
  },
  {
    id: 'bookcase-left',
    label: 'Display Shelves',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/steel_frame_shelves_03.optimized.glb'),
    renderKind: 'model',
    position: { x: -2.06, z: -0.72 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 2,
    targetSize: 1.72,
    dimensionsM: { x: 1.72, y: 1.691, z: 0.528 },
    locked: true,
  },
  {
    id: 'storage-right',
    label: 'Beyla Cabinet',
    url: '/assets/models/manual/dimensiva-beyla-shoe-cabinet-by-kave-home.optimized.glb',
    renderKind: 'model',
    position: { x: 1.84, z: -1.88 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.2,
    dimensionsM: { x: 1.2, y: 0.92, z: 0.45 },
  },
  {
    id: 'reading-lamp',
    label: 'Floor Lamp',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb'),
    renderKind: 'model',
    position: { x: -1.96, z: 0.48 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 7,
    targetSize: 1.6,
    dimensionsM: { x: 0.804, y: 1.6, z: 1.151 },
  },
  {
    id: 'lounge-chair',
    label: 'Reading Chair',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/modern_arm_chair_01.optimized.glb'),
    renderKind: 'model',
    position: { x: -1.34, z: 1.06 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: Math.PI / 3.05,
    boundsRotationY: Math.PI / 3.05,
    targetSize: 0.88,
    dimensionsM: { x: 0.706, y: 0.88, z: 0.849 },
  },
  {
    id: 'round-side-table',
    label: 'Side Table',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/side_table_01.optimized.glb'),
    renderKind: 'model',
    position: { x: -0.82, z: 1.3 },
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
    position: { x: 0.24, z: -0.18 },
    placement: 'floor',
    elevationM: 0.012,
    rotationY: 0,
    targetSize: 2.48,
    dimensionsM: { x: 2.48, y: 0.03, z: 1.72 },
    locked: true,
  },
  {
    id: 'window-main',
    label: 'Picture Window',
    url: modelUrlWithBestVariant('/assets/models/architectural/modern-wide-picture-window.optimized.glb'),
    renderKind: 'window-opening',
    position: { x: 1.02, z: -2.45 },
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
    position: { x: 1.02, z: -2.44 },
    placement: 'wall',
    elevationM: 1.04,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 1.62,
    dimensionsM: { x: 1.62, y: 1.18, z: 0.08 },
    locked: true,
  },
  {
    id: 'wall-art-left',
    label: 'Abstract Print',
    url: '/procedural/wall-art-left',
    renderKind: 'wall-art',
    position: { x: -1.02, z: -2.485 },
    placement: 'wall',
    elevationM: 1.24,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 0.58,
    dimensionsM: { x: 0.42, y: 0.58, z: 0.04 },
  },
  {
    id: 'wall-art-right',
    label: 'Accent Print',
    url: '/procedural/wall-art-right',
    renderKind: 'wall-art',
    position: { x: -0.38, z: -2.485 },
    placement: 'wall',
    elevationM: 1.3,
    rotationY: 0,
    boundsRotationY: 0,
    wallSurfacePlane: 'xy',
    targetSize: 0.44,
    dimensionsM: { x: 0.3, y: 0.44, z: 0.04 },
  },
  {
    id: 'floor-plant',
    label: 'Potted Plant',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/potted_plant_04.optimized.glb'),
    renderKind: 'model',
    position: { x: 1.72, z: -0.92 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: -Math.PI / 12,
    targetSize: 0.76,
    dimensionsM: { x: 0.477, y: 0.76, z: 0.525 },
  },
  {
    id: 'small-plant',
    label: 'Ceramic Vase',
    url: modelUrlWithBestVariant('/assets/models/polyhaven/ceramic_vase_01.optimized.glb'),
    renderKind: 'model',
    position: { x: 0.18, z: -1.98 },
    placement: 'floor',
    elevationM: 0.78,
    rotationY: Math.PI / 8,
    targetSize: 0.32,
    dimensionsM: { x: 0.163, y: 0.32, z: 0.163 },
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
