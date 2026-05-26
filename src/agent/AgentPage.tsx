import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { DEFAULT_SYSTEM_PROMPT } from './systemPrompt'
import { SCENARIOS, entryContextString } from './scenarios'
import { useAgentChat, type ChatMessage } from './useAgentChat'
import type { SlotState } from './slotModel'
import { setSlot } from './slotModel'
import { RoomScenePanel, type SceneState } from './RoomScenePanel'
import { placeStandInForSlot, clearAgentPlacements } from './sceneBridge'
import { IsometricScene } from '@/scene/IsometricScene'
import { ProjectSettingsBar } from './ProjectSettingsBar'
import { ProjectSettingsSheet } from './ProjectSettingsSheet'
import { SceneViewToggle } from './SceneViewToggle'
import { ScenarioPicker, type ScenarioId } from './ScenarioPicker'
import { getMockShopper, bootstrapSlots } from './inference'
import { deriveAppContext, getAppContext } from './appContext'
import catalogJson from '../../data/catalog.json'

type CatalogItem = {
  readonly id: string
  readonly name: string
  readonly brand?: string
  readonly category: string
  readonly price_cents: number
  readonly image_url?: string
}
const CATALOG: ReadonlyArray<CatalogItem> = catalogJson as CatalogItem[]

/**
 * The agent playground — left: 3D placeholder (real R3F lands later); center:
 * chat thread; right: inspector with live-editable system prompt, scenario
 * picker, and turn telemetry. Designed for sit-and-tune: change the prompt,
 * reset, see the new behavior in seconds.
 *
 * Inspector is hidden when `?demo=1` is in the URL — clean view for the
 * actual meeting.
 */

