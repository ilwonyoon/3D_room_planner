/**
 * Cold-open welcome card — rendered client-side (no LLM call) based on
 * the user's entry context. Different entry surfaces get different
 * greetings + chip sets, per the research in docs/bond-demo/17-COLD-OPEN-RESEARCH.md
 * (Amazon Rufus / Klarna / Microsoft Bot Framework guidance).
 *
 * Pattern:
 *   [Context strip]  — what we know about why they're here
 *   [Greeting]       — one scope-naming sentence, NOT "How can I help?"
 *   [Chips]          — 3-5 quick-start chips covering scope/style/budget
 *
 * On any chip click or first user message, the card dismisses and the
 * normal agent flow takes over.
 */
import type { Scenario } from './scenarios'

type Props = {
  readonly scenario: Scenario | null /* null = cold start (blank) */
  readonly onChipPick: (chipText: string) => void
}

type ChipDef = { readonly id: string; readonly label: string }

/**
 * Compose the welcome card content for the current entry surface.
 * Returns: contextLine (small grey strip), greeting (designer voice),
 * and chips grouped by row.
 */
function composeWelcome(scenario: Scenario | null): {
  readonly contextLine: string | null
  readonly greeting: string
  readonly chipRows: ReadonlyArray<ReadonlyArray<ChipDef>>
} {
  if (!scenario) {
    // Cold start — no entry context at all
    return {
      contextLine: null,
      greeting: "I'm Mylow — your AI bathroom designer. What are we working on?",
      chipRows: [
        [
          { id: 'scope.single', label: 'Single piece' },
          { id: 'scope.partial', label: 'Refresh one zone' },
          { id: 'scope.full', label: 'Whole bathroom' },
        ],
        [{ id: 'scope.explore', label: 'Just exploring' }],
      ],
    }
  }
  const entry = scenario.entry
  // PDP entry — we know the product they viewed
  if (entry.source === 'pdp' && entry.product) {
    const p = entry.product
    return {
      contextLine: `Designing around: ${p.brand ?? ''} ${p.name}`.trim(),
      greeting: "Let's build the rest of the bathroom around it.",
      chipRows: [
        [
          { id: 'scope.this', label: 'Just this piece' },
          { id: 'scope.wall', label: 'Match the wall' },
          { id: 'scope.full', label: 'Full bathroom' },
        ],
      ],
    }
  }
  // Global nav — generic "design my bathroom"
  if (entry.source === 'global_nav') {
    return {
      contextLine: 'Starting fresh',
      greeting: "Let's design your bathroom together.",
      chipRows: [
        [
          { id: 'scope.single', label: 'Single piece' },
          { id: 'scope.partial', label: 'Refresh one zone' },
          { id: 'scope.full', label: 'Whole bathroom' },
        ],
        [
          { id: 'style.modern', label: 'Modern' },
          { id: 'style.spa', label: 'Spa' },
          { id: 'style.traditional', label: 'Traditional' },
        ],
      ],
    }
  }
  // Banner — promotion or campaign context
  if (entry.source === 'banner') {
    return {
      contextLine: 'Spring Refresh',
      greeting: 'Looking for a budget-friendly refresh? Let me help.',
      chipRows: [
        [
          { id: 'scope.zone', label: 'Update one zone' },
          { id: 'scope.hardware', label: 'Hardware refresh' },
          { id: 'scope.full', label: 'Full reno' },
        ],
      ],
    }
  }
  // Fallback — same as cold start
  return {
    contextLine: null,
    greeting: "I'm Mylow — your AI bathroom designer. What are we working on?",
    chipRows: [
      [
        { id: 'scope.single', label: 'Single piece' },
        { id: 'scope.partial', label: 'Refresh one zone' },
        { id: 'scope.full', label: 'Whole bathroom' },
      ],
    ],
  }
}

export function WelcomeCard({ scenario, onChipPick }: Props) {
  const { contextLine, greeting, chipRows } = composeWelcome(scenario)
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {contextLine ? (
        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          {contextLine}
        </div>
      ) : null}
      <p className="text-base font-medium text-[var(--color-ink)]">{greeting}</p>
      <div className="flex flex-col gap-2">
        {chipRows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            {row.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChipPick(chip.label)}
                className="min-h-[40px] rounded-full border border-[var(--color-lowes-blue)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-lowes-blue)] hover:bg-[color-mix(in_srgb,var(--color-lowes-blue)_8%,var(--color-surface))]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
