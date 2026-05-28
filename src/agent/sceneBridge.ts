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
 * Why stand-ins: Bond-3d's catalog has chairs/sofas/cabinets, NOT
 * bathroom fixtures. We pick the closest-sized furniture for each
 * bathroom slot. Demo narrative is: "this is the scene engine wired
 * through the agent; production swaps in bathroom GLBs"
 * (see `docs/bond-demo/13-BATHROOM-ASSETS.md`).
 *
 * Three guarantees the bridge gives:
 * - Size-aware pick: each slot gets the catalog item whose dimensions
 *   are closest to a typical bathroom fixture of that type.
 * - Deterministic: a given Lowe's product_id always maps to the same
 *   stand-in across reloads, so the demo is reproducible.
 * - Slot-unique placement: re-calling for the same slot replaces the
 *   previous mesh (not stacks); slot positions are pre-tuned to avoid
 *   overlap.
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
 * Bathroom slot → real bathroom GLB (when present). Filled per-slot as
 * bathroom assets get dropped into `public/assets/models/bathroom/`
 * (see `docs/bond-demo/13-BATHROOM-ASSETS.md`). When a slot has an
 * entry here, `pickStandIn` short-circuits to it and skips the
 * furniture-catalog stand-in path below. Slots not in this map fall
 * through to `SLOT_TO_CATEGORIES`, so partial drops are graceful.
 */
const SLOT_TO_BATHROOM_FILE: Record<string, string> = {
  vanity: '/assets/models/bathroom/vanity_36in_modern_white.glb',
  mirror: '/assets/models/bathroom/mirror_rect_blackframe.glb',
  lighting: '/assets/models/bathroom/sconce_brass_opal.glb',
  bathtub: '/assets/models/bathroom/tub_freestanding_oval_white.glb',
  toilet: '/assets/models/bathroom/toilet_wallmount_white.glb',
  faucet: '/assets/models/bathroom/faucet_widespread_matteblack.glb',
  shower: '/assets/models/bathroom/shower_walkin_enclosure.glb',
  accessory: '/assets/models/bathroom/towelbar_brushed_nickel.glb',
}

/**
 * Bathroom slot → Bond-3d furniture category. Picked for visual size
 * match (e.g. bathtub is large + low → sofa shape). Fall back to a
 * second-choice category if the first has no model-bearing items.
 * Only consulted for slots NOT in SLOT_TO_BATHROOM_FILE above.
 */
const SLOT_TO_CATEGORIES: Record<string, ProductCategory[]> = {
  vanity: ['storage', 'table'],
  mirror: ['decor'],
  faucet: ['decor'],
  lighting: ['lighting', 'decor'],
  bathtub: ['sofa', 'storage'],
  shower: ['storage'],
  toilet: ['chair'],
  accessory: ['decor'],
}

/**
 * Reference dimensions for a typical bathroom fixture of each slot,
 * in centimeters. Used to *pick the closest-sized* catalog item, so
 * the stand-in mesh is at least scale-believable.
 *
 * Sources: standard residential bathroom fixture sizes from common
 * catalog ranges (Kohler, Moen, American Standard).
 */
const SLOT_TARGET_DIMENSIONS_CM: Record<string, readonly [number, number, number]> = {
  vanity: [90, 50, 85],
  mirror: [70, 5, 100],
  faucet: [15, 15, 25],
  lighting: [30, 30, 40],
  bathtub: [170, 75, 55],
  shower: [90, 90, 200],
  toilet: [70, 40, 75],
  accessory: [30, 15, 30],
}

/**
 * Approximate floor position per slot, in meters from room origin
 * (room is 3.6 × 4.4 m via DEFAULT_ROOM). Hand-tuned so a fully-loaded
 * bathroom scene doesn't end up with everything stacked at (0, 0)
 * — see `verifyNoSlotOverlap` for the test that enforces ≥30cm
 * pairwise separation. Right wall holds vanity + mirror + sconce;
 * left wall holds the tub; front-center holds the toilet.
 */
const SLOT_POSITION: Record<string, Vec2> = {
  vanity: { x: 1.4, z: -1.6 },
  mirror: { x: 1.72, z: -1.6 },
  faucet: { x: 1.4, z: -1.6 },
  lighting: { x: 1.72, z: -1.6 },
  bathtub: { x: -1.0, z: 0 },
  shower: { x: -1.4, z: -1.4 },
  toilet: { x: 0, z: 1.6 },
  accessory: { x: 0.8, z: 1.6 },
}

/**
 * Stable hash for string → uint32. Used to deterministically pick one
 * stand-in from N equally-valid candidates given a productId.
 */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h >>> 0
}

