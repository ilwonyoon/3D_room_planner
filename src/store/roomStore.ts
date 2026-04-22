import { create } from 'zustand'
import { DEFAULT_ROOM, type Room } from '@/domain/types'

interface RoomState {
  room: Room
  setRoom: (room: Room) => void
  resize: (patch: Partial<Pick<Room, 'widthM' | 'depthM' | 'heightM'>>) => void
  reset: () => void
}

export const useRoomStore = create<RoomState>((set) => ({
  room: { ...DEFAULT_ROOM },
  setRoom: (room) => set({ room }),
  resize: (patch) => set((s) => ({ room: { ...s.room, ...patch } })),
  reset: () => set({ room: { ...DEFAULT_ROOM } }),
}))
