import { useMemo, useState } from 'react'
import {
  SLOT_SPEC,
  type SlotState,
  type SlotSpec,
} from './slotModel'
import {
  Layers,
  Palette,
  Ruler,
  Wallet,
  Lock,
  Wrench,
  UserCircle,
  Compass,
  Home,
  Sparkles,
  Check,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

/**
 * The bathroom-settings dashboard, rendered inside the fullscreen takeover.
 *
 * Layout:
 *   Essentials — Scope, Style, Room size, Budget (Layer A required-for-design)
 *   Advanced   — everything else (Layer A optional + Layer B), collapsed
 *                by default
 *   Inside Advanced — "More about how I see you" (Layer C), nested collapsed
 *
 * 40-60-yr-old friendly: each slot has a Lucide icon, no percentage shown,
 * filled slots show a ✓ checkmark with the value, empty slots show "not yet"
 * placeholder text and the editor inline.
 */

type Props = {
  readonly state: SlotState
  readonly onSlotEdit?: (slotId: string, newValue: unknown) => void
}

/** Lucide icon per slot id. */
const SLOT_ICONS: Record<string, LucideIcon> = {
  scope: Layers,
  style_direction: Palette,
  room_size: Ruler,
  budget_range: Wallet,
  must_keep: Lock,
  must_change: Wrench,
  persona_traits: UserCircle,
  trigger: Compass,
  lifestyle: Home,
  taste_signals: Sparkles,
  budget_posture: Sparkles,
  decision_speed: Sparkles,
}

export function SlotConfidencePanel({ state, onSlotEdit }: Props) {
  // Split Layer A into Essentials (required_for_design) and Optional.
  // Layer B sits alongside Optional in "Advanced".
  // Layer C is nested inside Advanced as "More about how I see you".
  const groups = useMemo(() => {
    const essentials: SlotSpec[] = []
    const optionalA: SlotSpec[] = []
    const layerB: SlotSpec[] = []
    const layerC: SlotSpec[] = []
    for (const spec of SLOT_SPEC) {
      if (spec.layer === 'A' && spec.required_for_design) essentials.push(spec)
      else if (spec.layer === 'A') optionalA.push(spec)
      else if (spec.layer === 'B') layerB.push(spec)
      else if (spec.layer === 'C') layerC.push(spec)
    }
    return { essentials, optionalA, layerB, layerC }
  }, [])

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <SlotGroup
        title="Essentials"
        slots={groups.essentials}
        state={state}
        onSlotEdit={onSlotEdit}
      />
      <CollapsibleGroup title="More questions (optional)" defaultOpen={false}>
        <SlotGroup
          title=""
          slots={[...groups.optionalA, ...groups.layerB]}
          state={state}
          onSlotEdit={onSlotEdit}
          flat
        />
        <CollapsibleGroup title="More about how I see you" defaultOpen={false}>
          <SlotGroup
            title=""
            slots={groups.layerC}
            state={state}
            onSlotEdit={undefined /* Layer C is always read-only */}
            flat
          />
        </CollapsibleGroup>
      </CollapsibleGroup>
    </div>
  )
}

