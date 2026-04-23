import { create } from 'zustand'
import {
  DEFAULT_FLOOR_MATERIAL,
  DEFAULT_WALL_MATERIAL,
  type RoomMaterialItem,
} from '@/constants/environmentCatalog'

interface RoomSettingsState {
  wallMaterial: RoomMaterialItem
  floorMaterial: RoomMaterialItem
  setWallMaterial: (material: RoomMaterialItem) => void
  setFloorMaterial: (material: RoomMaterialItem) => void
  reset: () => void
}

export const useRoomSettingsStore = create<RoomSettingsState>((set) => ({
  wallMaterial: DEFAULT_WALL_MATERIAL,
  floorMaterial: DEFAULT_FLOOR_MATERIAL,
  setWallMaterial: (wallMaterial) => set({ wallMaterial }),
  setFloorMaterial: (floorMaterial) => set({ floorMaterial }),
  reset: () =>
    set({
      wallMaterial: DEFAULT_WALL_MATERIAL,
      floorMaterial: DEFAULT_FLOOR_MATERIAL,
    }),
}))
