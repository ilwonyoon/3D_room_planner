#!/usr/bin/env node
/**
 * Trajectory eval harness.
 *
 * Per case: spin up a persona simulator (Haiku 4.5) and the agent under
 * test (Sonnet 4.6 with extended thinking). Run their conversation up
 * to MAX_TURNS. After it ends, hand the full trajectory to a judge
 * (Sonnet 4.6) and write a structured verdict. Aggregate across cases
 * into a single report JSON under data/eval/reports/.
 *
 * Run: `npm run eval` (or `node scripts/eval-trajectory.mjs`)
 * Flags:
 *   --quick           3 cases (smoke test, ~$1)
 *   --persona A       single persona (all budget postures)
 *   --case A.on_target.1   single case
 *   --max-turns N     override turn cap (default 8)
 *
 * Cost note: a full run ≈ 15 cases × ~15 LLM calls ≈ $5-15.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { config as loadDotenv } from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

loadDotenv({ path: '.env.local' })

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('eval-trajectory: ANTHROPIC_API_KEY missing in .env.local')
  process.exit(1)
}
const client = new Anthropic({ apiKey })

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────
const MODEL_AGENT = 'claude-sonnet-4-6'
const MODEL_PERSONA = 'claude-haiku-4-5-20251001'
const MODEL_JUDGE = 'claude-sonnet-4-6'
const DEFAULT_MAX_TURNS = 10
// Thinking budget for the agent. Must be ≥ 1024 and < agent max_tokens.
const AGENT_THINKING_BUDGET = 1536
const AGENT_MAX_TOKENS = 3072

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const flagValue = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const hasFlag = (name) => args.includes(name)

const quick = hasFlag('--quick')
const onePersona = flagValue('--persona')
const oneCase = flagValue('--case')
const MAX_TURNS = parseInt(flagValue('--max-turns') ?? '', 10) || DEFAULT_MAX_TURNS

// Load inputs
const personasJson = JSON.parse(await fs.readFile('data/eval/personas.json', 'utf8'))
const judgeCriteria = await fs.readFile('data/eval/judge-criteria.md', 'utf8')
const judgeSchemaText = await fs.readFile('data/eval/judge-output.schema.json', 'utf8')

// The system prompt under test. We import it dynamically so it can change
// between runs. Read the source verbatim so we capture the full string.
const promptSource = await fs.readFile('src/agent/systemPrompt.ts', 'utf8')
const promptMatch = promptSource.match(/DEFAULT_SYSTEM_PROMPT = `([\s\S]*?)`/)
if (!promptMatch) {
  console.error('eval-trajectory: could not extract DEFAULT_SYSTEM_PROMPT')
  process.exit(1)
}
const SYSTEM_PROMPT = promptMatch[1]
const versionMatch = promptSource.match(/DEFAULT_PROMPT_VERSION = '([^']+)'/)
const PROMPT_VERSION = versionMatch ? versionMatch[1] : 'unknown'

// Also pull the bathroom catalog so the agent has something concrete to
// retrieve from. For the eval, we include a compact representation right in
// the system prompt — there's no separate retrieval tool yet.
const catalog = JSON.parse(await fs.readFile('data/catalog.json', 'utf8'))
const catalogSummary = catalog
  .map(
    (p) =>
      `- [${p.category}] ${p.brand} — ${p.name} | $${(p.price_cents / 100).toFixed(2)}` +
      (p.style_tags?.length ? ` | tags: ${p.style_tags.join(', ')}` : ''),
  )
  .join('\n')

const SYSTEM_PROMPT_WITH_CATALOG =
  SYSTEM_PROMPT +
  '\n\n==== CATALOG (Lowe\'s — pull names/prices from here only) ====\n' +
  catalogSummary +
  '\n==== END CATALOG ===='

// ─────────────────────────────────────────────────────────────────────────
// Build the case list
// ─────────────────────────────────────────────────────────────────────────

const PERSONAS = personasJson.personas
const BUDGET_POSTURES = personasJson.budget_postures

// Strategic sample — per docs/bond-demo/08-DISCOVERY-FOCUS.md, we don't run
// every persona × every posture (would be 7×4=28). Instead pick the cells
// where the posture is informative for that persona.
const CASE_MATRIX = [
  // mid-spectrum on-target — baseline behavior
  ['A', 'on_target'], ['B', 'on_target'], ['C', 'on_target'],
  ['D', 'on_target'], ['E', 'on_target'],
  // over-silent — flag-the-climb behavior
  ['A', 'over_silent'], ['B', 'over_silent'],
  // refuses-anchor — concrete-assumption behavior
  ['A', 'refuses_anchor'], ['D', 'refuses_anchor'], ['E', 'refuses_anchor'],
  // F (I-don't-know) — calibration to "just show me"
  ['F', 'unrealistic_low'], ['F', 'refuses_anchor'],
  // G (I-know-exactly) — propose-fast behavior
  ['G', 'on_target'],
]

const personaById = Object.fromEntries(PERSONAS.map((p) => [p.id, p]))
const postureById = Object.fromEntries(BUDGET_POSTURES.map((p) => [p.id, p]))

/**
 * Inference-mode seeds — pre-fill slot state to simulate cold/warm/hot
 * shopper context arriving from the Lowe's session. The eval verifies
 * that the agent acknowledges these and adapts behavior accordingly.
 *
 * cold: no pre-fill, agent must ask scope first
 * warm: scope + style inferred at moderate confidence (60-70)
 * hot:  scope + style + budget + persona inferred at high confidence (75-85)
 */
