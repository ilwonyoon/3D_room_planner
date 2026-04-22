import { create } from 'zustand'
import type { PlacedFurniture, Vec2 } from '@/domain/types'

interface PlacementsState {
  list: PlacedFurniture[]
  add: (catalogId: string, position?: Vec2) => string
  remove: (instanceId: string) => void
  move: (instanceId: string, position: Vec2) => void
  rotate: (instanceId: string, deltaRad: number) => void
  clear: () => void
}

function uuid(): string {
  return `pf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const usePlacementsStore = create<PlacementsState>((set) => ({
  list: [],
  add: (catalogId, position = { x: 0, z: 0 }) => {
    const instanceId = uuid()
    set((s) => ({
      list: [
        ...s.list,
        { instanceId, catalogId, position, rotationY: 0, createdAt: Date.now() },
      ],
    }))
    return instanceId
  },
  remove: (instanceId) =>
    set((s) => ({ list: s.list.filter((p) => p.instanceId !== instanceId) })),
  move: (instanceId, position) =>
    set((s) => ({
      list: s.list.map((p) => (p.instanceId === instanceId ? { ...p, position } : p)),
    })),
  rotate: (instanceId, deltaRad) =>
    set((s) => ({
      list: s.list.map((p) =>
        p.instanceId === instanceId ? { ...p, rotationY: p.rotationY + deltaRad } : p,
      ),
    })),
  clear: () => set({ list: [] }),
}))
