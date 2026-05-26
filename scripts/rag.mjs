/**
 * RAG retrieval — server-side. Loads the 4 knowledge files at module
 * load and exposes a single retrieve(slotState) function that returns
 * structured chunks relevant to the current conversation signals.
 *
 * The chunks are then formatted as a DYNAMIC KNOWLEDGE section that the
 * api-server appends to the static system prompt before each /api/chat
 * call. This means every conversation turn gets a freshly-conditioned
 * prompt based on what the user has actually committed (style, scope,
 * finish family, etc.).
 *
 * Knowledge sources:
 *   - bundles.json:        10 named co-purchase patterns
 *   - style-guide.json:    6 style archetypes with materials/finish/voice
 *   - design-rules.json:   finish compatibility + NKBA clearances + plumbing
 *   - persona-design.json: 7 personas → design tendencies
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_ROOT = join(__dirname, '..', 'data', 'knowledge')

/**
 * Knowledge is namespaced per appContext (Axis 1). Today we ship
 * lowes-consumer; manufacturer contexts (msi-designer, etc.) plug
 * into the same shape by adding a sibling folder under
 * `data/knowledge/contexts/<id>/`.
 */
function loadContext(contextId) {
  const dir = join(KNOWLEDGE_ROOT, 'contexts', contextId)
  const loadJson = (name) => JSON.parse(readFileSync(join(dir, name), 'utf-8'))
  return {
    bundles: loadJson('bundles.json'),
    styleGuide: loadJson('style-guide.json'),
    designRules: loadJson('design-rules.json'),
    personaDesign: loadJson('persona-design.json'),
  }
}

// Lazy cache: KB per context loaded once, on first use.
const CONTEXT_CACHE = new Map()
function getKnowledge(contextId) {
  if (!CONTEXT_CACHE.has(contextId)) {
    const kb = loadContext(contextId)
    CONTEXT_CACHE.set(contextId, kb)
    console.log(
      `[rag] knowledge loaded for '${contextId}': ` +
        `${kb.bundles.bundles.length} bundles, ` +
        `${Object.keys(kb.styleGuide.styles).length} styles, ` +
        `${Object.keys(kb.personaDesign.personas).length} personas`,
    )
  }
  return CONTEXT_CACHE.get(contextId)
}

// Eagerly load the default context so the boot log is informative.
getKnowledge('lowes-consumer')

// Catalog — separate from context KB (catalog is shared / Lowe's-wide,
// not knowledge-base-style designer rules). Loaded once at module init.
const CATALOG = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'catalog.json'), 'utf-8'),
)
console.log(`[rag] catalog loaded: ${CATALOG.length} SKUs`)

/**
 * Derive a coarse mode label from the slot state's scope value.
 * Mirrors the client-side deriveModeFromScope in slotModel.ts.
 */
function deriveMode(slotState) {
  const scope = slotState?.scope?.value
  if (scope === 'a_few_items') return 'single'
  if (scope === 'partial') return 'partial'
  if (scope === 'full_reno') return 'full'
  return 'unknown'
}

/**
 * Pure retrieval — given slot state, return an ordered array of
 * knowledge chunks the agent should be aware of for this turn.
 *
 * Each chunk has:
 *   - type:    'style' | 'bundle' | 'finish_rule' | 'persona' | 'clearance'
 *   - id:      the slot/key it came from
 *   - content: the actual content object (or string)
 *   - reason:  short label for why this chunk was selected (debug)
 */
