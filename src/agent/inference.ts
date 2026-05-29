/**
 * Inference layer — pre-populate slot state from Lowe's session/profile
 * signals before the chat opens.
 *
 * The premise (Track 3 deep-dive, user instinct): the "magical" feel
 * comes from inference > interrogation. Wherever Lowe's data plausibly
 * gives us a signal, we pre-fill the slot at moderate confidence
 * (50-85) BEFORE the user types anything. The agent reads pre-filled
 * slots from the DYNAMIC KNOWLEDGE block and acts on them; the user
 * never has to answer "what style do you like" because we already
 * picked it from their browse history.
 *
 * Pure rule-based for the demo — no ML, no embeddings. Production
 * would replace this with a real recommender service; the *interface*
 * stays the same: (signals) → inferred slot state.
 */
import mockLowesData from '../../data/mockLowesData.json'
import { setSlot, type SlotState } from './slotModel'

type ShopperProfile = (typeof mockLowesData.shoppers)[number]

/** Look up a mock shopper by id. Returns undefined if not found. */
export function getMockShopper(id: string): ShopperProfile | undefined {
  return mockLowesData.shoppers.find((s) => s.id === id)
}

/**
 * Infer scope from browse/search signals.
 * - Saved list named like "Master Bath" / "Reno" → full_reno
 * - Multiple categories browsed in same session → partial
 * - Single PDP entry → a_few_items
 * - Search "remodel" / "redo whole" → full_reno
 * - Search "small bathroom ideas" → partial or full
 */
function inferScope(profile: ShopperProfile): { value: string; confidence: number; evidence: string } | null {
  const savedFullReno = profile.saved_lists?.find((l) =>
    /master|reno|whole|bath\s*2/i.test(l.name),
  )
  if (savedFullReno) {
    return {
      value: 'full_reno',
      confidence: 80,
      evidence: `Saved list "${savedFullReno.name}" implies a whole-room project`,
    }
  }
  // Browse spread across categories — multi-item / partial
  const categories = new Set(profile.browse_history_30d?.map((b) => b.category))
  if (categories.size >= 3) {
    return {
      value: 'partial',
      confidence: 65,
      evidence: `Browsed ${categories.size} different fixture categories in the last 30 days`,
    }
  }
  // Single-category focused — a few items
  if (categories.size >= 1 && categories.size <= 2) {
    return {
      value: 'a_few_items',
      confidence: 55,
      evidence: `Browse history concentrated in ${[...categories].join(' + ')}`,
    }
  }
  // Search-based scope hints
  const searches = profile.search_history_90d ?? []
  if (searches.some((s) => /remodel|redo|whole|full/i.test(s.query))) {
    return { value: 'full_reno', confidence: 60, evidence: 'Search queries mention remodel/redo' }
  }
  return null
}

/**
 * Infer style direction from browse + search + saved-list signals,
 * with regional cluster as a soft fallback.
 *
 * Looks for style cues in SKU ids ("MATTE-BLACK" → modern/contemporary,
 * "BRASS" → spa/transitional, "MARBLE" → traditional) and merges them
 * with regional_signals.top_styles_in_zip.
 */
function inferStyle(profile: ShopperProfile): { value: string; confidence: number; evidence: string } | null {
  const tokens: string[] = []
  for (const b of profile.browse_history_30d ?? []) tokens.push(b.sku.toLowerCase())
  for (const l of profile.saved_lists ?? []) for (const i of l.items ?? []) tokens.push(i.toLowerCase())
  const joined = tokens.join(' ')

  // Token → style mapping. Order matters — first match wins.
  const styleHints: Array<{ pattern: RegExp; style: string; weight: number }> = [
    { pattern: /matte[-_]?black|charcoal|ink/i, style: 'contemporary', weight: 70 },
    { pattern: /(navy|brass)/i, style: 'transitional', weight: 75 },
    { pattern: /marble|polished[-_]?nickel/i, style: 'traditional', weight: 70 },
    { pattern: /shiplap|farmhouse|barn|vintage/i, style: 'farmhouse', weight: 75 },
    { pattern: /spa|teak|stone|wellness|soaking/i, style: 'spa', weight: 75 },
    { pattern: /modern|minimal|geometric|flat[-_]?panel/i, style: 'modern', weight: 70 },
  ]
  for (const hint of styleHints) {
    if (hint.pattern.test(joined)) {
      return {
        value: hint.style,
        confidence: hint.weight,
        evidence: `Browse history features ${hint.style}-leaning fixtures`,
      }
    }
  }
  // Regional fallback
  const regional = profile.regional_signals?.top_styles_in_zip?.[0]
  if (regional) {
    return {
      value: regional,
      confidence: 35,
      evidence: `Top style in your area (${profile.geo?.zip ?? 'region'})`,
    }
  }
  return null
}

