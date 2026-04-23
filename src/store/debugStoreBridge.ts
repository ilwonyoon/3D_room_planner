import { useEffect } from 'react'
import {
  useCameraViewStore,
  useEditorObjectsStore,
  useLightingPresetStore,
  useRenderQualityStore,
  useSelectionStore,
} from '@/store'
import type { CameraViewMode, RenderQuality } from '@/store'
import type { EditorObject } from './editorObjectsStore'
import type { LightingPresetId } from './lightingPresetStore'

type PocketRoomDebugBridge = {
  getObjects: () => EditorObject[]
  getObject: (id: string) => EditorObject | undefined
  getEditorState: () => Pick<ReturnType<typeof useEditorObjectsStore.getState>, 'activeDragMode' | 'editMode'>
  getCameraMode: () => CameraViewMode
  getLightingPreset: () => LightingPresetId
  getRenderQuality: () => RenderQuality
  getSelectedId: () => string | null
  resetObjects: () => void
  select: (id: string | null) => void
  setCameraMode: (mode: CameraViewMode) => void
  setLightingPreset: (preset: LightingPresetId) => void
  setObjects: (objects: EditorObject[]) => void
  setObjectPosition: (id: string, position: EditorObject['position']) => void
  setRenderQuality: (quality: RenderQuality) => void
}

declare global {
  interface Window {
    __pocketroomDebug?: PocketRoomDebugBridge
  }
}

export function StoreDebugBridge() {
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return undefined
    }

    window.__pocketroomDebug = {
      getObjects: () => useEditorObjectsStore.getState().objects,
      getObject: (id) => useEditorObjectsStore.getState().objects.find((object) => object.id === id),
      getEditorState: () => {
        const { activeDragMode, editMode } = useEditorObjectsStore.getState()
        return { activeDragMode, editMode }
      },
      getCameraMode: () => useCameraViewStore.getState().mode,
      getLightingPreset: () => useLightingPresetStore.getState().preset,
      getRenderQuality: () => useRenderQualityStore.getState().quality,
      getSelectedId: () => useSelectionStore.getState().selectedId,
      resetObjects: () => useEditorObjectsStore.getState().resetObjects(),
      select: (id) => useSelectionStore.getState().select(id),
      setCameraMode: (mode) => useCameraViewStore.getState().setMode(mode),
      setLightingPreset: (preset) => useLightingPresetStore.getState().setPreset(preset),
      setObjects: (objects) => useEditorObjectsStore.getState().setObjectsForDebug(objects),
      setObjectPosition: (id, position) => useEditorObjectsStore.getState().updateObject(id, { position }),
      setRenderQuality: (quality) => useRenderQualityStore.getState().setQuality(quality),
    }

    return () => {
      delete window.__pocketroomDebug
    }
  }, [])

  return null
}
