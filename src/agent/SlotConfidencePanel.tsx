import { useMemo, useState } from 'react'
import {
  SLOT_SPEC,
  THRESHOLDS,
  type SlotState,
  type SlotSpec,
  readyToDesignScore,
  missingForDesign,
} from './slotModel'

/**
 * The bidirectional confidence dashboard. Day 3 = read-only (this file),
 * Day 4 will add the per-slot editor controls that let the user write
 * directly (clicks set confidence to 95).
 *
 * Each slot is grouped by layer:
 *   A — user-editable (the editable controls land in Day 4)
 *   B — agent infers, user can override
 *   C — agent-only (read-only)
 *   D — system-provided (omitted from UI unless surfaced specifically)
 */

type Props = {
  readonly state: SlotState
  /** Optional callback for Day 4 editability — read-only for now. */
  readonly onSlotEdit?: (slotId: string, newValue: unknown) => void
}

export function SlotConfidencePanel({ state, onSlotEdit }: Props) {
  const readyScore = useMemo(() => readyToDesignScore(state), [state])
  const missing = useMemo(() => missingForDesign(state), [state])

  const visible = SLOT_SPEC.filter((s) => s.layer === 'A' || s.layer === 'B' || s.layer === 'C')
  const byLayer = {
    A: visible.filter((s) => s.layer === 'A'),
    B: visible.filter((s) => s.layer === 'B'),
    C: visible.filter((s) => s.layer === 'C'),
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto border-r border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-ink))] px-4 py-4 text-caption"
      aria-label="Project dashboard"
    >
      <header>
        <h2 className="text-callout font-extrabold text-[var(--color-ink)]">
          Your project
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
          Fill in what you know — I'll figure out the rest.
        </p>
      </header>

      <SlotGroup
        title="What you want"
        slots={byLayer.A}
        state={state}
        onSlotEdit={onSlotEdit}
      />

      <SlotGroup
        title="Agent-inferred (you can override)"
        slots={byLayer.B}
        state={state}
        onSlotEdit={onSlotEdit}
      />

      {/* Layer C slots are internal diagnostics (budget posture, decision
          speed, taste cues). A 40-60-yr-old shopper doesn't need to see
          them by default — they show up if the user expands the section.
          We keep them visible behind one tap because they're part of the
          "Mylow is reading you" demo narrative. */}
      <SlotGroup
        title="More about how I see you"
        slots={byLayer.C}
        state={state}
        onSlotEdit={undefined /* always read-only */}
        collapsible
        defaultOpen={false}
      />

      <footer className="mt-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Ready to design
          </span>
          <span
            className={`font-bold ${
              readyScore >= THRESHOLDS.ready_to_design
                ? 'text-[var(--color-lowes-blue)]'
                : 'text-[var(--color-ink)]'
            }`}
          >
            {readyScore}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-ink)_10%,transparent)]">
          <div
            className="h-full bg-[var(--color-lowes-blue)] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(readyScore, 100)}%` }}
          />
        </div>
        {missing.length > 0 ? (
          <p className="mt-1.5 text-[10.5px] text-[var(--color-muted)]">
            Missing: {missing.map(slotTitle).join(', ')}
          </p>
        ) : (
          <p className="mt-1.5 text-[10.5px] text-[var(--color-lowes-blue)]">
            ✓ ready to design
          </p>
        )}
      </footer>
    </aside>
  )
}

