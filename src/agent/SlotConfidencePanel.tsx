import { useMemo } from 'react'
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

      <SlotGroup
        title="Agent reading"
        slots={byLayer.C}
        state={state}
        onSlotEdit={undefined /* always read-only */}
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
}: {
  readonly title: string
  readonly slots: readonly SlotSpec[]
  readonly state: SlotState
  readonly onSlotEdit?: (slotId: string, newValue: unknown) => void
}) {
  if (slots.length === 0) return null
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

function prettyOption(_spec: SlotSpec, raw: string): string {
  if (!raw) return ''
  // Replace underscores with spaces for friendlier display
  return raw.replace(/_/g, ' ')
}

function slotTitle(id: string): string {
  return SLOT_SPEC.find((s) => s.id === id)?.title ?? id
}
