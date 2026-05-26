# 15 — Bond Agent Architecture: the 4-axis model

**Status**: design doc — drives all Phase 2 + Part 2 work.
**Author**: Ilwon Yoon
**Date**: 2026-05-25

This is the mental model the rest of the build rests on. Every change
to the agent, the RAG layer, the dashboard UI, or the persona library
should be defensible against these four axes.

---

## The 4 axes

Bond's agent doesn't have *one* behavior. It has **one engine with four
inputs**, and the inputs together determine the entire experience —
voice, retrieval, UI, close action, KPIs.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    │
│  │ AXIS 1 │ +  │ AXIS 2 │ +  │ AXIS 3 │ +  │ AXIS 4 │    │
│  │  SITE  │    │ FUNNEL │    │CONTEXT │    │  GOAL  │    │
│  └────┬───┘    └────┬───┘    └────┬───┘    └────┬───┘    │
│       │             │             │             │        │
│       └─────────────┴─────────────┴─────────────┘        │
│                          │                                │
│                  ┌───────▼────────┐                       │
│                  │  AGENT BEHAVIOR │                      │
│                  │   = f(1,2,3,4)  │                      │
│                  └───────┬────────┘                       │
│                          │                                │
│    ┌──────────┬──────────┼──────────┬──────────┐          │
│    │          │          │          │          │          │
│  voice    retrieval     UI      close     telemetry       │
│ profile   (RAG src)   labels   action      events         │
└──────────────────────────────────────────────────────────┘
```

---

## Axis 1 — Site (the brand wrapper)

**What it is**: where Bond's agent is embedded. Determines brand
lockup, catalog scope, voice register, available close actions.

**Values today**:
| Site | Persona pool | Catalog | Voice register | Close action |
|---|---|---|---|---|
| `lowes-consumer` (Lowe's bath) | consumer shoppers | full Lowe's bath catalog (multi-brand) | consult / designer | add to cart |
| `msi-designer` (MSI Surfaces) | designers + spec pros | MSI tile + grout + trim | spec / professional | spec sheet, sample request |
| `masterbrand-designer` (cabinet) | designers + dealers | MasterBrand configurator axes | spec / professional | quote request, dealer handoff |
| `pro-portal` (any) | contractors | bulk pricing | pro / SKU-direct | bulk quote |

**How it's inferred**: URL host (`lowes.com` vs `msisurfaces.com`),
embed iframe origin, partner SDK init param. Never asked of the user.

**Why it matters first**: brand identity + catalog are *non-overlapping
universes*. Mixing Lowe's catalog into an MSI experience would be both
legally wrong and confusing.

---

## Axis 2 — Funnel position (where in the site they entered)

**What it is**: the URL path / referral path that brought them to the
agent. Tells us their *current depth of intent* within Axis 1's site.

**Values within Lowe's** (consumer):
| Entry path | Inferred intent | Default scope guess |
|---|---|---|
| `lowes.com/design/bathroom` (global nav) | "design my bathroom" | full reno or unknown |
| Banner click ("Spring refresh") | "browsing inspiration" | partial / unknown |
| PDP (single SKU like vanity) | "swap this one item or build around it" | single / partial |
| Category page → filter → click | "comparing within type" | single |
| MyLowe's saved list → reopen | "continuing prior project" | whatever's on the list |

**Values within MSI** (designer):
| Entry path | Inferred intent |
|---|---|
| `msisurfaces.com` global nav | exploration, no specific tile |
| PDP (specific tile like Montauk Black) | spec'ing this tile into a current project |
| Series page (Coleridge, Cosmopolitan) | looking for matched series |
| Spec sheet tool (existing MSI feature) | finalizing a tear sheet |

**How it's inferred**: entry URL parsed, referrer, partner-passed
metadata. The current `EntryContext` in `scenarios.ts` already encodes
this with `source: 'pdp' | 'global_nav' | 'banner'` + `product` ref.

**Why it matters second**: same site, different funnel positions =
**radically different goals**. A Lowe's user on a PDP doesn't want to be
asked "what's your style" — they're already looking at navy + brass.

---

## Axis 3 — Accumulated context (how much we know already)

**What it is**: the *prior* signals we have about this specific user
before the conversation opens. This is the **inference budget** — the
gap between cold start and warm start.

**Source layers** (priority order):
1. **In-session signals** (always available)
   - Current URL + path (= Axis 1+2)
   - Device, browser, geo (ZIP from IP), time-of-day, weather
   - Referrer (organic vs paid vs internal)
2. **Site-specific authenticated signals** (if logged in)
   - For Lowe's: MyLowe's profile — 30-day browse, search history,
     saved lists, past purchases, loyalty tier
   - For MSI: designer portal — saved projects, prior orders, firm
     affiliation
3. **Site-specific aggregate signals**
   - Regional palette / top-sellers in ZIP (Lowe's)
   - Trending tile lines this quarter (MSI)
4. **Probabilistic signals** (derived)
   - "users who viewed X also bought Y"
   - Persona cluster from prior purchases

**Three calibration bands**:
| Band | Sources available | Inferable slots | Confidence ceiling |
|---|---|---|---|
| **Cold** | only in-session signals (anon, fresh) | scope (weakly from URL), region | ~45 |
| **Warm** | + 30-day browse + searches | + style, budget tier, persona | 60-75 |
| **Hot** | + saved lists + purchases | + bundle_id, finish_family | 75-85 |

**Where it lives in code**: `data/mockLowesData.json` is our mock
representation. `src/agent/inference.ts` does the rule-based
extraction. Production replaces both with real partner integrations.

**Why it matters third**: it determines *how many questions the agent
needs to ask before being useful*. Hot = zero. Cold = one visual chip.

---

## Axis 4 — Goal + constraints (the user's project shape)

**What it is**: the user's current project intent + the hard limits
around it. Not who they are — *what they want done now*.

**Goal sub-axis (4 modes)**:
| Mode | Definition | Typical session length | Hero metric |
|---|---|---|---|
| `single` | swap one SKU | 1-2 min | add-to-cart in turn 2 |
| `multi-item` | coordinated bundle (3-6 SKUs) | 3-5 min | bundle add-all-to-cart |
| `partial reno` | one zone (vanity wall, shower zone) | 5-10 min | saved design + add-to-cart |
| `full reno` | whole bathroom (~10 SKUs + tile + paint) | 10+ min, multi-session | saved design + schedule install |

**Constraints sub-axis (always orthogonal to goal)**:
- **Budget** — total ceiling (often inferred from mode + tier + signals)
- **Style** — direction (modern/spa/transitional/etc.) + finish family
- **Configuration** — what physical space they have (powder / 3/4 / full / primary)
- **Who uses it** — household composition + use frequency
- **Must keeps / Must changes** — protected fixtures + must-replaces
- **Timeline / urgency** — leak now? plan for next year?
- **Installation** — DIY vs hire pro

**How constraints get filled** (in priority order):
1. Pre-filled from Axis 3 (warm start) — confidence 50-85
2. Pre-filled from Axis 1+2 inference (e.g. PDP entry → style_tags) — 50-65
3. User explicit in chat — 80-95
4. User chip click in settings — 95
5. Agent inference from mid-conversation lexical cue — 30-50

**Why it matters last**: only after we know **who is on which site at
which depth with what history** does the goal/constraint conversation
make sense.

---

## How the 4 axes compose into agent behavior

Each turn of the agent's response is the output of:

```
behavior(turn) = compose(
  AXIS_1_SITE,       // brand voice + catalog + close
  AXIS_2_FUNNEL,     // current entry context
  AXIS_3_CONTEXT,    // pre-filled slot state
  AXIS_4_GOAL        // committed scope + constraints
)
```

### Concrete examples

**Example 1 — Hot Lowe's PDP user**
- Axis 1: `lowes-consumer`
- Axis 2: PDP (Beckett Navy Vanity)
- Axis 3: hot (Sarah/A — 4 navy PDPs viewed, saved list "First Home Bath")
- Axis 4: scope inferred = `partial`, style inferred = `transitional`, budget ~$1.5-3K

→ Behavior: open with *"Saw you've been circling the Beckett — building
the wall around it. Want me to pull the matching mirror and faucet?"* +
proposeProductGrid with `vanity_wall_refresh` bundle. Zero questions.

**Example 2 — Cold MSI designer**
- Axis 1: `msi-designer`
- Axis 2: PDP (Montauk Black 4x12 subway tile)
- Axis 3: cold (no portal login)
- Axis 4: scope = unknown, project context unknown

→ Behavior: spec voice. *"Pulling specs for the Montauk Black 4x12.
What's this going into — bath surround, kitchen backsplash, or
commercial spec?"* + chipChoice. One question, narrow.

**Example 3 — Cold Lowe's global nav**
- Axis 1: `lowes-consumer`
- Axis 2: global nav (no PDP)
- Axis 3: cold
- Axis 4: nothing committed

→ Behavior: visual scope-first picker. 4 image cards (single / partial /
full / "just exploring"). One tap routes the entire conversation.

---

## What code lives at each axis

| Axis | Primary code | Secondary code |
|---|---|---|
| 1 — Site | `src/agent/appContext.ts` (planned), `data/knowledge/contexts/<id>/` | api-server prompt assembly |
| 2 — Funnel | `src/agent/scenarios.ts` (`EntryContext` type + scenarios A-E) | `entryContextString()` for prompt injection |
| 3 — Context | `data/mockLowesData.json`, `src/agent/inference.ts` (`bootstrapSlots`) | `data/eval/personas.json` |
| 4 — Goal | `data/eval/slot-model.json` (Z model), `src/agent/slotModel.ts` | `src/agent/SlotConfidencePanel.tsx` |

The **RAG layer** (`scripts/rag.mjs`) is the glue: it reads
state-at-time-of-turn from all 4 axes and assembles the dynamic
knowledge injection. Adding a new Axis-1 site = adding a new
`contexts/<id>/` knowledge folder + appContext config entry. Adding a
new Axis-2 funnel path = adding a scenario. Etc.

---

## Build order — Lowe's first

For the 2026-06-01 demo, **only `lowes-consumer` ships**. The other
sites are **architecturally ready but not implemented**.

What "architecturally ready" means concretely:
- `appContext.ts` exists with `lowes-consumer` populated
- Stub config slots for `msi-designer`, `masterbrand-designer` present
  but unfilled (or omitted entirely — types allow extension)
- Knowledge files live in `data/knowledge/contexts/lowes-consumer/`
  (not at the root) so adding `contexts/msi-designer/` later is a
  copy-paste, not a refactor
- Prompt assembly is layered (`BASE + LOWES_CONSUMER`) so adding
  `BASE + MSI_DESIGNER` is additive
- UI labels come from the appContext config, not hardcoded
- The `?manufacturer=` URL knob is parsed even though it currently
  always routes to lowes-consumer

This is `~2.5 hours` of "scaffold tax" on Phase 2 work, in exchange for
a **zero-modification add of Part 2** later.

---

## Demo narrative implication

The 4-axis model is itself the **strongest pitch** for Bond's
positioning vs. Mylow/competitors:

> "Mylow Design is a chat-on-PDP. Roomvo is a flooring restyler. Modsy
> was a one-shot photo-to-render. **Bond's primitive is the room.** The
> agent compositionally adapts to *site × funnel × context × goal* —
> Lowe's is the first deployment; MSI, MasterBrand, and the manufacturer
> tier come from the same engine."

That sentence is only credible if the architecture is genuinely
4-axis-composable, not a single-purpose chatbot. This doc + the
appContext scaffold are how that credibility gets earned.

---

## Open questions (parked for later)

- **Axis crossover**: can a user *switch* sites mid-session? (e.g.
  Lowe's PDP → MSI for tile spec? Probably no — different brand
  experiences. Confirm with Bond team.)
- **Multi-axis inference**: when 3 of 4 axes agree but 1 contradicts
  (e.g. Lowe's-consumer + PDP-vanity but pre-filled context says "pro
  buying for client"), which wins? **Most-specific signal wins**
  (user-explicit > pre-fill > URL-inferred).
- **Telemetry partition**: each (Axis 1, Axis 2, Axis 4 mode) tuple
  should have its own funnel metric. Not in scope for demo.

---

## Files referenced

- `data/eval/slot-model.json` — Axis 4 schema
- `data/mockLowesData.json` — Axis 3 mock
- `data/knowledge/*.json` — Axes 1-4 retrieval inputs (will move to
  `contexts/lowes-consumer/`)
- `src/agent/scenarios.ts` — Axis 2 entry contexts
- `src/agent/inference.ts` — Axis 3 bootstrap rules
- `src/agent/systemPrompt.ts` — composed prompt
- `scripts/rag.mjs` — composer
- (planned) `src/agent/appContext.ts` — Axis 1 config registry

---

**Next**: implement `appContext` scaffold + move knowledge files into
`contexts/lowes-consumer/`, then resume Phase 2 work (B/C/D/E) on top
of the now-composable foundation.