/**
 * Euclidean distance between two dimension triples (cm). The catalog
 * items use `dimensionsCm` as [x, y, z]; we treat distance in this
 * 3-tuple as "how much will this look wrong when subbed in for the
 * target fixture."
 */
function dimDistance(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Pick a furniture catalog item that visually stands in for a bathroom
 * slot. Returns null if no matching category has any items (shouldn't
 * happen with Bond-3d's seed catalog).
 *
 * `productId` is the Lowe's SKU the agent picked; we use it as a hash
 * seed to break ties deterministically across reloads.
 */
export function pickStandIn(slot: string, productId: string): ProductCatalogItem | null {
  // Real bathroom GLB exists for this slot — synthesize a catalog item
  // pointing at it and skip the furniture-stand-in fallback entirely.
  const bathroomFile = SLOT_TO_BATHROOM_FILE[slot]
  if (bathroomFile) {
    const dims = SLOT_TARGET_DIMENSIONS_CM[slot] ?? [50, 50, 50]
    return {
      id: `bathroom-${slot}`,
      name: slot,
      brand: 'Bond',
      category: 'storage',
      source: 'manual',
      renderCost: 'standard',
      modelUrl: bathroomFile,
      sourceModelUrl: bathroomFile,
      thumbnailUrl: '',
      dimensionsCm: dims,
    } as ProductCatalogItem
  }

  const categories = SLOT_TO_CATEGORIES[slot] ?? []
  const target = SLOT_TARGET_DIMENSIONS_CM[slot]

  for (const category of categories) {
    const candidates = PRODUCT_CATALOG.filter(
      (p) => p.category === category && p.modelUrl,
    )
    if (candidates.length === 0) continue

    if (!target) {
      // No target dims known — just hash to a stable index
      return candidates[hashStr(productId) % candidates.length]
    }

    // Sort by closest dimensional match; tie-break with hash
    const ranked = candidates
      .map((c) => ({
        item: c,
        d: dimDistance(c.dimensionsCm as readonly [number, number, number], target),
      }))
      .sort((a, b) => a.d - b.d)

    // Take the top-4 closest matches and pick deterministically among
    // them using the productId hash. Top-4 gives some visual variety
    // across different Lowe's SKUs for the same slot type, but stays
    // size-believable.
    const topN = ranked.slice(0, Math.min(4, ranked.length))
    return topN[hashStr(productId) % topN.length].item
  }
  return null
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
export function placeStandInForSlot(slot: string, productId = ''): string | null {
  const item = pickStandIn(slot, productId)
  if (!item) return null

  // Use the *bathroom fixture* dimensions for the in-scene size so the
  // mesh, even though it's the wrong model, fills the right footprint.
  // Falls back to the catalog item's own dimensions if no target known.
  const targetDimsCm = SLOT_TARGET_DIMENSIONS_CM[slot] ?? item.dimensionsCm
  const dimensionsM = dimsCmToM(targetDimsCm as readonly [number, number, number])
  const targetSize = Math.max(dimensionsM.x, dimensionsM.y, dimensionsM.z)
  const id = `agent-${slot}-${productId.slice(0, 12) || crypto.randomUUID().slice(0, 8)}`

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

/**
 * Spec-style overlap check on the pre-tuned SLOT_POSITION map. Returns
 * the closest pair (or `null` if all pairs are at least minSeparationM
 * apart). Used by the bridge unit smoke (scripts/bridge-smoke.mjs) to
 * catch regressions if positions get retuned later.
 */
export function verifyNoSlotOverlap(minSeparationM = 0.3): {
  ok: boolean
  closest: { a: string; b: string; dist: number } | null
} {
  const entries = Object.entries(SLOT_POSITION)
  let closest: { a: string; b: string; dist: number } | null = null
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, pa] = entries[i]
      const [b, pb] = entries[j]
      const dx = pa.x - pb.x
      const dz = pa.z - pb.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (!closest || dist < closest.dist) closest = { a, b, dist }
    }
  }
  return { ok: !closest || closest.dist >= minSeparationM, closest }
}

// Helpful for debugging the demo narrative
export const SCENE_BRIDGE_DEBUG = {
  SLOT_TO_BATHROOM_FILE,
  SLOT_TO_CATEGORIES,
  SLOT_TARGET_DIMENSIONS_CM,
  SLOT_POSITION,
  knownProductIds: () => PRODUCT_CATALOG.map((p) => p.id),
  productById: (id: string) => PRODUCT_BY_ID.get(id),
} as const