export function retrieve(slotState = {}, contextId = 'lowes-consumer') {
  const kb = getKnowledge(contextId)
  const BUNDLES = kb.bundles
  const STYLE_GUIDE = kb.styleGuide
  const DESIGN_RULES = kb.designRules
  const PERSONA_DESIGN = kb.personaDesign

  const chunks = []
  const mode = deriveMode(slotState)
  const style = slotState?.style_direction?.value
  const finishFamily = slotState?.finish_family?.value
  const config = slotState?.bathroom_configuration?.value
  const personaTraits = slotState?.persona_traits?.value
  const trigger = slotState?.trigger?.value

  // 0. PRE-FILLED SLOTS — surface the slot state itself so the agent
  // sees exactly what's already inferred (and at what confidence)
  // *before* the static style/bundle chunks. Without this the agent
  // gets the style guide but can't tell whether the slot was set
  // from inference vs. left empty.
  const filledSlots = Object.entries(slotState || {})
    .filter(([, v]) => v && v.value !== undefined && v.value !== null)
    .map(([id, v]) => ({
      slot: id,
      value: v.value,
      confidence: v.confidence,
      source: v.source,
      evidence: v.evidence,
    }))
  if (filledSlots.length > 0) {
    chunks.push({
      type: 'pre_filled_slots',
      id: 'state',
      content: filledSlots,
      reason: 'slot state at turn boundary',
    })
  }

  // 1. Style guide — the active style archetype, if committed
  if (style && STYLE_GUIDE.styles[style]) {
    chunks.push({
      type: 'style',
      id: style,
      content: STYLE_GUIDE.styles[style],
      reason: 'active style_direction',
    })
  }

  // 2. Bundles matching scope + (optionally) configuration
  const eligibleBundles = BUNDLES.bundles.filter((b) => {
    if (mode === 'unknown') return false
    // Map slot scope token → bundle scope token
    const scopeKey = slotState?.scope?.value // 'a_few_items' | 'partial' | 'full_reno'
    if (!scopeKey || !b.scope.includes(scopeKey)) return false
    // If bundle is configuration-specific, only include matching config
    if (b.configuration && b.configuration !== config) return false
    return true
  })
  for (const b of eligibleBundles) {
    chunks.push({
      type: 'bundle',
      id: b.id,
      content: {
        name: b.name,
        anchor_category: b.anchor_category,
        items: b.items,
        item_count: b.item_count,
        finish_family_rule: b.finish_family_rule,
        designer_voice: b.designer_voice,
      },
      reason: `eligible for scope=${slotState?.scope?.value}${
        b.configuration ? ` config=${b.configuration}` : ''
      }`,
    })
  }

  // 3. Finish compatibility — if a finish is committed, surface its rule
  if (finishFamily && DESIGN_RULES.finish_compatibility[finishFamily]) {
    chunks.push({
      type: 'finish_rule',
      id: finishFamily,
      content: DESIGN_RULES.finish_compatibility[finishFamily],
      reason: 'active finish_family',
    })
  }
  // Always include the finish_family_principles + 5-rule list (small, always-relevant)
  chunks.push({
    type: 'finish_principles',
    id: 'principles',
    content: DESIGN_RULES.finish_family_principles,
    reason: 'always — small list of universal finish rules',
  })

  // 4. Persona-design — if persona inferred, include its design tendencies
  if (personaTraits) {
    const traits = Array.isArray(personaTraits) ? personaTraits : [personaTraits]
    for (const trait of traits) {
      if (PERSONA_DESIGN.personas[trait]) {
        chunks.push({
          type: 'persona',
          id: trait,
          content: PERSONA_DESIGN.personas[trait],
          reason: `inferred persona`,
        })
      }
    }
  }

  // 5. NKBA clearances — include when config is committed and mode is full/partial
  // (single SKU swap rarely needs clearance reasoning beyond the swap site).
  if (config && (mode === 'full' || mode === 'partial')) {
    chunks.push({
      type: 'clearance',
      id: 'nkba',
      content: DESIGN_RULES.nkba_clearances_cm,
      reason: `${config} config + mode=${mode}`,
    })
  }

  // 6a. Catalog slice — guarantees the agent sees the catalog without
  // ever showing zero in any category. Strategy:
  //   - Group all SKUs by category
  //   - Sort within category by price (low → high)
  //   - For each category, take up to N items, biased toward those that
  //     fit the user's budget (when set) but ALWAYS keep ≥2 per category
  //     so the agent never says "we don't have X" when we obviously do.
  // Cap total at ~50 items to keep prompt size reasonable.
  const budget = slotState?.budget_range?.value
  const budgetHigh = (budget && typeof budget === 'object' && 'high' in budget)
    ? Number(budget.high)
    : null
  // Generous per-item ceiling — vanity alone can be $800-$1,200 on a $3K bundle
  const perItemCeiling = budgetHigh ? Math.max(budgetHigh, 500) : null

  const byCategory = {}
  for (const item of CATALOG) {
    const c = item.category || 'Other'
    if (!byCategory[c]) byCategory[c] = []
    byCategory[c].push(item)
  }

  const catalogSlice = []
  const PER_CATEGORY_MAX = 5
  const PER_CATEGORY_MIN = 2
  for (const [cat, items] of Object.entries(byCategory)) {
    items.sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0))
    // Items in budget
    const inBudget = perItemCeiling
      ? items.filter((i) => (i.price_cents || 0) <= perItemCeiling * 100)
      : items
    // Always keep at least PER_CATEGORY_MIN (cheapest), even if over budget,
    // so the agent never has to refuse a category outright.
    const picked = inBudget.length >= PER_CATEGORY_MIN
      ? inBudget.slice(0, PER_CATEGORY_MAX)
      : items.slice(0, PER_CATEGORY_MIN)
    for (const p of picked) catalogSlice.push(p)
  }

  // Cap total to keep prompt size sane; preserve category diversity by
  // taking round-robin if we're over the cap.
  const FINAL_CAP = 50
  const finalSlice = catalogSlice.slice(0, FINAL_CAP)

  chunks.push({
    type: 'catalog',
    id: 'slice',
    content: finalSlice.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price_cents: p.price_cents,
      image_url: p.image_url,
    })),
    reason: perItemCeiling
      ? `category-balanced slice (≥${PER_CATEGORY_MIN}/category, budget hint ≤$${Math.round(perItemCeiling)}/item)`
      : `category-balanced slice (top ${PER_CATEGORY_MAX} per category)`,
  })

  // 6. Trigger-specific bundle hints (e.g. leak_urgent → urgency bundles)
  if (trigger === 'leak_urgent') {
    chunks.push({
      type: 'meta',
      id: 'urgency',
      content:
        'Leak triggered this visit — prioritize same-day-available SKUs, default to in-stock, lead with the broken fixture replacement before suggesting a full set.',
      reason: 'trigger=leak_urgent',
    })
  }

  return chunks
}

