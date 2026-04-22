import { create } from 'zustand'
import type { Vec2 } from '@/domain/types'

export type EditorObjectPlacement = 'floor' | 'wall' | 'ceiling'
export type EditorObjectRenderKind =
  | 'model'
  | 'floor-lamp'
  | 'plant'
  | 'wall-art'
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
  setEditMode: (mode: PlacementEditMode) => void
  setActiveDragMode: (mode: PlacementDragMode | null) => void
  removeObject: (id: string) => void
  updateObject: (id: string, patch: Partial<Pick<EditorObject, 'position' | 'elevationM' | 'rotationY' | 'boundsRotationY'>>) => void
}

const INITIAL_OBJECTS: EditorObject[] = [
  {
    id: 'sofa',
    label: 'Sofa',
    url: '/assets/models/sheen-wood-leather-sofa.optimized.glb',
    renderKind: 'model',
    position: { x: -0.78, z: -1.42 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.92,
    dimensionsM: { x: 1.92, y: 0.8, z: 0.66 },
    locked: true,
  },
  {
    id: 'armchair',
    label: 'Chair',
    url: '/assets/models/polyhaven/modern_arm_chair_01.optimized.glb',
    renderKind: 'model',
    position: { x: 1.16, z: 0.62 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: -Math.PI / 2,
    boundsRotationY: -Math.PI / 2,
    targetSize: 0.92,
    dimensionsM: { x: 0.74, y: 0.92, z: 0.88 },
  },
  {
    id: 'coffee-table',
    label: 'Table',
    url: '/assets/models/polyhaven/CoffeeTable_01.optimized.glb',
    renderKind: 'model',
    position: { x: 0.84, z: 0.03 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.95,
    dimensionsM: { x: 0.95, y: 0.38, z: 0.58 },
    locked: true,
  },
  {
    id: 'side-table',
    label: 'Side Table',
    url: '/assets/models/polyhaven/side_table_01.optimized.glb',
    renderKind: 'model',
    position: { x: -1.58, z: -1.02 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.56,
    dimensionsM: { x: 0.56, y: 0.56, z: 0.46 },
    locked: true,
  },
  {
    id: 'window-curtains',
    label: 'Window',
    url: '/procedural/window-curtains',
    renderKind: 'window-curtains',
    position: { x: 2.06, z: -0.34 },
    placement: 'wall',
    elevationM: 0.86,
    rotationY: -Math.PI / 2,
    targetSize: 1.58,
    dimensionsM: { x: 1.58, y: 1.24, z: 0.08 },
    locked: true,
  },
  {
    id: 'wall-art-left',
    label: 'Wall Art',
    url: '/procedural/wall-art-left',
    renderKind: 'wall-art',
    position: { x: -0.32, z: -2.465 },
    placement: 'wall',
    elevationM: 1.34,
    rotationY: 0,
    targetSize: 0.5,
    dimensionsM: { x: 0.28, y: 0.42, z: 0.04 },
  },
  {
    id: 'wall-art-right',
    label: 'Wall Art',
    url: '/procedural/wall-art-right',
    renderKind: 'wall-art',
    position: { x: 0.06, z: -2.465 },
    placement: 'wall',
    elevationM: 1.34,
    rotationY: 0,
    targetSize: 0.5,
    dimensionsM: { x: 0.28, y: 0.42, z: 0.04 },
  },
  {
    id: 'floor-lamp',
    label: 'Floor Lamp',
    url: '/procedural/floor-lamp',
    renderKind: 'floor-lamp',
    position: { x: -1.72, z: -0.95 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 1.52,
    dimensionsM: { x: 0.66, y: 1.52, z: 0.66 },
  },
  {
    id: 'plant',
    label: 'Plant',
    url: '/procedural/plant',
    renderKind: 'plant',
    position: { x: 0.3, z: -0.82 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize: 0.7,
    dimensionsM: { x: 0.36, y: 0.7, z: 0.36 },
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
