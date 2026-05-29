/**
 * Cold-open welcome — PDP only for now (docs/bond-demo/19-ENTRANCE-X-GOAL-MATRIX.md).
 *
 *   1. Prose is a FIXED string keyed off entrance; no LLM call.
 *   2. Streamed to the screen one character at a time so it reads like
 *      the agent's first turn arriving (matches the look of the real
 *      SSE streaming used for every subsequent agent turn).
 *   3. Chip block fades in only AFTER the prose finishes — chips
 *      pre-rendering before the agent finishes "speaking" looks wrong.
 *   4. Once the user picks a chip (or types), the real LLM takes over.
 *
 * Non-PDP entrances (global_nav / banner / cold) keep a minimal fallback
 * until we lock their copy + visit-count matrix.
 */
import { useEffect, useRef, useState } from 'react'
import type { Scenario } from './scenarios'

type Props = {
  readonly scenario: Scenario | null
  readonly onChipPick: (chipText: string, opts?: { readonly forceTool?: string }) => void
  /**
   * When true, the welcome stays on screen but recedes visually —
   * chips lose their primary color, the prose softens. Used once the
   * user has sent at least one real message, so the welcome stops
   * competing for attention but is still readable as history.
   */
  readonly dimmed?: boolean
}

/**
 * A chip label + optional forced tool. forceTool tells the server to
 * pin Claude's tool_choice to that exact tool, so the chip's intent
 * never gets re-interpreted as free text. Chips without forceTool fall
 * through to normal LLM routing.
 */
type ChipDef = { readonly id: string; readonly label: string; readonly forceTool?: string }

type WelcomeContent = {
  readonly contextLine: string | null
  readonly prose: string
  readonly goalPrompt: string
  readonly goalChips: ReadonlyArray<ChipDef>
  readonly capabilityPrompt: string
  readonly capabilityChips: ReadonlyArray<ChipDef>
}

function composeWelcome(scenario: Scenario | null): WelcomeContent {
  if (scenario && scenario.entry.source === 'pdp' && scenario.entry.product) {
    const p = scenario.entry.product
    const anchorName = `${p.brand ?? ''} ${p.name}`.trim()
    return {
      contextLine: null,
      prose: `You're looking at the ${anchorName}. Let's build the rest of the bathroom around it.`,
      goalPrompt: 'What are you here for?',
      // PDP entry: chip clicks deterministically pin Claude to one of our
      // 4 surface tools (image picker / product grid / 3D placement / text
      // chips) so the LLM can't re-interpret the chip label as something
      // else. See docs/bond-demo/19 — chip→tool routing table.
      goalChips: [
        { id: 'goal.compare', label: 'Compare other vanities', forceTool: 'proposeProductGrid' },
        { id: 'goal.match', label: 'Match the rest of the bathroom', forceTool: 'proposeProductGrid' },
        { id: 'goal.place', label: 'See it in my bathroom', forceTool: 'updateSceneSlot' },
      ],
      capabilityPrompt: 'What I can do',
      capabilityChips: [
        { id: 'cap.budget', label: 'Pick by budget', forceTool: 'proposeChipChoice' },
        { id: 'cap.styles', label: 'Show me styles', forceTool: 'proposeImageChoice' },
        { id: 'cap.decide', label: 'Help me decide between options', forceTool: 'proposeProductGrid' },
      ],
    }
  }
  // Non-PDP fallback (minimal — not yet locked per 19).
  return {
    contextLine: null,
    prose: "I'm Mylow — your AI interior designer for your bathroom. What are we working on?",
    goalPrompt: 'How can I help?',
    goalChips: [
      { id: 'goal.piece', label: 'I have a piece in mind' },
      { id: 'goal.zone', label: 'Refresh one zone' },
      { id: 'goal.full', label: 'Full bathroom' },
      { id: 'goal.explore', label: 'Just exploring' },
    ],
    capabilityPrompt: 'What I can do',
    capabilityChips: [
      { id: 'cap.styles', label: 'Show me styles' },
      { id: 'cap.budget', label: 'Pick by budget' },
    ],
  }
}

/**
 * Stream a fixed string one character at a time, mirroring the look of
 * a real SSE token stream. Mounts at most once per text value.
 */
function useTypewriter(text: string, charMs = 16, startDelay = 200) {
  const [out, setOut] = useState('')
  const doneRef = useRef(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    let cancelled = false
    setOut('')
    setDone(false)
    doneRef.current = false
    const startT = window.setTimeout(() => {
      if (cancelled) return
      let i = 0
      const step = () => {
        if (cancelled) return
        i += 1
        setOut(text.slice(0, i))
        if (i < text.length) {
          window.setTimeout(step, charMs)
        } else {
          doneRef.current = true
          setDone(true)
        }
      }
      step()
    }, startDelay)
    return () => {
      cancelled = true
      window.clearTimeout(startT)
    }
  }, [text, charMs, startDelay])
  return { out, done }
}

function ChipRow({
  chips,
  onPick,
  variant,
}: {
  readonly chips: ReadonlyArray<ChipDef>
  readonly onPick: (label: string, opts?: { readonly forceTool?: string }) => void
  readonly variant: 'goal' | 'capability'
}) {
  const goalClass =
    'border-[var(--color-lowes-blue)] bg-[var(--color-surface)] text-[var(--color-lowes-blue)] hover:bg-[color-mix(in_srgb,var(--color-lowes-blue)_8%,var(--color-surface))]'
  const capClass =
    'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,var(--color-surface))]'
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onPick(chip.label, chip.forceTool ? { forceTool: chip.forceTool } : undefined)}
          className={`min-h-[36px] rounded-full border px-4 text-sm font-semibold ${variant === 'goal' ? goalClass : capClass}`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

export function WelcomeCard({ scenario, onChipPick, dimmed = false }: Props) {
  const content = composeWelcome(scenario)
  // 32ms/char ≈ ~30 WPM, the pacing common chat AIs use when they fake
  // a stream. 16ms felt machine-fast; 32 reads as "someone typing on
  // the other side". 250ms initial delay lets the context strip settle.
  const { out: typed, done: proseDone } = useTypewriter(content.prose, 32, 250)

  // Once the conversation has moved past the welcome, soften everything:
  // chips lose pointer events optically (still clickable, but visually
  // they read as past UI), and the whole block fades to 70% opacity.
  const wrapperClass = `flex flex-col gap-4 self-stretch transition-opacity duration-[300ms] ${dimmed ? 'opacity-60' : 'opacity-100'}`

  return (
    <div className={wrapperClass}>
      {content.contextLine ? (
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          {content.contextLine}
        </div>
      ) : null}

      <p className="text-[16px] leading-relaxed text-[var(--color-ink)]">
        {typed}
        {!proseDone ? (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[var(--color-ink)] align-middle"
          />
        ) : null}
      </p>

      {/* Chips render only after the prose has fully arrived. */}
      <div
        className={`flex flex-col gap-4 transition-opacity duration-[350ms] ease-out ${proseDone ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold text-[var(--color-muted)]">{content.goalPrompt}</div>
          <ChipRow chips={content.goalChips} onPick={onChipPick} variant="goal" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold text-[var(--color-muted)]">{content.capabilityPrompt}</div>
          <ChipRow chips={content.capabilityChips} onPick={onChipPick} variant="capability" />
        </div>
      </div>
    </div>
  )
}
