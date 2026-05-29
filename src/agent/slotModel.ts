/**
 * Slot confidence model — the shared state between the agent's
 * updateSlotConfidence tool calls and the left-side dashboard UI. See
 * docs/bond-demo/08-DISCOVERY-FOCUS.md and data/eval/slot-model.json.
 */

import slotModelJson from '../../data/eval/slot-model.json'

export type SlotLayer = 'A' | 'B' | 'C' | 'D'

/** Which scope modes a slot applies to. 'all' = always visible regardless
 *  of scope. Otherwise the slot only renders when the user's scope value
 *  matches one of the listed modes. */
export type SlotMode = 'all' | 'single' | 'partial' | 'full'

export type SlotSpec = {
  readonly id: string
  readonly title: string
  readonly layer: SlotLayer
  readonly editable: boolean
  readonly kind: string
  readonly options?: readonly string[]
  readonly modes?: readonly SlotMode[]
  readonly required_for_design?: boolean
  readonly estimable_with_anchor?: boolean
  readonly alternate_input?: string
}

export type SlotValue = {
  /** Current value, shape depends on slot.kind */
  readonly value: unknown
  /** 0-100. Threshold for "filled" is 70. */
  readonly confidence: number
  /** Short evidence quote — where this came from. */
  readonly evidence?: string
  /** "user" if the user directly set it via dashboard or explicit chat,
      "agent" if inferred by the agent. */
  readonly source: 'user' | 'agent' | 'system'
}

export type SlotState = Record<string, SlotValue | undefined>

export const SLOT_SPEC: readonly SlotSpec[] = (slotModelJson as { slots: SlotSpec[] }).slots
export const THRESHOLDS = (slotModelJson as { thresholds: Record<string, number> }).thresholds

/** Slots required to start designing (scope, style, room_size). */
export const REQUIRED_SLOTS: readonly string[] = SLOT_SPEC.filter(
  (s) => s.required_for_design,
).map((s) => s.id)

export function slotsByLayer(layer: SlotLayer): readonly SlotSpec[] {
  return SLOT_SPEC.filter((s) => s.layer === layer)
}

/** Derive the active mode from the scope slot value. Returns 'unknown'
 *  when scope hasn't been set yet — used to hide mode-conditional slots
 *  until scope is committed. */
export function deriveModeFromScope(state: SlotState): SlotMode | 'unknown' {
  const scopeValue = state.scope?.value
  if (scopeValue === 'a_few_items') return 'single'
  if (scopeValue === 'partial') return 'partial'
  if (scopeValue === 'full_reno') return 'full'
  return 'unknown'
}

/** Is this slot visible under the current mode? Slots with no `modes`
 *  field default to `['all']`. While mode is 'unknown', only slots
 *  marked `all` are visible — so the user sees scope/style/budget but
 *  not the mode-conditional ones until they commit a scope. */
export function isSlotVisibleInMode(spec: SlotSpec, mode: SlotMode | 'unknown'): boolean {
  const slotModes = spec.modes ?? (['all'] as const)
  if (slotModes.includes('all')) return true
  if (mode === 'unknown') return false
  return slotModes.includes(mode)
}

/** Sum of required-slot confidences, normalized to 0-100. */
export function readyToDesignScore(state: SlotState): number {
  if (REQUIRED_SLOTS.length === 0) return 0
  const sum = REQUIRED_SLOTS.reduce((acc, id) => acc + (state[id]?.confidence ?? 0), 0)
  return Math.round(sum / REQUIRED_SLOTS.length)
}

/** What's still missing (confidence < threshold). */
export function missingForDesign(state: SlotState): readonly string[] {
  return REQUIRED_SLOTS.filter((id) => (state[id]?.confidence ?? 0) < THRESHOLDS.filled)
}

/** Update one slot. Higher confidence wins; same-or-lower preserves the
 *  existing slot (so noisy lower-confidence inferences don't downgrade). */
export function setSlot(
  state: SlotState,
  id: string,
  patch: Partial<SlotValue> & { confidence: number },
): SlotState {
  const prev = state[id]
  if (prev && prev.confidence > patch.confidence && patch.source !== 'user') {
    return state // ignore — existing higher-confidence wins
  }
  return {
    ...state,
    [id]: {
      value: patch.value ?? prev?.value,
      confidence: patch.confidence,
      evidence: patch.evidence ?? prev?.evidence,
      source: patch.source ?? prev?.source ?? 'agent',
    },
  }
}
