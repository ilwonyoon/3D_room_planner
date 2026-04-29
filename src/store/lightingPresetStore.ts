import { create } from 'zustand'

export type LightingPresetId = 'afternoon-natural'

export const lightingPresetOptions: Array<{ id: LightingPresetId; label: string }> = [
  { id: 'afternoon-natural', label: 'Natural' },
]

interface LightingPresetState {
  preset: LightingPresetId
  setPreset: (preset: LightingPresetId) => void
}

export const useLightingPresetStore = create<LightingPresetState>((set) => ({
  preset: 'afternoon-natural',
  setPreset: (preset) => set({ preset }),
}))