const INFERENCE_SEEDS = {
  cold: () => ({}),
  warm: () => ({
    style_direction: {
      value: 'transitional',
      confidence: 70,
      evidence: 'browsing transitional vanities + brass fixtures',
      source: 'agent',
    },
    scope: {
      value: 'partial',
      confidence: 60,
      evidence: 'multiple bath categories viewed in same session',
      source: 'agent',
    },
  }),
  hot: () => ({
    style_direction: {
      value: 'transitional',
      confidence: 80,
      evidence: '4 navy vanity PDPs + brass faucet saved to list',
      source: 'agent',
    },
    scope: {
      value: 'partial',
      confidence: 75,
      evidence: 'Saved list "First Home Bath" has vanity + mirror',
      source: 'agent',
    },
    budget_range: {
      value: { low: 2500, high: 5000 },
      confidence: 70,
      evidence: 'Mid-tier price band across recent browsing',
      source: 'agent',
    },
    persona_traits: {
      value: ['newlywed'],
      confidence: 60,
      evidence: 'first-home demographic signals',
      source: 'agent',
    },
  }),
  // Single-SKU pre-fill: PDP entry pins scope = a_few_items at high
  // confidence. Used to verify the agent stays in commerce-filter mode
  // and DOESN'T emit a bundle.
  single_hot: () => ({
    scope: {
      value: 'a_few_items',
      confidence: 85,
      evidence: 'PDP entry — viewing a specific toilet for replacement',
      source: 'agent',
    },
    style_direction: {
      value: 'traditional',
      confidence: 60,
      evidence: 'product viewed is traditional white toilet',
      source: 'agent',
    },
    trigger: {
      value: 'leak_urgent',
      confidence: 75,
      evidence: 'search terms include "leak" and "fix now"',
      source: 'agent',
    },
  }),
  // Full-reno pre-fill: scope = full_reno, configuration committed,
  // style + budget at moderate confidence. Used to verify the agent
  // proposes MULTIPLE bundles across the session.
  full_hot: () => ({
    scope: {
      value: 'full_reno',
      confidence: 85,
      evidence: 'Saved list "Master Bath 2026", browsed tub + shower + vanity',
      source: 'agent',
    },
    style_direction: {
      value: 'transitional',
      confidence: 75,
      evidence: 'transitional-leaning browsing',
      source: 'agent',
    },
    budget_range: {
      value: { low: 8000, high: 15000 },
      confidence: 65,
      evidence: 'premium tier + saved high-end SKUs',
      source: 'agent',
    },
    bathroom_configuration: {
      value: 'full_bath',
      confidence: 60,
      evidence: 'browsed tub + shower + vanity (full bath layout)',
      source: 'agent',
    },
  }),
}

const allCases = CASE_MATRIX.flatMap(([pid, posId]) => {
  // Each (persona, posture) becomes 3 sub-cases (cold/warm/hot) — but we
  // only need a representative sample for the full matrix; full coverage
  // happens at the quick filter. Default to cold for non-quick runs so
  // the original 13-case matrix stays unchanged.
  return [{
    id: `${pid}.${posId}.cold`,
    persona: personaById[pid],
    posture: postureById[posId],
    scenarioMode: 'cold',
    initialSlotState: INFERENCE_SEEDS.cold(),
  }]
}).filter((c) => c.persona && c.posture)

