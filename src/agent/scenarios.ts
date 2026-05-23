/**
 * Entry-context payloads for the 5 demo scenarios (see
 * docs/bond-demo/04-SCENARIOS.md). Selecting a scenario in the inspector
 * resets the conversation with that entry payload as system context.
 */

export type EntryContext = {
  readonly source: 'pdp' | 'global_nav' | 'banner'
  readonly product?: {
    readonly id: string
    readonly name: string
    readonly category: string
    readonly price_cents: number
    readonly brand: string
    readonly style_tags: readonly string[]
    readonly image_url?: string
  }
  readonly persona_hint?: string
  readonly trigger_hint?: string
  readonly session?: { readonly visits: number; readonly recent_views: readonly string[] }
}

export type Scenario = {
  readonly id: 'A' | 'B' | 'C' | 'D' | 'E'
  readonly title: string
  readonly mode: 'live' | 'static'
  readonly entry: EntryContext
  readonly note: string
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'A',
    title: 'A · PDP → vanity + pairing',
    mode: 'live',
    note: '30s newlywed, design-curious, building a coordinated set.',
    entry: {
      source: 'pdp',
      product: {
        id: 'synth-beckett-navy-24',
        name: 'Beckett 24-in Navy Blue Single Sink Vanity',
        category: 'Vanities',
        price_cents: 54900,
        brand: 'allen + roth',
        style_tags: ['modern', 'transitional', 'navy', 'brass'],
      },
      persona_hint: 'first-home, design-curious couple',
      trigger_hint: 'aging fixtures',
      session: { visits: 1, recent_views: [] },
    },
  },
  {
    id: 'B',
    title: 'B · Global nav → full reno',
    mode: 'live',
    note: '40s family, move-in to new house, durability + look.',
    entry: {
      source: 'global_nav',
      persona_hint: '40s family with kids, just moved in',
      trigger_hint: 'move-in / make it ours',
      session: { visits: 1, recent_views: [] },
    },
  },
  {
    id: 'C',
    title: 'C · PDP (bathtub) → urgent leak',
    mode: 'static',
    note: '50s single, leaking tub, needs fix this weekend.',
    entry: {
      source: 'pdp',
      product: {
        id: 'synth-alcove-tub',
        name: 'Project Source 60-in Alcove Bathtub',
        category: 'Bathtubs',
        price_cents: 27900,
        brand: 'Project Source',
        style_tags: ['traditional', 'white', 'value'],
      },
      persona_hint: '50s single homeowner, DIY-adjacent',
      trigger_hint: 'leak / urgent',
    },
  },
  {
    id: 'D',
    title: 'D · Global nav → resale ROI',
    mode: 'static',
    note: '60s downsizer selling next spring, ROI-driven.',
    entry: {
      source: 'global_nav',
      persona_hint: '60s downsizer, financially cautious',
      trigger_hint: 'selling next spring',
    },
  },
  {
    id: 'E',
    title: 'E · PDP (grab bar) → accessibility',
    mode: 'static',
    note: 'Adult child shopping for elderly parent.',
    entry: {
      source: 'pdp',
      product: {
        id: 'synth-grab-bar-18',
        name: 'Moen Home Care 18-in Stainless Grab Bar',
        category: 'Bath Safety',
        price_cents: 2999,
        brand: 'Moen',
        style_tags: ['accessibility', 'stainless'],
      },
      persona_hint: 'adult child buying for elderly parent',
      trigger_hint: 'accessibility / aging-in-place',
    },
  },
]

/** Format an entry payload for the user-turn-zero context the agent receives. */
export function entryContextString(entry: EntryContext): string {
  const parts: string[] = []
  parts.push(`ENTRY SOURCE: ${entry.source}`)
  if (entry.product) {
    parts.push(
      `PRODUCT VIEWED: ${entry.product.name} (brand: ${entry.product.brand}, ` +
        `category: ${entry.product.category}, ` +
        `price: $${(entry.product.price_cents / 100).toFixed(2)}, ` +
        `style tags: ${entry.product.style_tags.join(', ')})`,
    )
  }
  if (entry.persona_hint) parts.push(`PERSONA HINT: ${entry.persona_hint}`)
  if (entry.trigger_hint) parts.push(`TRIGGER HINT: ${entry.trigger_hint}`)
  if (entry.session) {
    parts.push(
      `SESSION: visit #${entry.session.visits}` +
        (entry.session.recent_views.length
          ? `, recent views: ${entry.session.recent_views.join(', ')}`
          : ''),
    )
  }
  return parts.join('\n')
}
