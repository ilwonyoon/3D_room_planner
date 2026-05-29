/**
 * Bundle progress strip — Phase 2 E.
 *
 * When the agent emits a proposeProductGrid with a `bundle` field, we
 * track it as the activeBundle (AgentPage state). As each item is
 * placed in the scene (via updateSceneSlot), the placedIds list grows.
 * This strip renders the progress.
 *
 * Visual: a thin horizontal bar over the chat thread (or in the
 * header), showing bundle name + N of M placed + filled dots.
 *
 * Hidden when no bundle is active. Replaces itself when the agent
 * proposes a new bundle (e.g. user switches scope mid-session).
 */
import { Check } from 'lucide-react'

type Props = {
  readonly bundle: {
    readonly name: string
    readonly itemIds: readonly string[]
    readonly placedIds: readonly string[]
    readonly finishFamily?: string
  } | null
}

export function BundleProgressStrip({ bundle }: Props) {
  if (!bundle) return null
  const placed = bundle.placedIds.length
  const total = bundle.itemIds.length
  const complete = placed >= total && total > 0

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-lowes-blue)_4%,var(--color-surface))] px-5 py-2.5">
      {/* Title + count */}
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-[var(--color-ink)]">
          {bundle.name}
          {bundle.finishFamily ? (
            <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
              · {bundle.finishFamily.replace(/_/g, ' ')}
            </span>
          ) : null}
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          {complete ? 'Set complete' : `${placed} of ${total} placed`}
        </span>
      </div>
      {/* Dots */}
      <div className="ml-auto flex items-center gap-1.5">
        {bundle.itemIds.map((id) => {
          const filled = bundle.placedIds.includes(id)
          return (
            <span
              key={id}
              aria-hidden
              className={
                filled
                  ? 'h-2.5 w-2.5 rounded-full bg-[var(--color-lowes-blue)]'
                  : 'h-2.5 w-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]'
              }
            />
          )
        })}
        {complete ? (
          <Check size={16} className="ml-1 text-[var(--color-lowes-blue)]" aria-label="complete" />
        ) : null}
      </div>
    </div>
  )
}