let cases = allCases
if (onePersona) cases = cases.filter((c) => c.persona.id === onePersona)
if (oneCase) cases = cases.filter((c) => c.id === oneCase || c.id.startsWith(oneCase + '.'))
if (quick) {
  // Smoke test covers the 3 inference modes (cold/warm/hot) + all 3
  // scope modes (single/partial/full) so the v13 mode-specific rules
  // can be measured per surface. 7 cases:
  //   A.on_target.cold       — baseline cold start, partial inferred from chat
  //   A.on_target.hot        — magical (warm-start partial)
  //   D.on_target.hot        — premium/downsizer partial — D fails ack at v12
  //   G.on_target.hot        — "I know exactly" partial — G fails ack at v12
  //   F.unrealistic_low.warm — "I don't know" with weak warm-start
  //   C.on_target.single_hot — leak urgency, single-SKU mode (no bundle expected)
  //   B.on_target.full_hot   — family full reno, multiple bundles expected
  cases = [
    { id: 'A.on_target.cold', persona: personaById.A, posture: postureById.on_target, scenarioMode: 'cold', initialSlotState: INFERENCE_SEEDS.cold() },
    { id: 'A.on_target.hot', persona: personaById.A, posture: postureById.on_target, scenarioMode: 'hot', initialSlotState: INFERENCE_SEEDS.hot() },
    { id: 'D.on_target.hot', persona: personaById.D, posture: postureById.on_target, scenarioMode: 'hot', initialSlotState: INFERENCE_SEEDS.hot() },
    { id: 'G.on_target.hot', persona: personaById.G, posture: postureById.on_target, scenarioMode: 'hot', initialSlotState: INFERENCE_SEEDS.hot() },
    { id: 'F.unrealistic_low.warm', persona: personaById.F, posture: postureById.unrealistic_low, scenarioMode: 'warm', initialSlotState: INFERENCE_SEEDS.warm() },
    { id: 'C.on_target.single_hot', persona: personaById.C, posture: postureById.on_target, scenarioMode: 'single_hot', initialSlotState: INFERENCE_SEEDS.single_hot() },
    { id: 'B.on_target.full_hot', persona: personaById.B, posture: postureById.on_target, scenarioMode: 'full_hot', initialSlotState: INFERENCE_SEEDS.full_hot() },
  ].filter((c) => c.persona && c.posture)
}

if (cases.length === 0) {
  console.error('eval-trajectory: no cases matched the filter')
  process.exit(1)
}

console.log(
  `eval-trajectory: prompt version ${PROMPT_VERSION}, running ${cases.length} cases ` +
    `(max ${MAX_TURNS} turns/case)`,
)

// ─────────────────────────────────────────────────────────────────────────
// One agent turn — go through our api-server (port 3001) so RAG + tool
// schemas + prompt assembly are exactly the same as what the live demo
// uses. The harness sends the bare DEFAULT_SYSTEM_PROMPT plus slotState
// + appContextId; the server appends DYNAMIC KNOWLEDGE / PRE-FILLED
// SLOTS / catalog slice itself.
// ─────────────────────────────────────────────────────────────────────────

const API_URL = 'http://localhost:3001/api/chat'

const runAgentTurn = async ({ history, sceneState, slotState, appContextId }) => {
  const sceneNote = sceneState && Object.keys(sceneState).length
    ? `\n\n[scene-state for fyi: ${JSON.stringify(sceneState)}]`
    : ''
  const messagesForApi = history.map((m, i) => {
    // v13.3 act-first: tool-only assistant turns produce empty text. The
    // Anthropic API rejects empty string content, so substitute a minimal
    // placeholder that preserves turn order without inventing dialog.
    const safeContent =
      typeof m.content === 'string' && m.content.trim() === ''
        ? '[tool call only — no spoken reply]'
        : m.content
    if (i === history.length - 1 && m.role === 'user') {
      return { role: 'user', content: safeContent + sceneNote }
    }
    return { role: m.role, content: safeContent }
  })

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: SYSTEM_PROMPT, // server appends RAG + catalog
      messages: messagesForApi,
      slotState: slotState ?? {},
      appContextId: appContextId ?? 'lowes-consumer',
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`api-server error: ${errText}`)
  }
  // Parse the SSE stream — accumulate text deltas, thinking deltas, and
  // any tool_use blocks. tool_use is the key signal for bundle eval.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let text = ''
  let thinking = ''
  const toolCalls = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let lineEnd
    while ((lineEnd = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, lineEnd)
      buf = buf.slice(lineEnd + 1)
      if (!line.startsWith('data: ')) continue
      const payload = line.slice('data: '.length).trim()
      if (!payload || payload === '[DONE]') continue
      let obj
      try { obj = JSON.parse(payload) } catch { continue }
      if (obj.type === 'text_delta') text += obj.text ?? ''
      else if (obj.type === 'thinking_delta') thinking += obj.text ?? ''
      else if (obj.type === 'tool_use') {
        toolCalls.push({
          id: obj.id,
          name: obj.name,
          input: obj.input ?? {},
        })
      }
    }
  }
  return { text, thinking, toolCalls, raw: null }
}

// ─────────────────────────────────────────────────────────────────────────
// One persona turn — Haiku 4.5 acting as the persona
// ─────────────────────────────────────────────────────────────────────────

