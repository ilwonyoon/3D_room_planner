import { create } from 'zustand'

export type RenderQuality = 'low' | 'medium' | 'high'

const qualityOrder: RenderQuality[] = ['low', 'medium', 'high']

interface RenderQualityState {
  quality: RenderQuality
  setQuality: (quality: RenderQuality) => void
  lowerQuality: () => void
  raiseQuality: () => void
}

function shiftQuality(current: RenderQuality, step: -1 | 1) {
  const nextIndex = Math.min(
    qualityOrder.length - 1,
    Math.max(0, qualityOrder.indexOf(current) + step),
  )

  return qualityOrder[nextIndex]
}

export const useRenderQualityStore = create<RenderQualityState>((set) => ({
  quality: 'high',
  setQuality: (quality) => set({ quality }),
  lowerQuality: () => set((state) => ({ quality: shiftQuality(state.quality, -1) })),
  raiseQuality: () => set((state) => ({ quality: shiftQuality(state.quality, 1) })),
}))