/**
 * Format retrieved chunks as a single prompt-injectable string.
 * Lives inside a DYNAMIC KNOWLEDGE block so the agent can distinguish
 * dynamic context from the static system prompt rules.
 */
export function assembleContext(chunks) {
  if (chunks.length === 0) {
    return ''
  }
  // Split the pre-filled-slots chunk out from the rest — slot state
  // is structurally different from knowledge chunks and the agent
  // needs to see it FIRST and named clearly.
  const slotChunk = chunks.find((c) => c.type === 'pre_filled_slots')
  const otherChunks = chunks.filter((c) => c.type !== 'pre_filled_slots')

  let slotBlock = ''
  if (slotChunk && Array.isArray(slotChunk.content) && slotChunk.content.length > 0) {
    const lines = slotChunk.content.map((s) => {
      const evidencePart = s.evidence ? ` — evidence: "${s.evidence}"` : ''
      return `  - ${s.slot} = ${JSON.stringify(s.value)} (confidence ${s.confidence}, source: ${s.source}${evidencePart})`
    })
    slotBlock = `
==== PRE-FILLED SLOTS (from Lowe's session inference — TREAT AS WORKING TRUTH) ====
The following slots have ALREADY been filled before this conversation opened, inferred
from Lowe's browse/search/profile signals. Confidence is 30-85 (never 95 — that's
reserved for explicit user input).

${lines.join('\n')}

WHEN YOU REPLY:
- Acknowledge these in the opening line. Sound like you've already done your homework.
  Example: "Saw you've been circling navy vanities — let's build the wall around that."
- Do NOT re-ask what's pre-filled at confidence ≥ 50. Trust the signal, use it.
- If the user contradicts a pre-filled value, override at confidence 90, source 'user',
  and apologize briefly ("got it, scrapping navy — let's try something else").
- Cite current-session evidence aloud ("the Beckett you were looking at"). Use
  longer-tail data (saved lists, past purchases, regional palette) SILENTLY to
  bias defaults — don't surface it as "I see you bought X two years ago."

==== END PRE-FILLED SLOTS ====
`
  }

  const knowledgeSections = []
  for (const c of otherChunks) {
    knowledgeSections.push(`--- ${c.type.toUpperCase()} (${c.id}) ---`)
    if (typeof c.content === 'string') {
      knowledgeSections.push(c.content)
    } else {
      knowledgeSections.push(JSON.stringify(c.content, null, 2))
    }
    knowledgeSections.push('')
  }

  let knowledgeBlock = ''
  if (knowledgeSections.length > 0) {
    knowledgeBlock = `
==== DYNAMIC KNOWLEDGE (retrieved from Bond knowledge base based on current slot state) ====
Use these chunks to ground your design recommendations. Quote the designer_voice cues
when natural; cite finish_compatibility when a finish is constrained; lead with
matching bundles when scope is partial or full. Do NOT echo the JSON to the user —
distill it into designer-voice prose.

${knowledgeSections.join('\n')}
==== END DYNAMIC KNOWLEDGE ====
`
  }

  return slotBlock + knowledgeBlock
}
