/**
 * Scenario dropdown for the chat header. Lets the user switch between
 * pre-defined entry contexts (A-E) or 'blank' (no context) without
 * reloading the page. Used to test the agent across different entry
 * paths during development + the live demo walkthrough.
 *
 * The selected scenario is also reflected in the URL (?scenario=A) via
 * history.replaceState so the link is shareable + bookmarkable.
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { SCENARIOS, type Scenario } from './scenarios'

export type ScenarioId = 'A' | 'B' | 'C' | 'D' | 'E' | 'blank'

type Props = {
  readonly value: ScenarioId
  readonly onChange: (next: ScenarioId) => void
}

export function ScenarioPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const currentLabel = labelFor(value)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[32px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-caption text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,var(--color-surface))]"
      >
        <span className="font-semibold text-[var(--color-ink)]">{currentLabel}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 flex w-72 flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
        >
          {SCENARIOS.map((s) => (
            <ScenarioRow
              key={s.id}
              scenario={s}
              active={value === s.id}
              onPick={() => {
                onChange(s.id)
                setOpen(false)
              }}
            />
          ))}
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === 'blank'}
              onClick={() => {
                onChange('blank')
                setOpen(false)
              }}
              className={
                value === 'blank'
                  ? 'flex w-full flex-col items-start gap-0.5 border-t border-[var(--color-border)] bg-[var(--color-lowes-blue-50)] px-3 py-2 text-left'
                  : 'flex w-full flex-col items-start gap-0.5 border-t border-[var(--color-border)] px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,var(--color-surface))]'
              }
            >
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                Blank · no entry context
              </span>
              <span className="text-caption text-[var(--color-muted)]">
                Cold start — user opens the conversation themselves.
              </span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

function ScenarioRow({
  scenario,
  active,
  onPick,
}: {
  readonly scenario: Scenario
  readonly active: boolean
  readonly onPick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onPick}
        className={
          active
            ? 'flex w-full flex-col items-start gap-0.5 bg-[var(--color-lowes-blue-50)] px-3 py-2 text-left'
            : 'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--color-ink)_4%,var(--color-surface))]'
        }
      >
        <span className="text-sm font-semibold text-[var(--color-ink)]">{scenario.title}</span>
        <span className="text-caption text-[var(--color-muted)]">{scenario.note}</span>
      </button>
    </li>
  )
}

function labelFor(id: ScenarioId): string {
  if (id === 'blank') return 'Blank'
  const s = SCENARIOS.find((x) => x.id === id)
  return s ? `Scenario ${s.id}` : 'Scenario'
}
