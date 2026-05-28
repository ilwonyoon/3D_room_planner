#!/usr/bin/env node
/**
 * Tiny local API server for the agent prototype.
 *
 * Vite handles the SPA on :5173. This server runs on :3001 and serves
 * /api/chat. The vite.config.ts proxy forwards /api/* here so the browser
 * sees a single origin.
 *
 * No framework — just node:http + the Anthropic SDK. Keep it minimal.
 *
 * Run: `npm run api` (or `node scripts/api-server.mjs`)
 */

import http from 'node:http'
import { config as loadDotenv } from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import { retrieve, assembleContext } from './rag.mjs'

loadDotenv({ path: '.env.local' })

const PORT = 3001
// Single-model setup: Sonnet 4.6 on every turn. The Haiku discovery
// branch (see commit c1dbafc and docs/bond-demo/18-V13.3-ROUTING-REGRESSION.md)
// regressed voice (-1.34) and interrogation_load (-1.40) even on turns
// it was supposed to help, so we dropped the routing. needsThinking()
// is kept and now only decides whether extended thinking is enabled
// for the same Sonnet call.
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 8192
// Extended thinking lets the model reason in a separate content block before
// answering — we surface that in the UI as a collapsible "thinking" panel.
// budget_tokens must be >= 1024 and < max_tokens.
const THINKING_BUDGET = 2048

// Tool schemas the agent can call. Mirrored in src/agent/tools.ts; kept here
// inline so the api-server has no client-side dependency.
/**
 * Decide whether the agent needs extended thinking for this turn.
 *
 * Default: NO thinking — chip clicks, confirmations, narrow asks, and
 * routine turn-by-turn dialog don't need 2K tokens of reasoning.
 *
 * Enable thinking when ANY of the following holds:
 *   1. User delegates a decision (show/design/recommend/help me…)
 *   2. Agent's last turn promised "let me pull/see/build" — propose phase
 *   3. Required slots are filled AND user signals "now/show/go" —
 *      multi-slot synthesis is about to happen
 *   4. User language signals trade-off / comparison ("vs", "or", "which")
 *
 * Length is intentionally NOT a signal; conversation state is.
 */