/**
 * Infer budget range from browse history price points. Without price
 * data on the SKUs in this mock we use loyalty tier + saved-list size
 * as a proxy. Production would join against the catalog.
 */
function inferBudget(profile: ShopperProfile): { value: unknown; confidence: number; evidence: string } | null {
  if (profile.mylowes_tier === 'homeowner_premium') {
    return {
      value: { low: 6000, high: 15000 },
      confidence: 55,
      evidence: 'Premium MyLowe\'s tier and recent high-end browsing',
    }
  }
  if (profile.saved_lists && profile.saved_lists.length > 0) {
    return {
      value: { low: 2500, high: 6000 },
      confidence: 45,
      evidence: 'Saved project list suggests mid-range planning',
    }
  }
  return null
}

/**
 * Infer persona traits from signals. Returns multi-choice value (array).
 */
function inferPersona(profile: ShopperProfile): { value: string[]; confidence: number; evidence: string } | null {
  const traits: string[] = []
  let evidence = ''

  // Accessibility cluster
  const accessibilitySignals =
    profile.browse_history_30d?.some((b) => /grab[-_]?bar|comfort[-_]?height|bench|non[-_]?slip/i.test(b.sku)) ||
    profile.search_history_90d?.some((s) => /elderly|safer|aging|accessibility|comfort/i.test(s.query))
  if (accessibilitySignals) {
    traits.push('senior_aging_in_place')
    evidence = 'Browse + search includes accessibility items'
  }

  // Premium downsizer cluster
  if (profile.mylowes_tier === 'homeowner_premium' && profile.geo?.regional_cluster === 'coastal_premium') {
    traits.push('downsizer')
    evidence = evidence || 'Premium tier + coastal-premium region'
  }

  // DIY signals
  if (profile.purchase_history_24m?.some((p) => /diy|tile|floor/i.test(p.sku))) {
    traits.push('diy_er')
    evidence = evidence || 'Past purchases include DIY-installable items'
  }

  if (traits.length === 0) return null
  return { value: traits, confidence: 60, evidence }
}

/**
 * Infer trigger (Layer C) — what brought them here.
 */
function inferTrigger(profile: ShopperProfile): { value: string; confidence: number; evidence: string } | null {
  const searches = profile.search_history_90d ?? []
  if (searches.some((s) => /leak|emergency|fix\s*now|urgent/i.test(s.query))) {
    return { value: 'leak_urgent', confidence: 70, evidence: 'Recent search includes leak/urgent terms' }
  }
  if (searches.some((s) => /elderly|aging|comfort|safer/i.test(s.query))) {
    return { value: 'accessibility', confidence: 65, evidence: 'Searches focus on accessibility' }
  }
  if (profile.saved_lists?.some((l) => /reno|2026|master/i.test(l.name))) {
    return { value: 'aging_fixtures', confidence: 50, evidence: 'Saved planning list suggests planned refresh' }
  }
  return null
}

/**
 * Main entry: given a shopper profile (or undefined for cold start),
 * return a SlotState pre-populated with everything we can infer.
 */
export function bootstrapSlots(profile: ShopperProfile | undefined): SlotState {
  if (!profile) return {}
  let state: SlotState = {}

  const inferences: Array<[string, ReturnType<typeof inferScope>]> = [
    ['scope', inferScope(profile)],
    ['style_direction', inferStyle(profile)],
    ['budget_range', inferBudget(profile) as ReturnType<typeof inferScope>],
    ['trigger', inferTrigger(profile)],
  ]
  for (const [slotId, inf] of inferences) {
    if (!inf) continue
    state = setSlot(state, slotId, {
      value: inf.value,
      confidence: inf.confidence,
      evidence: inf.evidence,
      source: 'agent',
    })
  }
  // persona_traits — special case, multi-value
  const persona = inferPersona(profile)
  if (persona) {
    state = setSlot(state, 'persona_traits', {
      value: persona.value,
      confidence: persona.confidence,
      evidence: persona.evidence,
      source: 'agent',
    })
  }
  return state
}
