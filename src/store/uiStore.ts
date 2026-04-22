import { create } from 'zustand'
import type { CategoryId } from '@/constants/categories'

type PerfTier = 'full' | 'medium' | 'low'

interface UiState {
  catalogExpanded: boolean
  activeCategory: CategoryId
  perfTier: PerfTier
  toggleCatalog: () => void
  setCatalog: (expanded: boolean) => void
  setCategory: (id: CategoryId) => void
  setPerfTier: (tier: PerfTier) => void
}

export const useUiStore = create<UiState>((set) => ({
  catalogExpanded: false,
  activeCategory: 'chair',
  perfTier: 'full',
  toggleCatalog: () => set((s) => ({ catalogExpanded: !s.catalogExpanded })),
  setCatalog: (catalogExpanded) => set({ catalogExpanded }),
  setCategory: (activeCategory) => set({ activeCategory }),
  setPerfTier: (perfTier) => set({ perfTier }),
}))
