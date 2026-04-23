import { create } from 'zustand'

export type LightingPresetId = 'daylight-window' | 'warm-evening' | 'night-room'

export const lightingPresetOptions: Array<{ id: LightingPresetId; label: string }> = [
  { id: 'daylight-window', label: 'Day' },
  { id: 'warm-evening', label: 'Warm' },
  { id: 'night-room', label: 'Night' },
]

interface LightingPresetState {
  preset: LightingPresetId
  setPreset: (preset: LightingPresetId) => void
}

export const useLightingPresetStore = create<LightingPresetState>((set) => ({
  preset: 'daylight-window',
  setPreset: (preset) => set({ preset }),
}))
