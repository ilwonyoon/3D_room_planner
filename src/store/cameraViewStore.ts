import { create } from 'zustand'

export type CameraViewMode = 'isometric' | 'bird' | 'pov'

const cameraViewModes: CameraViewMode[] = ['isometric', 'bird', 'pov']

interface CameraViewState {
  mode: CameraViewMode
  setMode: (mode: CameraViewMode) => void
  cycleMode: () => void
}

export const useCameraViewStore = create<CameraViewState>((set) => ({
  mode: 'isometric',
  setMode: (mode) => set({ mode }),
  cycleMode: () =>
    set((state) => {
      const currentIndex = cameraViewModes.indexOf(state.mode)
      const nextIndex = (currentIndex + 1) % cameraViewModes.length
      return { mode: cameraViewModes[nextIndex] }
    }),
}))