function SlotGroup({
  title,
  slots,
  state,
  onSlotEdit,
  collapsible = false,
  defaultOpen = true,
}: {
  readonly title: string
  readonly slots: readonly SlotSpec[]
  readonly state: SlotState
  readonly onSlotEdit?: (slotId: string, newValue: unknown) => void
  readonly collapsible?: boolean
  readonly defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (slots.length === 0) return null
  // Non-collapsible groups render the same header style as before.
  if (!collapsible) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
          {title}
        </h3>
        <ul className="flex flex-col gap-2">
          {slots.map((s) => (
            <li key={s.id}>
              <SlotRow spec={s} value={state[s.id]} onEdit={onSlotEdit} />
            </li>
          ))}
        </ul>
      </section>
    )
  }
  // Collapsible: header is a tap target ≥ 48px, opens/closes the slot list.
  // Default closed so 40-60-yr shoppers don't see diagnostic-style fields
  // until they ask. The chevron + slot count make the affordance obvious.
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[48px] items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-ink))]"
      >
        <span className="text-small font-bold text-[var(--color-ink)]">
          {title}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--color-muted)]">
            {slots.length} {slots.length === 1 ? 'item' : 'items'}
          </span>
          <span
            aria-hidden
            className={`text-[var(--color-muted)] transition-transform ${open ? 'rotate-90' : ''}`}
          >
            ›
          </span>
        </span>
      </button>
      {open ? (
        <ul className="flex flex-col gap-2">
          {slots.map((s) => (
            <li key={s.id}>
              <SlotRow spec={s} value={state[s.id]} onEdit={onSlotEdit} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SlotRow({
  spec,
  value,
  onEdit,
}: {
  readonly spec: SlotSpec
  readonly value: SlotState[string]
  readonly onEdit?: (slotId: string, newValue: unknown) => void
}) {
  const confidence = value?.confidence ?? 0
  const filled = confidence >= THRESHOLDS.filled
  const source = value?.source
  const editable = !!onEdit && spec.editable
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-small font-bold text-[var(--color-ink)]">
          {spec.title}
        </span>
        <span
          className={`text-[10.5px] font-bold tabular-nums ${
            filled ? 'text-[var(--color-lowes-blue)]' : 'text-[var(--color-muted)]'
          }`}
        >
          {confidence}%
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
        <div
          className={`h-full transition-[width] duration-500 ease-out ${
            filled ? 'bg-[var(--color-lowes-blue)]' : 'bg-[var(--color-muted)]'
          }`}
          style={{ width: `${Math.min(confidence, 100)}%` }}
        />
      </div>
      {value?.value !== undefined ? (
        <p className="mt-1 truncate text-[11px] text-[var(--color-ink)]">
          {source === 'user' ? '✓ ' : ''}
          {formatSlotValue(spec, value.value)}
        </p>
      ) : !editable ? (
        <p className="mt-1 text-[11px] italic text-[var(--color-muted)]">not yet</p>
      ) : null}
      {value?.evidence && source === 'agent' ? (
        <p className="mt-0.5 text-[10.5px] text-[var(--color-muted)]">
          &ldquo;{value.evidence.slice(0, 80)}{value.evidence.length > 80 ? '…' : ''}&rdquo;
        </p>
      ) : null}
      {editable && onEdit ? (
        <SlotEditor spec={spec} value={value?.value} onEdit={(v) => onEdit(spec.id, v)} />
      ) : null}
    </div>
  )
}

function SlotEditor({
  spec,
  value,
  onEdit,
}: {
  readonly spec: SlotSpec
  readonly value: unknown
  readonly onEdit: (newValue: unknown) => void
}) {
  if (spec.kind === 'single_choice' && spec.options) {
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {spec.options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onEdit(opt)}
              className={`rounded-full border px-2 py-0.5 text-[10.5px] transition-colors ${
                active
                  ? 'border-[var(--color-lowes-blue)] bg-[var(--color-lowes-blue)] text-[var(--color-on-brand)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]'
              }`}
            >
              {opt.replace(/_/g, ' ')}
            </button>
          )
        })}
      </div>
    )
  }
  if (spec.kind === 'multi_choice' && spec.options) {
    const arr = Array.isArray(value) ? (value as readonly string[]) : []
    const toggle = (opt: string) => {
      const next = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]
      onEdit(next)
    }
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {spec.options.map((opt) => {
          const active = arr.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-2 py-0.5 text-[10.5px] transition-colors ${
                active
                  ? 'border-[var(--color-lowes-blue)] bg-[var(--color-lowes-blue)] text-[var(--color-on-brand)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]'
              }`}
            >
              {opt.replace(/_/g, ' ')}
            </button>
          )
        })}
      </div>
    )
  }
  if (spec.kind === 'range') {
    const v = (value as { low?: number; high?: number } | undefined) ?? { low: 0, high: 0 }
    return (
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="text-[10.5px] text-[var(--color-muted)]">$</span>
        <input
          type="number"
          value={v.low ?? ''}
          placeholder="low"
          onChange={(e) => onEdit({ low: Number(e.target.value) || 0, high: v.high ?? 0 })}
          className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px]"
        />
        <span className="text-[10.5px] text-[var(--color-muted)]">–</span>
        <input
          type="number"
          value={v.high ?? ''}
          placeholder="high"
          onChange={(e) => onEdit({ low: v.low ?? 0, high: Number(e.target.value) || 0 })}
          className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px]"
        />
      </div>
    )
  }
  if (spec.kind === 'list') {
    const arr = Array.isArray(value) ? (value as readonly string[]) : []
    return (
      <div className="mt-1.5 flex flex-col gap-1">
        {arr.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="flex-1 truncate text-[11px]">{item}</span>
            <button
              type="button"
              onClick={() => onEdit(arr.filter((_, j) => j !== i))}
              className="text-[10.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        <input
          type="text"
          placeholder="+ add"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              onEdit([...arr, e.currentTarget.value.trim()])
              e.currentTarget.value = ''
            }
          }}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px]"
        />
      </div>
    )
  }
  return null
}

function formatSlotValue(spec: SlotSpec, value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (typeof value === 'object') {
    const v = value as { low?: number; high?: number }
    if ('low' in v && 'high' in v) return `$${v.low ?? '?'}–$${v.high ?? '?'}`
    return JSON.stringify(value)
  }
  return prettyOption(spec, String(value))
}

/**
 * Friendly display strings for the snake_case option tokens stored in
 * data/eval/slot-model.json. Designed for 40-60-yr-old shoppers — first-person
 * voice where natural, no internal jargon. Anything not in this table falls
 * back to underscore-stripped lowercase so a missing key never blocks rendering.
 */
const OPTION_LABELS: Record<string, string> = {
  // scope
  a_few_items: 'A few items',
  partial: 'Partial refresh',
  full_reno: 'Whole bathroom',
  // style_direction
  spa: 'Spa / calm',
  modern: 'Modern',
  transitional: 'Transitional',
  farmhouse: 'Farmhouse',
  traditional: 'Traditional',
  coastal: 'Coastal',
  // room_size
  small: 'Small',
  standard: 'Standard',
  master: 'Primary / large',
  // persona_traits
  newlywed: 'Newlywed / first home',
  family_with_kids: 'Family with kids',
  downsizer: 'Downsizing',
  single_homeowner: 'Single homeowner',
  senior_aging_in_place: 'Designing to age in place',
  diy_er: 'DIY-ing it myself',
  hiring_contractor: 'Hiring a contractor',
  pro_buying_for_client: 'Buying for a client (pro)',
  // trigger
  aging_fixtures: 'Aging fixtures',
  move_in: 'Just moved in',
  resale: 'Selling / resale',
  leak_urgent: 'Leak — needs fix now',
  accessibility: 'Accessibility',
  family_change: 'Family life changing',
  // lifestyle
  shower_focused: 'Shower-focused',
  tub_focused: 'Tub-focused',
  uses_both: 'Use both',
  kids_in_household: 'Kids in the house',
  low_maintenance_pref: 'Low-maintenance please',
  accessibility_needs: 'Accessibility needs',
  // budget_posture (Layer C — surfaced only when expanded)
  on_target: 'On track',
  'over-silent': 'Stretching the budget',
  refuses_anchor: 'Wants flexibility',
  unrealistic_low: 'Budget vs. wish-list mismatch',
  // decision_speed
  fast: 'Quick decider',
  browsing: 'Looking around',
  hesitant: 'Taking time',
}

function prettyOption(_spec: SlotSpec, raw: string): string {
  if (!raw) return ''
  // Multi-value tokens (Taste cues / lifestyle multi_choice) arrive as
  // comma-joined strings — map each side independently so a single bad
  // token doesn't drop the rest.
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((t) => prettyOption(_spec, t.trim()))
      .filter(Boolean)
      .join(' + ')
  }
  if (OPTION_LABELS[raw]) return OPTION_LABELS[raw]
  // Fall back to underscore-stripped — never block on a missing label
  return raw.replace(/_/g, ' ')
}

function slotTitle(id: string): string {
  return SLOT_SPEC.find((s) => s.id === id)?.title ?? id
}