function needsThinking(messages, slotState) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const lastAgent = [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''

  // Signal 1: user explicitly delegating a decision
  const delegationVerbs = /\b(show|design|recommend|suggest|pull|render|build|grab|what should|help me|figure out|see options?|let me see|how about|what would|which one|which works|propose)\b/i
  if (delegationVerbs.test(lastUser)) return true

  // Signal 2: agent's last turn promised to fetch/build — next turn is propose
  if (/\b(let me (pull|see|build|grab|render|put|line)|i'?ll (pull|grab|build|line up|render)|hang on|pulling|looking up)/i.test(lastAgent)) {
    return true
  }

  // Signal 3: ready-to-design synthesis — multi-slot blending needed
  const slot = slotState || {}
  const filledRequired = ['scope', 'style_direction', 'budget_range'].filter(
    (s) => (slot[s]?.confidence ?? 0) >= 70,
  ).length
  const userSignalsReady = /\b(show|see|now|ready|let'?s|go|do it)\b/i.test(lastUser)
  if (filledRequired >= 3 && userSignalsReady) return true

  // Signal 4: trade-off / comparison language
  if (/\b(vs\.?|versus|trade.?off|compare|which|or)\b/i.test(lastUser) && lastUser.length > 30) {
    return true
  }

  return false
}

const AGENT_TOOLS = [
  {
    name: 'proposeChipChoice',
    description:
      "Surface a row of short label chips for a quick decision. The chips appear inline " +
      "beneath your text; tapping one sends that label back to you as the user's next turn.",
    input_schema: {
      type: 'object',
      required: ['question', 'options'],
      properties: {
        question: { type: 'string' },
        options: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
        slot_hint: { type: 'string' },
      },
    },
  },
  {
    name: 'proposeImageChoice',
    description:
      "Surface 2-5 image cards for visual style selection or design tier choice.",
    input_schema: {
      type: 'object',
      required: ['question', 'options'],
      properties: {
        question: { type: 'string' },
        options: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['id', 'label'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              blurb: { type: 'string' },
              image_url: { type: 'string' },
            },
          },
        },
        slot_hint: { type: 'string' },
      },
    },
  },
  {
    name: 'proposeProductGrid',
    description: "Surface 2-6 concrete catalog products as inline cards. For partial/full scope, wrap the grid as a coordinated bundle by setting the `bundle` field — items in a bundle should be co-installable as one set with a consistent finish family.",
    input_schema: {
      type: 'object',
      required: ['products'],
      properties: {
        intro: { type: 'string' },
        bundle: {
          type: 'object',
          description: "REQUIRED when scope is 'partial' or 'full_reno' — marks this grid as a coordinated 4-6 SKU bundle with a locked finish family. OMIT this field ONLY when scope is 'a_few_items' (single-SKU mode, where you propose 2-3 peer alternatives instead). Look up the bundle id + name from the BUNDLE chunks in DYNAMIC KNOWLEDGE — do not invent. If you find yourself emitting proposeProductGrid in partial/full mode WITHOUT this field, you are violating BUNDLE PROTOCOL and the user will see an uncoordinated grid instead of a set.",
          required: ['id', 'name'],
          properties: {
            id: {
              type: 'string',
              description: "Bundle id from the knowledge base (e.g. 'vanity_wall_refresh', 'shower_zone_refresh').",
            },
            name: {
              type: 'string',
              description: "Human-readable bundle name (e.g. 'Vanity Wall Refresh').",
            },
            finish_family: {
              type: 'string',
              description: "Locked finish family across all items (e.g. 'brushed_brass', 'matte_black').",
            },
          },
        },
        products: {
          type: 'array',
          minItems: 2,
          maxItems: 6,
          items: {
            type: 'object',
            required: ['id', 'name', 'price_cents'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              brand: { type: 'string' },
              category: { type: 'string' },
              price_cents: { type: 'integer' },
              image_url: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'updateSceneSlot',
    description: "Place or swap a product into the 3D room scene. Adds to cart.",
    input_schema: {
      type: 'object',
      required: ['slot', 'product_id'],
      properties: {
        slot: {
          type: 'string',
          enum: [
            'vanity', 'mirror', 'faucet', 'toilet', 'bathtub', 'shower',
            'tile_floor', 'tile_wall', 'lighting', 'paint_wall', 'accessory',
          ],
        },
        product_id: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  },
  {
    name: 'updateSlotConfidence',
    description:
      "Record what you now know (or now infer) about one slot in the project dashboard. " +
      "Call this whenever a new user message, a behavioral cue, or your own reasoning " +
      "produces a confidence change. The UI renders this immediately so the shopper sees " +
      "the project filling in as they talk to you.",
    input_schema: {
      type: 'object',
      required: ['slot', 'confidence'],
      properties: {
        slot: {
          type: 'string',
          enum: [
            'scope', 'style_direction', 'budget_range',
            'bathroom_configuration', 'who_uses_it',
            'must_haves_avoids', 'wet_dry_priority',
            'persona_traits', 'trigger',
            'taste_signals', 'budget_posture', 'decision_speed',
          ],
        },
        value: {},
        confidence: { type: 'integer', minimum: 0, maximum: 100 },
        evidence: { type: 'string' },
      },
    },
  },
]

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('api-server: ANTHROPIC_API_KEY not found in .env.local')
  process.exit(1)
}
const client = new Anthropic({ apiKey })

const readJson = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })

const handleChat = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }
  let body
  try {
    body = await readJson(req)
  } catch {
    res.statusCode = 400
    res.end('Invalid JSON')
    return
  }
  const { systemPrompt, messages, slotState, appContextId, forceTool } = body
  if (!systemPrompt || !Array.isArray(messages)) {
    res.statusCode = 400
    res.end('Missing systemPrompt or messages')
    return
  }

  // RAG: retrieve knowledge chunks for the active appContext (Axis 1)
  // + current slot state. The server reads from
  // `data/knowledge/contexts/<contextId>/` so adding manufacturer
  // contexts later is a folder + config drop, not a code change.
  const contextId = appContextId ?? 'lowes-consumer'
  const chunks = retrieve(slotState ?? {}, contextId)
  const dynamicContext = assembleContext(chunks)
  const fullSystemPrompt = dynamicContext
    ? systemPrompt + '\n\n' + dynamicContext
    : systemPrompt
  if (chunks.length > 0) {
    console.log(
      `[chat:${contextId}] RAG retrieved ${chunks.length} chunks:`,
      chunks.map((c) => `${c.type}:${c.id}`).join(', '),
    )
  }

  res.setHeader('content-type', 'text/event-stream')
  res.setHeader('cache-control', 'no-cache, no-transform')
  res.setHeader('connection', 'keep-alive')
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  // Conversation-state heuristic: enable extended thinking only when
  // the turn actually needs synthesis (user delegating, agent about to
  // propose, multi-slot blend, trade-off). Routine turns (chips,
  // confirmations, narrow asks) skip thinking entirely — faster + cheaper.
  // Model is always Sonnet 4.6; Haiku discovery routing was reverted.
  const useThinking = needsThinking(messages, slotState ?? {})
  // tool_choice: when the client supplies forceTool (a chip click with a
  // deterministic intent), pin Claude to that exact tool — model can't
  // wander off into a clarifying question. extended thinking and tool_choice
  // forcing a specific tool are incompatible per Anthropic docs, so when
  // forceTool is set, thinking is disabled regardless of needsThinking().
  const knownTools = new Set(AGENT_TOOLS.map((t) => t.name))
  const useForcedTool = typeof forceTool === 'string' && knownTools.has(forceTool)
  const useThinkingFinal = useForcedTool ? false : useThinking
  const requestParams = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: fullSystemPrompt,
    tools: AGENT_TOOLS,
    messages,
    ...(useThinkingFinal ? { thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET } } : {}),
    ...(useForcedTool ? { tool_choice: { type: 'tool', name: forceTool } } : {}),
  }
  console.log(
    `[chat:${contextId}] model=sonnet thinking=${useThinkingFinal ? 'ON' : 'OFF'}` +
      (useForcedTool ? ` force_tool=${forceTool}` : ''),
  )

  try {
    const upstream = client.messages.stream(requestParams)
    // Accumulate the JSON input for each tool_use block as deltas arrive,
    // then emit a single { type: 'tool_use', name, input } event when the
    // block closes. This keeps the client's protocol clean: text streams
    // as deltas, tool calls arrive as completed objects.
    const toolBlocks = {} // index → { id, name, inputJson }
    for await (const event of upstream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block
        if (block?.type === 'thinking') send({ type: 'thinking_start' })
        else if (block?.type === 'text') send({ type: 'text_start' })
        else if (block?.type === 'tool_use') {
          toolBlocks[event.index] = { id: block.id, name: block.name, inputJson: '' }
        }
      } else if (event.type === 'content_block_delta') {
        const d = event.delta
        if (d.type === 'thinking_delta') send({ type: 'thinking_delta', text: d.thinking })
        else if (d.type === 'text_delta') send({ type: 'text_delta', text: d.text })
        else if (d.type === 'input_json_delta' && toolBlocks[event.index]) {
          toolBlocks[event.index].inputJson += d.partial_json ?? ''
        }
      } else if (event.type === 'content_block_stop') {
        const tb = toolBlocks[event.index]
        if (tb) {
          let input = {}
          try { input = tb.inputJson ? JSON.parse(tb.inputJson) : {} } catch { /* ignore */ }
          send({ type: 'tool_use', id: tb.id, name: tb.name, input })
          delete toolBlocks[event.index]
        }
      } else if (event.type === 'message_stop') {
        send({ type: 'done' })
      }
    }
    res.write('data: [DONE]\n\n')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    send({ type: 'error', message })
  } finally {
    res.end()
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/chat') return handleChat(req, res)
  res.statusCode = 404
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`api-server: listening on http://localhost:${PORT}`)
  console.log(`  proxied from Vite (5173) via /api/*`)
})