export function AgentPage() {
  const params = useMemo(() => new URLSearchParams(location.search), [])
  // Axis 1 — appContext is derived from URL (?manufacturer=...) and
  // drives brand lockup, settings/cart labels, RAG namespace, scene
  // theme, etc. Falls back to 'lowes-consumer'.
  const appContextId = useMemo(() => deriveAppContext(params), [params])
  const appContext = getAppContext(appContextId)
  const demoMode = params.get('demo') === '1'
  // ?blank=1 → start with no scenario / no entry context. Just an open chat
  // box and an empty thread. The shopper (you) opens the conversation.
  const blankStart = params.get('blank') === '1'
  // ?inspector=1 → show the dev inspector instead of the room scene panel.
  const showInspector = params.get('inspector') === '1'
  // ?shopper=A|B|C|D|E|anon → bootstrap slot state from a mock Lowe's
  // session profile. The inference layer fills scope/style/budget/
  // persona/trigger from browse history + saved lists + region before
  // the user types anything — the "magical" path.
  const shopperId = params.get('shopper') ?? ''
  // Initial scenario: ?scenario= URL takes priority, then ?blank=1
  // legacy alias, otherwise default 'A'. Valid values: A-E + 'blank'.
  const initialScenarioId: ScenarioId = (() => {
    const raw = params.get('scenario')
    if (raw && ['A', 'B', 'C', 'D', 'E', 'blank'].includes(raw)) {
      return raw as ScenarioId
    }
    return blankStart ? 'blank' : 'A'
  })()
  const [scenarioId, setScenarioIdState] = useState<ScenarioId>(initialScenarioId)
  // Wrap setScenarioId so changing scenario also updates the URL — keeps
  // the link shareable and survives a reload. Uses replaceState to avoid
  // adding a history entry per pick.
  const setScenarioId = (next: ScenarioId) => {
    setScenarioIdState(next)
    const url = new URL(window.location.href)
    url.searchParams.set('scenario', next)
    // Cleanup the legacy ?blank=1 alias if present so we don't double-encode
    url.searchParams.delete('blank')
    window.history.replaceState(null, '', url.toString())
  }
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]
  const [input, setInput] = useState('')
  // Discovery slot state — agent + user write + inferred from Lowe's data.
  // If ?shopper= is present, we bootstrap from the mock profile on mount.
  const [slotState, setSlotState] = useState<SlotState>(() => {
    const profile = shopperId ? getMockShopper(shopperId) : undefined
    return bootstrapSlots(profile)
  })
  // Scene state (right room panel) — agent writes via updateSceneSlot.
  const [sceneState, setSceneState] = useState<SceneState>({})
  // Bottom-sheet (Project settings) state. unreadCount tracks how many
  // agent-driven slot updates have landed since the user last opened the
  // sheet — drives the red-dot indicator on the chip.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleToolUse = ({ name, input }: { name: string; input: Record<string, unknown> }) => {
    if (name === 'updateSlotConfidence') {
      const slot = String(input.slot ?? '')
      const confidence = Number(input.confidence ?? 0)
      const value = input.value
      const evidence = typeof input.evidence === 'string' ? input.evidence : undefined
      if (!slot) return
      setSlotState((prev) => setSlot(prev, slot, { value, confidence, evidence, source: 'agent' }))
      // Red-dot signal — only count when the sheet is closed; otherwise the
      // user is looking at the sheet right now and would see the change live.
      if (!settingsOpen) setUnreadCount((n) => n + 1)
    } else if (name === 'updateSceneSlot') {
      const slot = String(input.slot ?? '')
      const productId = String(input.product_id ?? '')
      const reason = typeof input.reason === 'string' ? input.reason : undefined
      if (!slot || !productId) return
      const product = CATALOG.find((p) => p.id === productId)
      if (!product) return
      setSceneState((prev) => ({
        ...prev,
        [slot]: {
          productId,
          brand: product.brand,
          name: product.name,
          price_cents: product.price_cents,
          image_url: product.image_url,
          reason,
        },
      }))
      // Live R3F scene update — pick a stand-in mesh for this slot and
      // place it in the IsometricScene via editorObjectsStore. A1 path:
      // visual approximation, not real bathroom GLBs. productId is
      // passed so the pick is deterministic across reloads for the
      // same agent recommendation.
      placeStandInForSlot(slot, productId)
    }
  }

  // Ref-snapshot of slotState for the chat hook. The hook reads the ref
  // at fetch-time so each chat request gets the freshest slot picture
  // (= what the server-side RAG retrieve() sees).
  const slotStateRef = useRef<SlotState>(slotState)
  slotStateRef.current = slotState

  const chat = useAgentChat(systemPrompt, handleToolUse, slotStateRef, appContextId)

  // Mobile detection via media query. Tailwind's lg: prefix was unreliable on
  // mobile Safari in this codebase (same problem we hit on /docs), so we
  // decide layout in JS and apply styles directly.
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Seed the conversation with the entry context on first mount + whenever
  // the scenario changes. Skip entirely for 'blank' — the user opens the
  // conversation themselves. The ref guards against React 19 StrictMode's
  // double-mount in dev.
  const seededFor = useRef<string | null>(null)
  useEffect(() => {
    if (seededFor.current === scenarioId) return
    // Scenario changed: wipe everything carrying state from the previous
    // run — chat thread, scene placements, dashboard slot state (other
    // than the inference-bootstrapped baseline), and unread chip count.
    // Then re-seed the new scenario (or just stop for 'blank').
    const isFirstMount = seededFor.current === null
    if (!isFirstMount) {
      chat.reset()
      clearAgentPlacements()
      setSceneState({})
      // Re-bootstrap slots from the mock shopper (if any) — preserves
      // the ?shopper= inference but drops anything the agent or user
      // touched during the previous scenario.
      const profile = shopperId ? getMockShopper(shopperId) : undefined
      setSlotState(bootstrapSlots(profile))
      setUnreadCount(0)
    }
    seededFor.current = scenarioId
    if (scenarioId === 'blank') {
      if (isFirstMount) chat.reset()
      return
    }
    const seedText =
      `[entry context — system fyi]\n${entryContextString(scenario.entry)}\n\n` +
      `[shopper has just landed; greet them according to the role's "consult" turn]`
    chat.seed(seedText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId])

  return (
    <div
      // dvh tracks the *visible* viewport on iOS Safari (excluding the URL bar),
      // so the input form at the bottom stays in view instead of being pushed
      // below the fold. Falls back to vh on browsers without dvh support.
      style={{ height: '100dvh' }}
      className="grid grid-rows-[auto_1fr] bg-[var(--color-surface)] text-[var(--color-ink)]"
    >
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3">
        <span className="text-callout font-extrabold tracking-tight text-[var(--color-lowes-blue)]">
          {appContext.brand.name}
        </span>
        {appContext.brand.tagline ? (
          <span className="text-caption text-[var(--color-muted)]">
            {appContext.brand.tagline}
          </span>
        ) : null}
        <div className="ml-auto">
          <ScenarioPicker value={scenarioId} onChange={setScenarioId} />
        </div>
      </header>

      {/* Desktop: chat is the LEFT rail (proto2's right panel width:
          clamp(360px, 30vw, 420px)), scene fills the main area on the
          right (proto2's preview region, flex-1). Mobile: single column,
          scene hidden. The Project-settings bottom sheet slides up inside
          the chat rail only — scene stays visible. */}
      <div
        className="flex min-h-0"
        style={{ height: '100%' }}
      >
        {/* chat — LEFT rail, bounded width. position: relative so the
            bottom sheet can absolute-position inside this column
            (covering chat but not the 3D scene to the right). */}
        <section
          style={{ width: 'clamp(360px, 30vw, 420px)' }}
          className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-[var(--color-border)]"
        >
          <ChatThread
            messages={chat.messages}
            streaming={chat.streaming}
            onUserPick={(text) => {
              if (!chat.streaming) void chat.send(text)
            }}
          />
          <form
            className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!input.trim() || chat.streaming) return
              void chat.send(input)
              setInput('')
            }}
          >
            {/* Project-settings chip + send row. The chip is the single
                entry point to the dashboard; red dot announces new agent
                inferences when sheet is closed. */}
            <div className="flex gap-2">
              <ProjectSettingsBar
                unreadCount={unreadCount}
                label={appContext.settings.label}
                onOpen={() => {
                  setSettingsOpen(true)
                  setUnreadCount(0)
                }}
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={chat.streaming}
                placeholder={chat.streaming ? 'Mylow is thinking…' : 'Type a reply…'}
                className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base disabled:opacity-50"
                style={{ minHeight: 48 }}
              />
              <button
                type="submit"
                disabled={!input.trim() || chat.streaming}
                className="rounded-[var(--radius-sm)] bg-[var(--color-lowes-blue)] px-5 text-base font-bold text-[var(--color-on-brand)] disabled:opacity-40"
                style={{ minHeight: 48 }}
              >
                Send
              </button>
            </div>
            {chat.error ? (
              <div className="mt-2 text-caption text-red-600">{chat.error}</div>
            ) : null}
          </form>
          {/* The bottom sheet itself — slides up inside this section so
              backdrop + sheet stay within the chat column and don't cover
              the 3D scene. */}
          <ProjectSettingsSheet
            open={settingsOpen}
            state={slotState}
            title={appContext.settings.label}
            subhead={appContext.settings.subhead}
            onSlotEdit={(slotId, newValue) =>
              setSlotState((prev) =>
                setSlot(prev, slotId, {
                  value: newValue,
                  confidence: 95,
                  source: 'user',
                  evidence: 'set in dashboard',
                }),
              )
            }
            onClose={() => setSettingsOpen(false)}
          />
        </section>

        {/* right — room scene as the MAIN area (flex-1, like proto2's
            preview pane). Inspector swap if ?inspector=1. Hidden in demo
            mode + on mobile. */}
        {isDesktop && !demoMode ? (
          <aside className="h-full min-h-0 min-w-0 flex-1">

            {showInspector ? (
              <Inspector
                scenarioId={scenarioId}
                onScenario={setScenarioId}
                systemPrompt={systemPrompt}
                onSystemPrompt={setSystemPrompt}
                onReset={() => {
                  chat.reset()
                  clearAgentPlacements()
                  setSceneState({})
                  setSlotState({})
                  seededFor.current = null
                  void chat.seed(
                    `[entry context — system fyi]\n${entryContextString(scenario.entry)}\n\n` +
                      `[shopper has just landed; greet them according to the role's "consult" turn]`,
                  )
                  seededFor.current = scenarioId
                }}
                messageCount={chat.messages.length}
              />
            ) : params.get('scene') === '2d' ? (
              // Legacy PNG-overlay scene panel kept behind ?scene=2d for the
              // first hero-moment fallback. Default is the live R3F scene.
              <RoomScenePanel state={sceneState} />
            ) : (
              // Live 3D — IsometricScene reads from editorObjectsStore. The
              // agent's updateSceneSlot tool calls flow through sceneBridge.ts
              // which mutates that store, so the canvas updates as the
              // conversation progresses.
              //
              // The wrapper sets `position: relative` + a concrete height
              // because the R3F <Canvas> inside IsometricScene is
              // `position: absolute; inset: 0` — without a sized relative
              // ancestor the WebGL canvas mounts at 0×0.
              //
              // Background #f5f5f5 (--color-surface-sunken) sits under the
              // Canvas; Canvas itself still paints `color.scene.bg` (#1B1B1D)
              // because that value is reused by R3F's fog. We override the
              // canvas style with the same light color so the *visible* room
              // background is light, not pocketroom-dark.
              <div
                data-agent-scene
                style={{
                  position: 'relative',
                  height: '100%',
                  width: '100%',
                  background: '#f5f5f5',
                }}
                className="overflow-hidden"
              >
                <IsometricScene theme={appContext.sceneTheme} />
                {/* View toggle overlay — top-right corner of the scene.
                    Mounted *outside* the Canvas so it stays interactive
                    even when R3F captures pointer events. */}
                <SceneViewToggle />
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function ChatThread({
  messages,
  streaming,
  onUserPick,
}: {
  readonly messages: readonly ChatMessage[]
  readonly streaming: boolean
  readonly onUserPick: (text: string) => void
}) {
  // Auto-scroll the thread to the bottom as new tokens arrive.
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      {messages.length === 0 ? (
        <div className="m-auto max-w-xs text-center text-caption text-[var(--color-muted)]">
          Empty chat — say something to start. Try
          {' '}<em>"I want to redo my bathroom"</em> or
          {' '}<em>"show me modern vanities"</em>.
        </div>
      ) : null}
      {messages.map((m, i) => {
        const isUser = m.role === 'user'
        const isFirstUser = isUser && i === 0
        // First user message = the entry-context seed; de-emphasize it.
        if (isUser) {
          return (
            <div
              key={i}
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              className={
                isFirstUser
                  ? 'self-stretch whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-muted)_8%,transparent)] px-3 py-2 font-mono text-[11px] text-[var(--color-muted)]'
                  : 'self-end max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-lowes-blue)] px-4 py-2.5 text-small text-[var(--color-on-brand)]'
              }
            >
              {m.content}
            </div>
          )
        }
        // Assistant: full-width markdown rendering + optional thinking panel.
        const isLast = i === messages.length - 1
        const isStreamingThis = streaming && isLast
        return (
          <AssistantBlock
            key={i}
            message={m}
            streaming={isStreamingThis}
            onUserPick={onUserPick}
          />
        )
      })}
      <div ref={endRef} />
    </div>
  )
}

function AssistantBlock({
  message,
  streaming,
  onUserPick,
}: {
  readonly message: ChatMessage
  readonly streaming: boolean
  readonly onUserPick: (text: string) => void
}) {
  const [thinkingOpen, setThinkingOpen] = useState(false)
  // While streaming, default-open the thinking panel so the user sees reasoning
  // live. After the answer finishes, collapse it (assumes the user wants the
  // final answer prominent and reasoning is reference-only).
  useEffect(() => {
    if (streaming && message.thinking) setThinkingOpen(true)
    if (!streaming) setThinkingOpen(false)
  }, [streaming, message.thinking])

  const html = useMemo(
    () => (message.content ? (marked.parse(message.content) as string) : ''),
    [message.content],
  )

  return (
    <div className="flex flex-col gap-2">
      {message.thinking ? (
        <details
          open={thinkingOpen}
          onToggle={(e) => setThinkingOpen((e.target as HTMLDetailsElement).open)}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-muted)_6%,transparent)]"
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-caption font-bold uppercase tracking-widest text-[var(--color-muted)]">
            {streaming && !message.content ? 'Thinking…' : 'Thinking'}{' '}
            <span className="ml-1 font-normal normal-case tracking-normal opacity-70">
              ({message.thinking.length} chars)
            </span>
          </summary>
          <div
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            className="whitespace-pre-wrap border-t border-[var(--color-border)] px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--color-muted)]"
          >
            {message.thinking}
          </div>
        </details>
      ) : null}
      {message.content || streaming ? (
        <div
          className="agent-prose"
          dangerouslySetInnerHTML={{ __html: html || '<p>…</p>' }}
        />
      ) : null}
      {(message.toolCalls ?? []).map((tc, i) => (
        <RichComponent key={i} call={tc} onUserPick={onUserPick} />
      ))}
    </div>
  )
}

