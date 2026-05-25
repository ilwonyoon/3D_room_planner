/**
 * Bottom sheet that slides up over the chat area to expose the same
 * SlotConfidencePanel content we used to render in the left column.
 *
 * Designed for 40-60-yr shoppers: text ≥ 16px, tap targets ≥ 48px,
 * one explicit close button (X) AND a full-width "Done" footer, AA
 * contrast. ESC + backdrop tap also close it.
 *
 * The sheet covers the chat (but NOT the 3D scene on the right) so the
 * room is still visible while the user adjusts settings — that lockstep
 * is part of the demo narrative.
 */
import { useEffect } from 'react'
import { SlotConfidencePanel } from './SlotConfidencePanel'
import type { SlotState } from './slotModel'

type Props = {
  readonly open: boolean
  readonly state: SlotState
  readonly onSlotEdit: (slotId: string, newValue: unknown) => void
  readonly onClose: () => void
}

export function ProjectSettingsSheet({ open, state, onSlotEdit, onClose }: Props) {
  // ESC to close
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
    <>
      {/* Backdrop — covers the chat area, semi-transparent. We leave the
          3D scene on the right uncovered so users see the room context
          while adjusting settings. The backdrop sits absolute inside the
          chat column (positioned by AgentPage). */}
      <button
        type="button"
        aria-label="Close project settings"
        onClick={onClose}
        className="absolute inset-0 z-30 cursor-default bg-black/30"
      />
      {/* Sheet panel — slides up from chat bottom, height capped so the
          chat header is still visible at the top for context. */}
      <aside
        aria-label="Project settings"
        className="absolute inset-x-0 bottom-0 z-40 flex max-h-[80%] flex-col rounded-t-xl border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-[sheet-slide-up_0.25s_ease-out]"
      >
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--color-ink)]">
              Project settings
            </h2>
            <p className="mt-1 text-base text-[var(--color-muted)]">
              What Mylow knows about your project. Tap to update.
            </p>
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
        {/* Scrollable slot list (the SlotConfidencePanel itself). It was
            originally designed as a sidebar; the styling there scrolls
            cleanly inside this container too. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SlotConfidencePanel state={state} onSlotEdit={onSlotEdit} />
        </div>
        {/* Footer — single full-width primary action so 40-60yr users
            never have to find the X to dismiss. */}
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
    </>
  )
}
