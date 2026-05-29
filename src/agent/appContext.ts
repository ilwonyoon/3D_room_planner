/**
 * App-context registry — Axis 1 in the 4-axis architecture
 * (see docs/bond-demo/15-AGENT-ARCHITECTURE.md).
 *
 * The agent is a single engine that adapts to four inputs:
 *   1. SITE — this file. Which brand/catalog/voice/close action.
 *   2. FUNNEL — scenarios.ts (PDP, global nav, banner, etc.)
 *   3. CONTEXT — inference.ts (cold / warm / hot from Lowe's data)
 *   4. GOAL — slot model (scope + style + budget + ...)
 *
 * Today only `lowes-consumer` ships. The other entries are stubbed
 * (commented out, or omitted but type-allowed) so adding MSI /
 * MasterBrand later is *additive*, not a refactor.
 */

/** Identifier for a site/brand context. The string also doubles as
 *  the folder name in `data/knowledge/contexts/<id>/`. */
export type AppContextId =
  | 'lowes-consumer'
  | 'msi-designer'           // Part 2 — not yet wired
  | 'masterbrand-designer'   // Part 2 — not yet wired

/** Visibility rule for the Bathroom settings chip in the chat-bottom
 *  bar. `partial+full` hides the chip when scope is single-SKU mode
 *  (commerce-filter feel takes over). */
export type SettingsVisibility = 'always' | 'partial+full' | 'never'

/** Voice register the agent should use in its replies. */
export type VoiceRegister = 'consult' | 'spec'

/** What the close turn drives toward. */
export type CloseAction =
  | 'add_to_cart'
  | 'save_to_account'
  | 'request_quote'
  | 'export_spec_sheet'
  | 'request_samples'

export interface AppContextConfig {
  readonly id: AppContextId

  // Brand lockup — header + base colors. UI labels come from below.
  readonly brand: {
    readonly name: string         // "Mylow Designer" / "MSI Designer Tools"
    readonly tagline?: string     // small grey subtitle next to brand
  }

  // Voice register the agent adopts (also fed into system prompt).
  readonly voice: VoiceRegister

  // Which persona pool we draw from when inferring traits.
  readonly personaPool: 'consumer' | 'pro'

  // Settings UI — label + when the chip appears.
  readonly settings: {
    readonly label: string                  // "Bathroom settings" / "Spec sheet"
    readonly visibility: SettingsVisibility
    readonly subhead: string                // sheet header description line
  }

  // Cart / close — label + primary close action.
  readonly cart: {
    readonly label: string                  // "Cart" / "Quote request"
    readonly closeAction: CloseAction
  }

  // Knowledge — where the RAG layer reads from. Always
  // `contexts/<id>/`; encoded here so the path is the single source
  // of truth for both client + server reads.
  readonly knowledgePath: string            // "contexts/lowes-consumer"

  // Default scene theme passed to IsometricScene.
  readonly sceneTheme: 'light' | 'dark'

  // Friendly progress copy for the multi-item bundle UI (Phase 2 E).
  // Takes the bundle name and (placed, total) and returns a single line.
  readonly bundleProgressLabel: (bundleName: string, placed: number, total: number) => string
}

/** Single source of truth for live + planned contexts. Today only
 *  'lowes-consumer' is populated; the two manufacturer entries are
 *  parked as null and excluded at runtime (see `getAppContext`). */
export const APP_CONTEXTS: Record<AppContextId, AppContextConfig | null> = {
  'lowes-consumer': {
    id: 'lowes-consumer',
    brand: {
      name: 'Mylow Designer',
      tagline: '· agent playground',
    },
    voice: 'consult',
    personaPool: 'consumer',
    settings: {
      label: 'Bathroom settings',
      visibility: 'partial+full',
      subhead: 'Just the basics here — Mylow learns the rest from your chat.',
    },
    cart: {
      label: 'Cart',
      closeAction: 'add_to_cart',
    },
    knowledgePath: 'contexts/lowes-consumer',
    sceneTheme: 'light',
    bundleProgressLabel: (name, placed, total) =>
      `${name} — ${placed} of ${total} placed`,
  },
  // Stubs for Part 2 — not wired yet. Filling these in is a single PR.
  'msi-designer': null,
  'masterbrand-designer': null,
}

/** Resolve URL params → AppContextId. Today `?manufacturer=msi` and
 *  `?manufacturer=masterbrand` route to stubs that aren't live yet —
 *  they fall through to lowes-consumer until those configs are
 *  populated. */
export function deriveAppContext(params: URLSearchParams): AppContextId {
  const m = params.get('manufacturer')?.toLowerCase()
  if (m === 'msi' && APP_CONTEXTS['msi-designer']) return 'msi-designer'
  if (m === 'masterbrand' && APP_CONTEXTS['masterbrand-designer']) {
    return 'masterbrand-designer'
  }
  return 'lowes-consumer'
}

/** Look up a context config, asserting it's populated. Throws if a
 *  stub is requested — callers should rely on `deriveAppContext` which
 *  already falls back to lowes-consumer. */
export function getAppContext(id: AppContextId): AppContextConfig {
  const config = APP_CONTEXTS[id]
  if (!config) {
    throw new Error(
      `AppContext '${id}' is declared but not wired yet. ` +
        `Populate APP_CONTEXTS['${id}'] in src/agent/appContext.ts.`,
    )
  }
  return config
}
