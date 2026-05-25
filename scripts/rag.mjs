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
const KNOWLEDGE_DIR = join(__dirname, '..', 'data', 'knowledge')

function loadJson(name) {
  return JSON.parse(readFileSync(join(KNOWLEDGE_DIR, name), 'utf-8'))
}

const BUNDLES = loadJson('bundles.json')
const STYLE_GUIDE = loadJson('style-guide.json')
const DESIGN_RULES = loadJson('design-rules.json')
const PERSONA_DESIGN = loadJson('persona-design.json')

console.log(
  `[rag] knowledge loaded: ${BUNDLES.bundles.length} bundles, ` +
    `${Object.keys(STYLE_GUIDE.styles).length} styles, ` +
    `${Object.keys(PERSONA_DESIGN.personas).length} personas`,
)

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
export function retrieve(slotState = {}) {
  const chunks = []
  const mode = deriveMode(slotState)
  const style = slotState?.style_direction?.value
  const finishFamily = slotState?.finish_family?.value
  const config = slotState?.bathroom_configuration?.value
  const personaTraits = slotState?.persona_traits?.value
  const trigger = slotState?.trigger?.value

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
  const sections = []
  for (const c of chunks) {
    sections.push(`--- ${c.type.toUpperCase()} (${c.id}) ---`)
    if (typeof c.content === 'string') {
      sections.push(c.content)
    } else {
      sections.push(JSON.stringify(c.content, null, 2))
    }
    sections.push('')
  }
  return `
==== DYNAMIC KNOWLEDGE (retrieved from Bond knowledge base based on current slot state) ====
Use these chunks to ground your design recommendations. Quote the designer_voice cues
when natural; cite finish_compatibility when a finish is constrained; lead with
matching bundles when scope is partial or full. Do NOT echo the JSON to the user —
distill it into designer-voice prose.

${sections.join('\n')}
==== END DYNAMIC KNOWLEDGE ====
`
}
