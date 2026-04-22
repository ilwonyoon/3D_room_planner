// Keep category IDs stable because saved room plan JSON can reference them.

export const CATEGORIES = [
  { id: 'new',       label: 'New' },
  { id: 'wallfloor', label: 'Wall/Floor' },
  { id: 'sofa',      label: 'Sofa' },
  { id: 'chair',     label: 'Chair' },
  { id: 'table',     label: 'Table' },
  { id: 'storage',   label: 'Storage' },
  { id: 'decor',     label: 'Decor' },
  { id: 'lighting',  label: 'Lighting' },
  { id: 'appliance', label: 'Electronics' },
  { id: 'bed',       label: 'Bed' },
] as const

export type CategoryId = typeof CATEGORIES[number]['id']