function SlotGroup({
  title,
  slots,
  state,
  onSlotEdit,
  flat = false,
}: {
  readonly title: string
  readonly slots: readonly SlotSpec[]
  readonly state: SlotState
  readonly onSlotEdit?: (slotId: string, newValue: unknown) => void
  readonly flat?: boolean
}) {
  if (slots.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      {!flat && title ? (
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
          {title}
        </h3>
      ) : null}
      <ul className="flex flex-col gap-3">
        {slots.map((s) => (
          <li key={s.id}>
            <SlotRow spec={s} value={state[s.id]} onEdit={onSlotEdit} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CollapsibleGroup({
  title,
  defaultOpen = false,
  children,
}: {
  readonly title: string
  readonly defaultOpen?: boolean
  readonly children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[48px] items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-left hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,var(--color-surface))]"
      >
        <span className="text-base font-semibold text-[var(--color-ink)]">{title}</span>
        <ChevronRight
          size={20}
          className={`shrink-0 text-[var(--color-muted)] transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      {open ? <div className="flex flex-col gap-3 pl-2">{children}</div> : null}
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
  const filled = value?.value !== undefined && value.value !== null
  const editable = !!onEdit && spec.editable
  const Icon = SLOT_ICONS[spec.id] ?? Sparkles
  const source = value?.source
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      {/* Row header — icon + title + (✓ if filled) */}
      <div className="flex items-center gap-3">
        <Icon size={20} className="shrink-0 text-[var(--color-muted)]" aria-hidden />
        <span className="flex-1 text-base font-semibold text-[var(--color-ink)]">
          {spec.title}
        </span>
        {filled ? (
          <Check
            size={20}
            className="shrink-0 text-[var(--color-lowes-blue)]"
            aria-label="set"
          />
        ) : null}
      </div>
      {/* Value display (when filled) */}
      {filled ? (
        <p className="mt-2 pl-8 text-sm text-[var(--color-ink)]">
          {formatSlotValue(spec, value.value)}
        </p>
      ) : !editable ? (
        <p className="mt-2 pl-8 text-sm italic text-[var(--color-muted)]">not yet</p>
      ) : null}
      {/* Evidence quote (only for agent-inferred fills) */}
      {value?.evidence && source === 'agent' ? (
        <p className="mt-1 pl-8 text-xs text-[var(--color-muted)]">
          from your message: &ldquo;{value.evidence.slice(0, 80)}{value.evidence.length > 80 ? '…' : ''}&rdquo;
        </p>
      ) : null}
      {/* Inline editor */}
      {editable && onEdit ? (
        <div className="mt-3 pl-8">
          <SlotEditor spec={spec} value={value?.value} onEdit={(v) => onEdit(spec.id, v)} />
        </div>
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
    // Style direction is the one slot worth a visual grid (cf. brief's
    // "style images, easy pre-prompts"). 2x3 mood-board cards; the
    // image file naming convention is /bathroom-styles/{option}.jpg —
    // missing files fall through to a gradient placeholder so the demo
    // doesn't break before assets are curated.
    if (spec.id === 'style_direction') {
      return (
        <div className="grid grid-cols-3 gap-2">
          {spec.options.map((opt) => {
            const active = value === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onEdit(opt)}
                className={
                  active
                    ? 'flex flex-col overflow-hidden rounded-[var(--radius-sm)] border-2 border-[var(--color-lowes-blue)] bg-[var(--color-surface)]'
                    : 'flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-lowes-blue)]'
                }
              >
                <div
                  className="aspect-[4/3] w-full bg-gradient-to-br from-[color-mix(in_srgb,var(--color-lowes-blue)_18%,white)] to-[color-mix(in_srgb,var(--color-ink)_8%,white)] bg-cover bg-center"
                  style={{ backgroundImage: `url(/bathroom-styles/${opt}.jpg)` }}
                  aria-hidden
                />
                <div className="px-2 py-1.5 text-center text-sm font-semibold text-[var(--color-ink)]">
                  {prettyOption(spec, opt)}
                </div>
              </button>
            )
          })}
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {spec.options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onEdit(opt)}
              className={
                active
                  ? 'min-h-[40px] rounded-full border-2 border-[var(--color-lowes-blue)] bg-[var(--color-lowes-blue)] px-3 text-sm font-semibold text-[var(--color-on-brand)]'
                  : 'min-h-[40px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]'
              }
            >
              {prettyOption(spec, opt)}
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
      <div className="flex flex-wrap gap-1.5">
        {spec.options.map((opt) => {
          const active = arr.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={
                active
                  ? 'min-h-[40px] rounded-full border-2 border-[var(--color-lowes-blue)] bg-[var(--color-lowes-blue)] px-3 text-sm font-semibold text-[var(--color-on-brand)]'
                  : 'min-h-[40px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]'
              }
            >
              {prettyOption(spec, opt)}
            </button>
          )
        })}
      </div>
    )
  }
  if (spec.kind === 'range') {
    const v = (value as { low?: number; high?: number } | undefined) ?? { low: 0, high: 0 }
    // 3-tier preset cards: clicking sets the range; can be overridden by
    // typing into the inputs below. Image hero photos drop into
    // /public/bathroom-budgets/{tier}.jpg later — for now we render a
    // styled gradient + label so the structure is reviewable without
    // assets blocking the build.
    const tiers = [
      { id: 'value', label: 'Budget', low: 800, high: 2500, hint: '$800–$2.5K' },
      { id: 'mid', label: 'Mid', low: 2500, high: 6000, hint: '$2.5K–$6K' },
      { id: 'premium', label: 'Premium', low: 6000, high: 15000, hint: '$6K+' },
    ] as const
    const matchedTier = tiers.find((t) => v.low === t.low && v.high === t.high)?.id
    return (
      <div className="flex flex-col gap-3">
        {/* Tier image cards */}
        <div className="grid grid-cols-3 gap-2">
          {tiers.map((t) => {
            const active = matchedTier === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onEdit({ low: t.low, high: t.high })}
                className={
                  active
                    ? 'flex flex-col overflow-hidden rounded-[var(--radius-sm)] border-2 border-[var(--color-lowes-blue)] bg-[var(--color-surface)]'
                    : 'flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-lowes-blue)]'
                }
              >
                {/* Image placeholder — gradient stand-in until curated
                    Lowe's hero photos are dropped in. */}
                <div
                  className="h-16 w-full bg-gradient-to-br from-[color-mix(in_srgb,var(--color-lowes-blue)_15%,white)] to-[color-mix(in_srgb,var(--color-lowes-blue)_5%,white)]"
                  aria-hidden
                />
                <div className="px-2 py-1.5 text-left">
                  <div className="text-sm font-semibold text-[var(--color-ink)]">{t.label}</div>
                  <div className="text-xs text-[var(--color-muted)]">{t.hint}</div>
                </div>
              </button>
            )
          })}
        </div>
        {/* Custom range input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted)]">or set exact:</span>
          <span className="text-sm text-[var(--color-muted)]">$</span>
          <input
            type="number"
            value={v.low ?? ''}
            placeholder="low"
            onChange={(e) => onEdit({ low: Number(e.target.value) || 0, high: v.high ?? 0 })}
            className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm"
            style={{ minHeight: 40 }}
          />
          <span className="text-sm text-[var(--color-muted)]">–</span>
          <input
            type="number"
            value={v.high ?? ''}
            placeholder="high"
            onChange={(e) => onEdit({ low: v.low ?? 0, high: Number(e.target.value) || 0 })}
            className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm"
            style={{ minHeight: 40 }}
          />
        </div>
      </div>
    )
  }
  if (spec.kind === 'list') {
    const arr = Array.isArray(value) ? (value as readonly string[]) : []
    return (
      <div className="flex flex-col gap-2">
        {arr.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
          >
            <span className="flex-1 truncate text-sm">{item}</span>
            <button
              type="button"
              onClick={() => onEdit(arr.filter((_, j) => j !== i))}
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        <input
          type="text"
          placeholder="+ add (press Enter)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault()
              onEdit([...arr, e.currentTarget.value.trim()])
              e.currentTarget.value = ''
            }
          }}
          className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          style={{ minHeight: 40 }}
        />
      </div>
    )
  }
  return null
}

function formatSlotValue(spec: SlotSpec, value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map((v) => prettyOption(spec, String(v))).join(', ')
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
  contemporary: 'Contemporary',
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
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((t) => prettyOption(_spec, t.trim()))
      .filter(Boolean)
      .join(' + ')
  }
  if (OPTION_LABELS[raw]) return OPTION_LABELS[raw]
  return raw.replace(/_/g, ' ')
}
