/**
 * Bridge between the agent's tool calls and Bond-3d's editorObjectsStore.
 *
 * When the agent calls `updateSceneSlot` with one of our bathroom slots
 * (vanity, mirror, faucet, lighting, bathtub, shower, toilet, accessory),
 * we want a *real* mesh to appear in the IsometricScene. The R3F scene
 * reads from `useEditorObjectsStore`, so the bridge constructs an
 * `EditorObject` from the matched furniture catalog item and calls
 * `addObject`.
 *
 * NOTE: this is the A1 path — Bond-3d's catalog has chairs/sofas/cabinets,
 * NOT bathroom fixtures. We map bathroom slots to *visually approximate*
 * furniture categories. The demo narrative is: "this is the scene engine
 * wired through the agent; production swaps in bathroom GLBs."
 *
 * One placement per slot — calling the bridge twice with the same slot
 * replaces the previous placement (mirrors the agent's mental model:
 * "the vanity slot is filled, swap it" rather than "add another vanity").
 */
import { useEditorObjectsStore } from '@/store/editorObjectsStore'
import type { EditorObject } from '@/store/editorObjectsStore'
import {
  PRODUCT_CATALOG,
  PRODUCT_BY_ID,
  type ProductCatalogItem,
  type ProductCategory,
} from '@/constants/productCatalog'
import type { Vec2 } from '@/domain/types'

/**
 * Bathroom slot → Bond-3d furniture category. Picked for visual size match
 * (e.g. bathtub is large + low → sofa shape). When the agent doesn't pick
 * a specific Lowe's product_id we still need to drop *something* into the
 * scene, so the bridge falls back to the first available item in the
 * mapped category.
 */
const SLOT_TO_CATEGORY: Record<string, ProductCategory> = {
  vanity: 'storage',
  mirror: 'decor',
  faucet: 'decor',
  lighting: 'lighting',
  bathtub: 'sofa',
  shower: 'storage',
  toilet: 'chair',
  accessory: 'decor',
}

/**
 * Approximate floor position per slot, in meters from the room origin.
 * Hand-tuned to a typical bathroom layout so the scene doesn't end up
 * with everything stacked at (0, 0). Wall items are handled separately
 * (currently nothing — A1 keeps everything floor-placed).
 */
const SLOT_POSITION: Record<string, Vec2> = {
  vanity: { x: 1.4, z: -1.0 },
  mirror: { x: 1.4, z: -1.4 },
  faucet: { x: 1.4, z: -0.6 },
  lighting: { x: 0, z: -1.6 },
  bathtub: { x: -1.5, z: 0.3 },
  shower: { x: -1.5, z: -1.0 },
  toilet: { x: 0.4, z: 0.6 },
  accessory: { x: 1.0, z: 0.6 },
}

/**
 * Pick a furniture catalog item that visually stands in for a bathroom
 * slot. Returns null if no matching category has any items (shouldn't
 * happen with Bond-3d's seed catalog).
 */
function pickStandIn(slot: string): ProductCatalogItem | null {
  const category = SLOT_TO_CATEGORY[slot]
  if (!category) return null
  // Prefer items that actually have a model URL (some seeds are
  // placeholder-only and can't render).
  return (
    PRODUCT_CATALOG.find((p) => p.category === category && p.modelUrl) ??
    PRODUCT_CATALOG.find((p) => p.category === category) ??
    null
  )
}

type DimensionsM = { x: number; y: number; z: number }
function dimsCmToM(cm: readonly [number, number, number]): DimensionsM {
  return { x: cm[0] / 100, y: cm[1] / 100, z: cm[2] / 100 }
}

// Track which scene slot we've already placed so a repeat call replaces
// rather than stacks. Map slotName → EditorObject.id.
const placedBySlot = new Map<string, string>()

/**
 * Add (or replace) a stand-in mesh for an agent-driven slot.
 *
 * Returns the EditorObject.id we just placed, or null if no stand-in
 * could be matched. Caller (handleToolUse) can ignore the return.
 */
export function placeStandInForSlot(slot: string): string | null {
  const item = pickStandIn(slot)
  if (!item) return null

  const dimensionsM = dimsCmToM(item.dimensionsCm)
  const targetSize = Math.max(dimensionsM.x, dimensionsM.y, dimensionsM.z)
  const id = `agent-${slot}-${crypto.randomUUID().slice(0, 8)}`

  const obj: EditorObject = {
    id,
    label: `${labelize(slot)} (${item.name})`,
    url: item.modelUrl,
    sourceModelUrl: item.sourceModelUrl,
    runtimeModelUrl: item.runtimeModelUrl,
    heroModelUrl: item.heroModelUrl,
    catalogItemId: item.id,
    productCategory: item.category,
    renderKind: item.category === 'rug' ? 'area-rug' : 'model',
    position: SLOT_POSITION[slot] ?? { x: 0, z: 0 },
    placement: 'floor',
    elevationM: 0.02,
    rotationY: 0,
    targetSize,
    dimensionsM,
  }

  const store = useEditorObjectsStore.getState()
  // Replace if already placed for this slot
  const existing = placedBySlot.get(slot)
  if (existing) store.removeObject(existing)
  store.addObject(obj)
  placedBySlot.set(slot, id)
  return id
}

/**
 * Clear all agent-placed stand-ins. Used when the user resets the demo
 * (?blank=1 reload) or when the agent starts a fresh conversation.
 */
export function clearAgentPlacements(): void {
  const store = useEditorObjectsStore.getState()
  for (const id of placedBySlot.values()) store.removeObject(id)
  placedBySlot.clear()
}

function labelize(slot: string): string {
  return slot.replace(/_/g, ' ')
}

// Helpful for the demo narrative: expose what's mapped to where.
export const SCENE_BRIDGE_DEBUG = {
  SLOT_TO_CATEGORY,
  knownProductIds: () => PRODUCT_CATALOG.map((p) => p.id),
  productById: (id: string) => PRODUCT_BY_ID.get(id),
} as const