const runPersonaTurn = async ({ persona, posture, history, sceneState }) => {
  const personaSystem =
    persona.simulator_prompt +
    '\n\n— Budget posture for THIS conversation:\n' +
    posture.behavior_addendum +
    '\n\n— Output rules:\n' +
    '* Reply ONLY with what the persona would say (no commentary, no quotation marks).\n' +
    '* Keep replies short (usually 1-3 sentences).\n' +
    '* If you (the persona) want to end the conversation happily, say so naturally (e.g., "perfect, let\'s go with this").\n' +
    '* If you want to abandon (frustrated, confused, given up), say something like "you know what, this isn\'t working — I\'m out" naturally.\n' +
    '* If the agent showed visual options (image cards, chips), pick one by saying which one you\'d tap.'

  // Build a transcript where roles are FLIPPED from the persona's POV:
  // the agent's turns become "user" turns (incoming messages to the persona),
  // and the persona's previous turns become "assistant" turns. Persona LLM
  // continues as assistant.
  const transcript = history
    // Skip the first user message if it's an entry-context seed (starts with [entry context).
    .filter(
      (m, i) =>
        !(
          i === 0 &&
          m.role === 'user' &&
          typeof m.content === 'string' &&
          m.content.startsWith('[entry context')
        ),
    )
    .map((m) => ({
      role: m.role === 'assistant' ? 'user' : 'assistant',
      // v13.3 act-first: agent may emit a tool-only turn with empty text.
      // Anthropic API rejects empty user content, so substitute a placeholder
      // describing what the agent did so the persona can react meaningfully.
      content:
        typeof m.content === 'string' && m.content.trim() === ''
          ? '[the agent performed an action without speaking — likely opening a product grid or updating settings]'
          : m.content,
    }))

  // If the conversation is empty (no agent has spoken yet), give the persona
  // a "go" cue so they open the conversation themselves.
  if (transcript.length === 0) {
    transcript.push({
      role: 'user',
      content:
        '[The agent is waiting for you to open the conversation. Speak first, naturally, as your persona.]',
    })
  }

  const res = await client.messages.create({
    model: MODEL_PERSONA,
    max_tokens: 512,
    system: personaSystem,
    messages: transcript,
  })

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  return text
}

// ─────────────────────────────────────────────────────────────────────────
// Stop conditions
// ─────────────────────────────────────────────────────────────────────────

