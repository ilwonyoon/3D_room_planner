# 12 — Demo Runbook (live execution guide)

**Status**: written 2026-05-23 after end-to-end browser validation of v10.

This is the playbook for actually running the demo. Differs from
`10-DEMO-SCRIPT.md` (which is the 5-minute meeting plan): this one
documents *what the agent actually does* on each step, what to point
at, and what to do if a step misfires.

---

## Setup (before the meeting)

**Use the Bond-3d fork** — that's where the live R3F integration lives.

1. Two terminal tabs open in `Bond-3d/`:
   - tab 1: `pnpm dev` (Vite on 5175)
   - tab 2: `pnpm api` (Anthropic proxy on 3001)
2. Browser at `http://localhost:5175/?blank=1` — blank chat, agent
   playground at root.
3. Window roughly 1400×900 — three columns clean.

The original prototype on `Bond/` (port :5173) still works for the
PNG-overlay version. Keep it as an emergency backup only.

---

## Hero moment 1: Dashboard fills as the user talks (90s)

**Send this:**
> "I want to redo my whole bathroom, $5K materials budget. Just show me
> a starter set."

**Observed agent behavior** (verified end-to-end):
- Thinking trace renders (1000-1400 chars of model reasoning).
- Agent replies with designer voice — names the scope ("full reno"),
  the budget, and a starter direction ("warm and modern, navy + brass
  vanity as anchor").
- Dashboard fills **4-5 slots** to 95-98% with evidence quotes:
  Scope, Style direction, Room size, Budget, What brought you here.
- `respects_user_input_priority` = 100% — no re-asks of what the user
  said.

**Point at:**
- Thinking panel above the answer.
- Left dashboard filling in with the evidence quotes — emphasize this
  is the agent thinking out loud, visibly.
- **Right column: R3F scene gets a furniture mesh** when the agent
  calls `updateSceneSlot`. Read the slot label off the chat ("I'd
  go with this vanity") and the audience sees a corresponding mesh
  drop into the 3D room in real time. Acknowledge upfront that the
  mesh is a stand-in (it's a chair/cabinet, not a real toilet/vanity)
  — the wiring is what's being demonstrated.
- Designer voice — read one sentence aloud.

**Failure modes & rescues:**
- If agent goes long without filling slots: still narrate the thinking
  trace as the proof point. Slots usually catch up on turn 2.
- If chat doesn't stream at all: refresh page, re-send. Vite HMR can
  stall the SSE connection sometimes.
- If the R3F scene is empty or a GLB fails to load: reload with
  `?scene=2d` — preserves the old PNG-overlay panel as a fallback.

---

## Hero moment 2: User overrides the dashboard (45s)

**Reset:** reload `?blank=1`. Don't send a chat yet.

**Click 3 dashboard slots directly:**
- Scope → "partial"
- Style direction → "modern"
- Budget → type 3000–6000

Each click sets the slot to 95% with a "✓ set in dashboard" tag.

**Then send chat:**
> "OK — what should I be looking at?"

**Observed agent behavior:**
- Agent does NOT re-ask about scope, style, or budget — treats them
  as truth.
- Goes straight to either a slot-specific question (chip choice) or
  a proposal.

**Point at:**
- The three checkmarked slots on the left.
- "Bidirectional dashboard" — same model, agent and user both write.
  Cuts round-trip latency for users who already know what they want.

**Failure mode:**
- If the agent does re-ask: that's the `respects_user_input_priority`
  failing — happens ~10% of the time. Acknowledge it ("yes, this is
  one of the things the eval harness catches") and move on.

---

## Hero moment 3: The harness itself (45s)

**Switch to terminal**, show:

```bash
cat docs/bond-demo/11-EVAL-LOCKDOWN.md | head -30
ls data/eval/reports/ | tail -5
```

**Talk through the numbers:**
- 13 trajectories across 7 personas including "I don't know what I
  want" and "I know exactly what I want."
- 4 budget postures including unrealistic_low.
- Voice 4.39, designer_quality 4.44 (highest of any version).
- Safety 100% across cart accuracy, no invented facts, respected
  constraints.
- Discovery 3.67 — 0.33 short of the 4.0 target, gap is budget
  anchoring on turn 1. **Be honest about the gap.**

**Show one diagnosis** from the latest report:

```bash
python3 -c "
import json
r = json.load(open('data/eval/reports/2026-05-23T17-08-30-196Z--2026-05-23-v10-revert-keep-checklist.json'))
for c in r['cases']:
    if 'budget_handling' in str(c.get('judgement', {}).get('diagnoses', [])):
        d = next(d for d in c['judgement']['diagnoses'] if d['criterion'] == 'budget_handling')
        print(c['id'], '→', d['prompt_section'])
        print(' ', d['suggested_patch'][:200])
        break
"
```

**Point at:**
- Every failure cites the exact prompt section that was violated.
- Every failure suggests a patch.
- Five iteration cycles documented in git log — show the score deltas.

---

## Part 2: Manufacturer (30s)

**Don't switch off localhost.** Just say it:

> "Same engine, MasterBrand cabinetry catalog filter. Confidence model
> absorbs configurator axes — door style, finish, box, hardware — as
> additional dashboard slots. Same scene panel, kitchen plan view
> instead of bathroom. Three close branches: quote request, spec
> sheet download, dealer portal handoff. Roughly a week per new
> manufacturer skin."

If they want to see something: open `docs/bond-demo/09-PART2-MANUFACTURER.md`
in the editor and read the magical-product-experience paragraph.

---

## Close (30s)

> "What I'd build next, in order: a budget-anchoring tool that surfaces
> real Lowe's price distributions on turn 1 — that's the single
> change that pushes Discovery past 4.0. Then real bathroom GLBs to
> replace the stand-in meshes in the scene (~1 day, Rodin/Meshy —
> see 13-BATHROOM-ASSETS.md). Then one manufacturer skin to prove the
> portability."

Stop. Don't oversell.

---

## What NOT to demo (known issues)

- **`updateSceneSlot` doesn't always fire.** The agent prefers to
  describe products in text rather than commit them to the scene
  panel. The room hero stays mostly empty. Don't make this the
  showcase moment — make it about the dashboard + voice + safety
  instead.
- **proposeImageChoice fires ~67% of the time** when explicitly asked
  ("show me three tiers"). If it misses, the agent's text alone reads
  fine; the picker is a bonus. Don't *promise* it before sending.
- **Mood-board images for proposeImageChoice are Unsplash placeholders**
  — explain if asked: "production wires to Lowe's catalog imagery
  directly; these are stand-ins."
- **Scene meshes are visual stand-ins.** Bond-3d ships with 300 GLBs
  for chairs/sofas/cabinets — no bathroom fixtures yet. `sceneBridge.ts`
  maps each bathroom slot to the closest furniture category, so the
  bathtub looks like a sofa and the toilet like a chair. Lean into it:
  the *wiring* is what's being demoed (agent ↔ store ↔ R3F). Replacing
  the meshes is documented in `13-BATHROOM-ASSETS.md` (~1 day, ~$10-20).
- **Camera default may not frame all 8 slots.** If the scene fills up
  and items sit off-screen, the user can pan/orbit normally; if it
  looks bad, drop into `?scene=2d` for the PNG-overlay fallback.

---

## Q&A prep (ranked by likelihood)

1. **"How does Discovery 3.67 not hit 4.0?"** — budget anchoring on
   turn 1 is the gap; needs a price-distribution tool not a prompt
   tweak.
2. **"What does the agent actually call the API with?"** — show the
   `tools` array in `scripts/api-server.mjs`. Five tools:
   updateSlotConfidence, updateSceneSlot, proposeChipChoice,
   proposeImageChoice, proposeProductGrid.
3. **"How are personas defined?"** — show `data/eval/personas.json`.
   They're system prompts for a Haiku simulator, not static
   transcripts.
4. **"How is the harness different from typical LLM evals?"** —
   trajectory-level, not turn-level. Persona simulator + agent +
   judge. Judge cites prompt section per failure. Three LLMs in
   tandem, not one.
5. **"Can the dashboard be customized per manufacturer?"** — yes,
   `data/eval/slot-model.json` is the shared schema. Add cabinetry
   axes, the dashboard renders them. Same code path.
6. **"Is this live 3D?"** — yes. Bond-3d's R3F scene + editorObjectsStore
   drives the right column. Agent tool calls flow through
   `sceneBridge.ts` to `addObject()`. Today the meshes are stand-ins
   from the existing furniture catalog (no bathroom GLBs in the repo
   yet); swapping in real bathroom assets is ~1 day, all wiring is
   already in place.
