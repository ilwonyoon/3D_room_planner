/**
 * View toggle for the agent's right-pane R3F scene. Exposes the three
 * camera modes that IsometricScene already supports via useCameraViewStore:
 *
 *   - In room     (pov)        — first-person walk-around
 *   - Isometric   (isometric)  — angled top-down, the cinematic default
 *   - Floor plan  (bird)       — straight top-down, layout-check view
 *
 * Floats over the scene's top-right corner so it never steals chat width.
 * 48px tap-target rows for 40-60-yr friendliness; persistent text labels
 * (no icon-only — a "POV" icon is not self-evident to a casual shopper).
 */
import { useCameraViewStore } from '@/store/cameraViewStore'
import type { CameraViewMode } from '@/store/cameraViewStore'

const MODES: ReadonlyArray<{ id: CameraViewMode; label: string }> = [
  { id: 'pov', label: 'In room' },
  { id: 'isometric', label: 'Isometric' },
  { id: 'bird', label: 'Floor plan' },
]

export function SceneViewToggle() {
  const mode = useCameraViewStore((s) => s.mode)
  const setMode = useCameraViewStore((s) => s.setMode)
  return (
    <div
      role="radiogroup"
      aria-label="Room view"
      className="absolute right-4 top-4 z-10 flex gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"
    >
      {MODES.map((m) => {
        const active = mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(m.id)}
            className={
              active
                ? 'rounded-[var(--radius-sm)] bg-[var(--color-lowes-blue)] px-3 py-2 text-sm font-semibold text-[var(--color-on-brand)]'
                : 'rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]'
            }
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