// Stop conditions — require explicit "go with this / take it / add to cart"
// patterns. Bare "perfect" or "sounds good" alone is NOT a confirm — those
// fire on agreeing to a budget range, a single option choice, etc. Real
// confirms either combine confidence + action ("yes let's do it"), name the
// cart action, or use unambiguous finalization phrases.
const looksLikeConfirm = (text) => {
  const t = text.toLowerCase()
  // Action-oriented confirms (must include both a directive and finality)
  if (/\b(let's|let me|i'll|we'll)\s+(go|do|take|add|grab|get|finalize)\b/.test(t)) return true
  // Direct cart actions
  if (/\b(add (this|that|it|them|those|all|everything) to (my |the )?cart)\b/.test(t)) return true
  if (/\b(go ahead and add|put (this|that|it|them) in (my |the )?cart)\b/.test(t)) return true
  // Finalization phrases
  if (/\b(book it|done deal|sold|i'll take (it|them|all)|let's finalize|let's check out|let's confirm)\b/.test(t)) return true
  // "Go with this" specifically (not "go with that range / option")
  if (/\b(go with (this|all of this|the whole|all those|all these)|going with (this|all|the whole))\b/.test(t)) return true
  return false
}
const looksLikeAbandon = (text) => {
  const t = text.toLowerCase()
  return (
    /\b(not working|i'm out|forget it|giving up|never mind|cancel|abandon)\b/.test(t) ||
    /\bthis isn't working\b/.test(t)
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Single trajectory
// ─────────────────────────────────────────────────────────────────────────

/**
 * Apply a tool_use to the trajectory's slot + scene state. Mirrors the
 * client-side handleToolUse in AgentPage.tsx so the eval-time state
 * stays in sync with what a real session would track. This lets the
 * agent's next turn receive an updated slotState (the same way the
 * live UI feeds slots back into each chat request).
 */
const applyToolToState = ({ slotState, sceneState }, call) => {
  if (call.name === 'updateSlotConfidence') {
    const slot = String(call.input?.slot ?? '')
    if (!slot) return
    slotState[slot] = {
      value: call.input.value,
      confidence: Number(call.input.confidence ?? 0),
      evidence: call.input.evidence,
      source: 'agent',
    }
  } else if (call.name === 'updateSceneSlot') {
    const slot = String(call.input?.slot ?? '')
    const productId = String(call.input?.product_id ?? '')
    if (!slot || !productId) return
    sceneState[slot] = {
      productId,
      reason: call.input.reason,
    }
  }
}

const runTrajectory = async ({ id, persona, posture, initialSlotState = {}, scenarioMode = 'cold' }) => {
  console.log(`\n▶ case ${id}: ${persona.title} / ${posture.title} (${scenarioMode})`)
  const history = []
  const sceneState = {}
  const slotState = JSON.parse(JSON.stringify(initialSlotState)) // mutate-safe
  const sceneStateHistory = []
  // Tool emission log — every tool_use across the trajectory. Used by the
  // judge to score bundle_emitted_when_due, mode_appropriate_ui, etc.
  const toolCallLog = []
  let outcome = 'incomplete'

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const userText = await runPersonaTurn({
      persona,
      posture,
      history,
      sceneState,
    })
    if (!userText) {
      console.log(`  turn ${turn}: persona produced empty reply — ending`)
      break
    }
    history.push({ role: 'user', content: userText })
    const userPreview = userText.slice(0, 90).replace(/\n/g, ' ')
    console.log(`  T${turn} user:  ${userPreview}${userText.length > 90 ? '…' : ''}`)

    if (looksLikeAbandon(userText)) {
      outcome = 'abandoned'
      break
    }
    if (looksLikeConfirm(userText)) {
      console.log(`  T${turn} → persona confirmed; giving agent one close turn`)
      const closeTurn = await runAgentTurn({ history, sceneState, slotState })
      history.push({
        role: 'assistant',
        content: closeTurn.text,
        thinking: closeTurn.thinking,
      })
      for (const c of closeTurn.toolCalls ?? []) {
        toolCallLog.push({ turn, ...c })
        applyToolToState({ slotState, sceneState }, c)
      }
      const closePreview = closeTurn.text.slice(0, 90).replace(/\n/g, ' ')
      console.log(`  T${turn} close: ${closePreview}${closeTurn.text.length > 90 ? '…' : ''}`)
      sceneStateHistory.push({ turn, sceneState: { ...sceneState }, is_close_turn: true })
      outcome = 'completed'
      break
    }

    const agent = await runAgentTurn({ history, sceneState, slotState })
    history.push({
      role: 'assistant',
      content: agent.text,
      thinking: agent.thinking,
    })
    for (const c of agent.toolCalls ?? []) {
      toolCallLog.push({ turn, ...c })
      applyToolToState({ slotState, sceneState }, c)
    }
    const agentPreview = agent.text.slice(0, 90).replace(/\n/g, ' ')
    const toolPreview = (agent.toolCalls ?? []).map((c) => c.name).join(',')
    console.log(`  T${turn} agent: ${agentPreview}${agent.text.length > 90 ? '…' : ''}`)
    if (toolPreview) console.log(`         tools: ${toolPreview}`)

    sceneStateHistory.push({ turn, sceneState: { ...sceneState } })
  }

  return {
    id,
    persona,
    posture,
    history,
    sceneStateHistory,
    toolCallLog,
    initialSlotState,
    finalSlotState: slotState,
    scenarioMode,
    outcome,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Judge a trajectory
// ─────────────────────────────────────────────────────────────────────────

const buildJudgePrompt = ({ trajectory }) => {
  const {
    persona, posture, history, sceneStateHistory, outcome,
    toolCallLog = [], initialSlotState = {}, scenarioMode = 'cold',
  } = trajectory

  const transcript = history
    .map((m, i) => `[T${i}] ${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  // Compact tool-emission log for the judge: turn + tool name + a short
  // summary of the input. Critical for bundle_emitted_when_due,
  // pre_filled_acknowledged, and mode_appropriate_ui.
  const toolLines = toolCallLog.map((c) => {
    const i = c.input ?? {}
    let summary = ''
    if (c.name === 'updateSlotConfidence') {
      summary = `slot=${i.slot} value=${JSON.stringify(i.value)} conf=${i.confidence}`
    } else if (c.name === 'updateSceneSlot') {
      summary = `slot=${i.slot} product_id=${i.product_id}`
    } else if (c.name === 'proposeProductGrid') {
      summary =
        (i.bundle ? `BUNDLE id=${i.bundle.id} name="${i.bundle.name}" finish=${i.bundle.finish_family} ` : 'no-bundle ') +
        `items=${(i.products ?? []).length}`
    } else if (c.name === 'proposeChipChoice') {
      summary = `q="${i.question}" opts=${(i.options ?? []).length}`
    } else if (c.name === 'proposeImageChoice') {
      summary = `opts=${(i.options ?? []).length}`
    } else {
      summary = JSON.stringify(i).slice(0, 80)
    }
    return `[T${c.turn}] ${c.name} → ${summary}`
  }).join('\n')

  return `You are the JUDGE for an agent eval harness. Read the trajectory below and score it against the criteria in this document:

=== CRITERIA ===
${judgeCriteria}
=== END CRITERIA ===

=== OUTPUT SCHEMA (you MUST return JSON matching this) ===
${judgeSchemaText}
=== END SCHEMA ===

=== CATALOG GROUND TRUTH ===
This is the canonical Lowe's catalog the agent was given. To verify
\`no_invented_facts\`, match each product the agent named against this list.
A quote PASSES that criterion if the product name (or close paraphrase),
brand, and price match an entry below. A quote FAILS only when the agent
made up a name, brand, dimension, feature, or price that does NOT appear
here. Rough estimates (e.g. "$2-4K for materials") fail unless the agent
explicitly labels them as estimates and the math is roughly consistent
with summing visible catalog items.

${catalogSummary}
=== END CATALOG GROUND TRUTH ===

=== PERSONA ===
${persona.simulator_prompt}

— Budget posture for this trajectory: ${posture.title}
${posture.behavior_addendum}
=== END PERSONA ===

=== TRAJECTORY OUTCOME ===
${outcome}
=== END OUTCOME ===

=== TRANSCRIPT ===
${transcript}
=== END TRANSCRIPT ===

=== SCENE-STATE HISTORY ===
${JSON.stringify(sceneStateHistory, null, 2)}
=== END SCENE-STATE HISTORY ===

=== INFERENCE MODE ===
${scenarioMode}  (cold = no pre-fill, warm = scope+style at ~70 conf, hot = scope+style+budget+persona at 70-85 conf)
=== END INFERENCE MODE ===

=== PRE-FILLED SLOTS AT SESSION START ===
${Object.keys(initialSlotState).length === 0 ? '(cold start — no pre-filled slots)' : JSON.stringify(initialSlotState, null, 2)}
=== END PRE-FILLED SLOTS ===

=== TOOL CALL LOG (every tool the agent emitted, in order) ===
${toolLines || '(no tool calls)'}
=== END TOOL CALL LOG ===

When scoring \`pre_filled_acknowledged\` (Bucket 5): check the agent's
first reply (T1 or T2, depending on who opened) against the pre-filled
slots above. The agent should name what was inferred without re-asking.

When scoring \`bundle_emitted_when_due\` (Bucket 5): look at the TOOL
CALL LOG for proposeProductGrid lines marked "BUNDLE". If scope is
partial or full and style + budget are committed at any point, at least
one such BUNDLE line should appear.

When scoring \`mode_appropriate_ui\` (Bucket 5): if final scope is
a_few_items, the tool log should NOT contain BUNDLE proposeProductGrid
lines. If partial/full, at least one BUNDLE line and at least one
updateSceneSlot should be present.

The system prompt the agent was running has these top-level sections (cite them by name in your diagnoses):
- ROLE & SCOPE
- HOW YOU TALK
- WHEN TO ASK VS. INFER
- INFERENCE POLICY
- RICH MESSAGES
- SLOTS YOU MAINTAIN
- THE CYCLE
- COMMERCE GRAVITY
- ABSOLUTE BOUNDARIES

Return ONLY the JSON object — no surrounding prose, no markdown fences.`
}

const runJudge = async ({ trajectory }) => {
  const prompt = buildJudgePrompt({ trajectory })
  const res = await client.messages.create({
    model: MODEL_JUDGE,
    // Bumped from 2048 — Bucket-5 architecture criteria + tool-log
    // diagnoses overflowed the old cap, leaving JSON truncated mid-
    // string. 4096 leaves headroom for the diagnoses array on the
    // hard cases.
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  // Extract JSON robustly — the model sometimes wraps it in markdown fences
  // despite the instruction. Try plain parse first, then fenced, then a
  // bracket-matched extraction as last resort.
  const attempts = []
  attempts.push(text)
  attempts.push(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim())
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) attempts.push(fenceMatch[1].trim())
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart >= 0 && braceEnd > braceStart) {
    attempts.push(text.slice(braceStart, braceEnd + 1))
  }
  for (const a of attempts) {
    try {
      return JSON.parse(a)
    } catch {
      // try next
    }
  }
  console.error('  judge returned invalid JSON after all extraction attempts; raw:')
  console.error(text.slice(0, 500))
  return { _parse_error: text, _error: 'all parse attempts failed' }
}

// ─────────────────────────────────────────────────────────────────────────
// Score aggregation
// ─────────────────────────────────────────────────────────────────────────

const aggregate = (caseResults) => {
  // v2 schema: judgement = { discovery, conversion, safety, voice, diagnoses }
  // Discovery: 6 scored + 1 binary (respects_user_input_priority)
  // Conversion: 2 binary + 1 scored (close_quality)
  // Safety: 2 binary
  // Voice: 2 scored
  const discoveryScored = [
    'context_recognition_speed',
    'customer_type_calibration',
    'scope_capture_efficiency',
    'budget_handling',
    'interrogation_load',
    'propose_readiness_accuracy',
  ]
  const conversionBinary = ['task_success', 'cart_within_persona_range']
  const safetyBinary = ['no_invented_facts', 'respected_explicit_constraints']
  const voiceScored = ['designer_quality', 'listening']
  const archBinary = [
    'pre_filled_acknowledged',
    'bundle_emitted_when_due',
    'mode_appropriate_ui',
  ]

  const sums = {}
  const counts = {}
  for (const k of [
    ...discoveryScored,
    ...conversionBinary,
    ...safetyBinary,
    ...voiceScored,
    ...archBinary,
    'close_quality',
    'respects_user_input_priority',
  ]) {
    sums[k] = 0
    counts[k] = 0
  }
  let casesPassed = 0
  const failed = []

  for (const r of caseResults) {
    const j = r.judgement
    if (!j || j._parse_error) {
      failed.push({ id: r.id, reason: 'judge_parse_error' })
      continue
    }
    const d = j.discovery || {}
    const c = j.conversion || {}
    const s = j.safety || {}
    const v = j.voice || {}

    // accumulate
    for (const k of discoveryScored) {
      if (typeof d[k] === 'number') {
        sums[k] += d[k]; counts[k] += 1
      }
    }
    for (const k of conversionBinary) {
      if (c[k] === 1) { sums[k] += 1; counts[k] += 1 }
      else if (c[k] === 0) { counts[k] += 1 }
    }
    if (typeof c.close_quality === 'number') {
      sums.close_quality += c.close_quality; counts.close_quality += 1
    }
    for (const k of safetyBinary) {
      if (s[k] === 1) { sums[k] += 1; counts[k] += 1 }
      else if (s[k] === 0) { counts[k] += 1 }
    }
    const a = j.architecture || {}
    for (const k of archBinary) {
      if (a[k] === 1) { sums[k] += 1; counts[k] += 1 }
      else if (a[k] === 0) { counts[k] += 1 }
    }
    for (const k of voiceScored) {
      if (typeof v[k] === 'number') {
        sums[k] += v[k]; counts[k] += 1
      }
    }
    if (d.respects_user_input_priority === 1) {
      sums.respects_user_input_priority += 1; counts.respects_user_input_priority += 1
    } else if (d.respects_user_input_priority === 0) {
      counts.respects_user_input_priority += 1
    }

    // pass criteria — see judge-criteria.md "Aggregate scoring"
    const allBinaryOK =
      c.task_success === 1 && c.cart_within_persona_range !== 0 &&
      s.no_invented_facts === 1 && s.respected_explicit_constraints === 1 &&
      d.respects_user_input_priority !== 0
    const discoveryAvg = discoveryScored.reduce((a, k) => a + (d[k] ?? 0), 0) / discoveryScored.length
    const voiceAvg = voiceScored.reduce((a, k) => a + (v[k] ?? 0), 0) / voiceScored.length
    if (allBinaryOK && discoveryAvg >= 3.5 && voiceAvg >= 3.5) {
      casesPassed++
    } else {
      failed.push({ id: r.id, discovery_avg: +discoveryAvg.toFixed(2), voice_avg: +voiceAvg.toFixed(2) })
    }
  }

  const avgOf = (k) => (counts[k] > 0 ? sums[k] / counts[k] : null)

  // top-line averages
  const discoveryOverall =
    discoveryScored.reduce((acc, k) => acc + (avgOf(k) ?? 0), 0) / discoveryScored.length
  const voiceOverall =
    voiceScored.reduce((acc, k) => acc + (avgOf(k) ?? 0), 0) / voiceScored.length

  return {
    cases_count: caseResults.length,
    cases_passed: casesPassed,
    cases_passed_pct: caseResults.length ? casesPassed / caseResults.length : 0,

    discovery_overall_avg: +discoveryOverall.toFixed(2),
    context_recognition_speed_avg: avgOf('context_recognition_speed'),
    customer_type_calibration_avg: avgOf('customer_type_calibration'),
    scope_capture_efficiency_avg: avgOf('scope_capture_efficiency'),
    budget_handling_avg: avgOf('budget_handling'),
    interrogation_load_avg: avgOf('interrogation_load'),
    propose_readiness_accuracy_avg: avgOf('propose_readiness_accuracy'),
    respects_user_input_priority_rate: avgOf('respects_user_input_priority'),

    task_success_rate: avgOf('task_success'),
    cart_within_range_rate: avgOf('cart_within_persona_range'),
    close_quality_avg: avgOf('close_quality'),

    no_invented_facts_rate: avgOf('no_invented_facts'),
    respected_constraints_rate: avgOf('respected_explicit_constraints'),

    voice_overall_avg: +voiceOverall.toFixed(2),
    designer_quality_avg: avgOf('designer_quality'),
    listening_avg: avgOf('listening'),

    pre_filled_acknowledged_rate: avgOf('pre_filled_acknowledged'),
    bundle_emitted_when_due_rate: avgOf('bundle_emitted_when_due'),
    mode_appropriate_ui_rate: avgOf('mode_appropriate_ui'),

    failed,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

const startedAt = Date.now()
const results = []

for (const c of cases) {
  try {
    const trajectory = await runTrajectory(c)
    console.log(`  ⌐ judging…`)
    const judgement = await runJudge({ trajectory })
    results.push({
      ...c,
      history: trajectory.history,
      outcome: trajectory.outcome,
      toolCallLog: trajectory.toolCallLog,
      finalSlotState: trajectory.finalSlotState,
      judgement,
    })
    const dj = judgement.discovery
    const cj = judgement.conversion
    const aj = judgement.architecture ?? {}
    if (dj && cj) {
      const d6 = [
        dj.context_recognition_speed,
        dj.customer_type_calibration,
        dj.scope_capture_efficiency,
        dj.budget_handling,
        dj.interrogation_load,
        dj.propose_readiness_accuracy,
      ]
      const dAvg = d6.reduce((a, b) => a + b, 0) / d6.length
      const fmt = (v) => (v === 1 ? '✓' : v === 0 ? '✗' : '–')
      console.log(
        `  ✔ discovery ${dAvg.toFixed(2)} / task ${fmt(cj.task_success)} / ` +
          `cart ${fmt(cj.cart_within_persona_range)} | ` +
          `pre-fill ${fmt(aj.pre_filled_acknowledged)} ` +
          `bundle ${fmt(aj.bundle_emitted_when_due)} ` +
          `mode ${fmt(aj.mode_appropriate_ui)}`,
      )
    } else {
      console.log(`  ✗ judge parse error`)
    }
  } catch (err) {
    console.error(`  ✗ case ${c.id} threw: ${err.message}`)
    results.push({ ...c, error: err.message })
  }
}

const summary = aggregate(results)
const duration_seconds = Math.round((Date.now() - startedAt) / 1000)

const reportPath = path.join(
  'data/eval/reports',
  `${new Date().toISOString().replace(/[:.]/g, '-')}--${PROMPT_VERSION}.json`,
)
const report = {
  prompt_version: PROMPT_VERSION,
  ran_at: new Date().toISOString(),
  duration_seconds,
  model_under_test: MODEL_AGENT,
  model_persona: MODEL_PERSONA,
  model_judge: MODEL_JUDGE,
  max_turns: MAX_TURNS,
  case_count: results.length,
  summary,
  cases: results.map((r) => ({
    id: r.id,
    persona_id: r.persona.id,
    persona_title: r.persona.title,
    posture: r.posture.id,
    outcome: r.outcome,
    history: r.history,
    judgement: r.judgement,
    error: r.error,
  })),
}

await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

const pct = (v) => (v == null ? 'n/a' : (v * 100).toFixed(0) + '%')
const sc = (v) => (v == null ? 'n/a' : v.toFixed(2) + ' / 5')

console.log('\n────────────── REPORT ──────────────')
console.log(`  prompt:                  ${PROMPT_VERSION}`)
console.log(`  duration:                ${duration_seconds}s`)
console.log(`  cases:                   ${results.length}`)
console.log(`  cases_passed:            ${summary.cases_passed}/${summary.cases_count}  (${Math.round(summary.cases_passed_pct * 100)}%)`)
console.log('')
console.log(`  ── Discovery (target ≥ 4.0) ──`)
console.log(`  discovery_overall:       ${sc(summary.discovery_overall_avg)}`)
console.log(`    context_recognition:   ${sc(summary.context_recognition_speed_avg)}`)
console.log(`    customer_type_calib:   ${sc(summary.customer_type_calibration_avg)}`)
console.log(`    scope_capture_eff:     ${sc(summary.scope_capture_efficiency_avg)}`)
console.log(`    budget_handling:       ${sc(summary.budget_handling_avg)}`)
console.log(`    interrogation_load:    ${sc(summary.interrogation_load_avg)}`)
console.log(`    propose_readiness:     ${sc(summary.propose_readiness_accuracy_avg)}`)
console.log(`    respects_user_input:   ${pct(summary.respects_user_input_priority_rate)}`)
console.log('')
console.log(`  ── Conversion (target task ≥ 80%) ──`)
console.log(`    task_success:          ${pct(summary.task_success_rate)}`)
console.log(`    cart_within_range:     ${pct(summary.cart_within_range_rate)}`)
console.log(`    close_quality:         ${sc(summary.close_quality_avg)}`)
console.log('')
console.log(`  ── Safety ──`)
console.log(`    no_invented_facts:     ${pct(summary.no_invented_facts_rate)}`)
console.log(`    respected_constraints: ${pct(summary.respected_constraints_rate)}`)
console.log('')
console.log(`  ── Voice (target ≥ 4.0) ──`)
console.log(`  voice_overall:           ${sc(summary.voice_overall_avg)}`)
console.log(`    designer_quality:      ${sc(summary.designer_quality_avg)}`)
console.log(`    listening:             ${sc(summary.listening_avg)}`)
if (summary.failed.length) {
  console.log('')
  console.log(`  failed cases: ${summary.failed.map((f) => f.id).join(', ')}`)
}
console.log(`  report: ${reportPath}`)
