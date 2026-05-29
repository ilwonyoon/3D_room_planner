/**
 * Fullscreen takeover of the chat column exposing the bathroom settings.
 * Replaces the older bottom-sheet pattern: now it covers the entire chat
 * area (not just slides up partway). The 3D scene on the right column
 * stays visible.
 *
 * The component is still named ProjectSettingsSheet because it's mounted
 * in the same place; the surface label is "Bathroom settings."
 *
 * Designed for 40-60yr shoppers: ≥48px tap targets, ≥16px body text,
 * AA contrast, explicit X + footer Done.
 */
import { useEffect } from 'react'
import { SlotConfidencePanel } from './SlotConfidencePanel'
import type { SlotState } from './slotModel'

type Props = {
  readonly open: boolean
  readonly state: SlotState
  readonly onSlotEdit: (slotId: string, newValue: unknown) => void
  readonly onClose: () => void
  /** Header title from active AppContext (e.g. "Bathroom settings" / "Spec sheet"). */
  readonly title: string
  /** Sub-line under the title, also from the AppContext. */
  readonly subhead: string
}

export function ProjectSettingsSheet({ open, state, onSlotEdit, onClose, title, subhead }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <aside
      aria-label={title}
      className="absolute inset-0 z-40 flex flex-col bg-[var(--color-surface)] animate-[settings-fade-in_0.2s_ease-out]"
    >
      {/* Header — title + 1-line sub + close button */}
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--color-ink)]">{title}</h2>
          <p className="mt-1 text-base text-[var(--color-muted)]">{subhead}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xl text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,var(--color-surface))]"
        >
          ✕
        </button>
      </header>
      {/* Scrollable body — SlotConfidencePanel content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SlotConfidencePanel state={state} onSlotEdit={onSlotEdit} />
      </div>
      {/* Footer — full-width primary action */}
      <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[52px] w-full rounded-[var(--radius-sm)] bg-[var(--color-lowes-blue)] text-base font-bold text-[var(--color-on-brand)] hover:opacity-95"
        >
          Done — back to chat
        </button>
      </div>
    </aside>
  )
}
