import { create } from 'zustand'

interface SelectionState {
  selectedId: string | null
  select: (id: string | null) => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
}))
