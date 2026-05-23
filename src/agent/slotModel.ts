/**
 * Slot confidence model — the shared state between the agent's
 * updateSlotConfidence tool calls and the left-side dashboard UI. See
 * docs/bond-demo/08-DISCOVERY-FOCUS.md and data/eval/slot-model.json.
 */

import slotModelJson from '../../data/eval/slot-model.json'

export type SlotLayer = 'A' | 'B' | 'C' | 'D'

export type SlotSpec = {
  readonly id: string
  readonly title: string
  readonly layer: SlotLayer
  readonly editable: boolean
  readonly kind: string
  readonly options?: readonly string[]
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