function RichComponent({
  call,
  onUserPick,
}: {
  readonly call: { readonly name: string; readonly input: Record<string, unknown> }
  readonly onUserPick: (text: string) => void
}) {
  if (call.name === 'proposeChipChoice') {
    const question = (call.input.question as string) ?? ''
    const options = (call.input.options as string[]) ?? []
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-lowes-blue)_4%,transparent)] px-3 py-2.5">
        {question ? <p className="mb-2 text-small text-[var(--color-ink)]">{question}</p> : null}
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onUserPick(opt)}
              className="rounded-full border border-[var(--color-lowes-blue)] bg-[var(--color-surface)] px-3 py-1 text-small font-medium text-[var(--color-lowes-blue)] hover:bg-[var(--color-lowes-blue)] hover:text-[var(--color-on-brand)]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (call.name === 'proposeImageChoice') {
    const question = (call.input.question as string) ?? ''
    const options = (call.input.options as Array<{
      id: string; label: string; blurb?: string; image_url?: string
    }>) ?? []
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-lowes-blue)_4%,transparent)] px-3 py-2.5">
        {question ? <p className="mb-2 text-small text-[var(--color-ink)]">{question}</p> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onUserPick(o.label)}
              className="flex flex-col items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-left hover:border-[var(--color-lowes-blue)]"
            >
              {o.image_url ? (
                <img
                  src={o.image_url}
                  alt={o.label}
                  className="h-24 w-full object-cover"
                />
              ) : (
                <div className="flex h-24 items-center justify-center bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-caption text-[var(--color-muted)]">
                  {o.label}
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="text-small font-bold text-[var(--color-ink)]">{o.label}</p>
                {o.blurb ? (
                  <p className="text-[11px] text-[var(--color-muted)]">{o.blurb}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (call.name === 'proposeProductGrid') {
    const intro = (call.input.intro as string) ?? ''
    const products = (call.input.products as Array<{
      id: string; name: string; brand?: string; price_cents: number; image_url?: string; reason?: string
    }>) ?? []
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-lowes-blue)_4%,transparent)] px-3 py-2.5">
        {intro ? <p className="mb-2 text-small text-[var(--color-ink)]">{intro}</p> : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="h-14 w-14 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-[var(--color-muted)]">{p.brand ?? ''}</p>
                <p className="truncate text-small font-bold text-[var(--color-ink)]">
                  {p.name}
                </p>
                <p className="text-small text-[var(--color-ink)]">${(p.price_cents / 100).toFixed(2)}</p>
                {p.reason ? (
                  <p className="mt-0.5 text-[11px] italic text-[var(--color-muted)]">
                    {p.reason}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  // updateSlotConfidence renders nothing — it's a side effect (dashboard)
  return null
}

function Inspector({
  scenarioId,
  onScenario,
  systemPrompt,
  onSystemPrompt,
  onReset,
  messageCount,
}: {
  readonly scenarioId: 'A' | 'B' | 'C' | 'D' | 'E' | 'blank'
  readonly onScenario: (id: 'A' | 'B' | 'C' | 'D' | 'E' | 'blank') => void
  readonly systemPrompt: string
  readonly onSystemPrompt: (s: string) => void
  readonly onReset: () => void
  readonly messageCount: number
}) {
  const noteText =
    scenarioId === 'blank'
      ? 'Empty chat — you start the conversation.'
      : SCENARIOS.find((s) => s.id === scenarioId)?.note
  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-ink))] px-4 py-4 text-caption">
      <div>
        <div className="mb-1 font-bold uppercase tracking-widest text-[var(--color-muted)]">
          Scenario
        </div>
        <select
          value={scenarioId}
          onChange={(e) => onScenario(e.target.value as 'A' | 'B' | 'C' | 'D' | 'E' | 'blank')}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-small"
        >
          <option value="blank">— · Blank chat (no entry context)</option>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="mt-1.5 text-[11px] text-[var(--color-muted)]">{noteText}</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-bold hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
        >
          Reset & replay
        </button>
        <span className="text-[11px] text-[var(--color-muted)]">{messageCount} msgs</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1 font-bold uppercase tracking-widest text-[var(--color-muted)]">
          System prompt (live-editable)
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => onSystemPrompt(e.target.value)}
          spellCheck={false}
          className="min-h-[260px] flex-1 resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-[11px] leading-relaxed"
        />
        <div className="mt-1 text-[11px] text-[var(--color-muted)]">
          Edit then click <em>Reset & replay</em> to test with new prompt.
        </div>
      </div>
    </aside>
  )
}
