# 10 — Demo Script (5 minutes)

**Audience:** Sagar, Carrie, Ray (and possibly Chris).
**Setting:** Zoom + screen share. Live demo on `localhost:5173/agent`.
**Length:** 5 minutes of presented content + Q&A.

---

## Opening (30 sec) — set the recovery frame

> "I went back and re-read the prompt. The first version answered an
> adjacent question — PDP widget, unified visualizer. What you asked for
> was the 2.0 agent onboarding and a manufacturer-facing product. Here's
> what I built around that, plus a verification harness for it."

Say it cleanly, don't apologize twice. Then move.

---

## Hero moment 1 — Live demo, scenario A (90 sec)

Open `http://localhost:5173/agent?blank=1` (no entry context — start
from scratch so they see the dashboard fill).

Type into chat:

> *"I want to redo my bathroom. We just bought our first house — kind of
> obsessed with that navy + brass look."*

Point to:
- **Left dashboard:** scope, style_direction, persona_traits filling in
  with confidence bars
- **Thinking trace:** the agent reasoning live above the answer
- **Chat:** designer-voice acknowledgment + a chip choice (probably
  scope confirmation or style anchor)

Click one chip ("whole bathroom"). Watch:
- scope confidence jumps to 95% (✓ user-set)
- agent's next turn proposes a product set
- **Right column: live R3F scene.** As the agent calls updateSceneSlot,
  a furniture mesh (a stand-in — see "About the stand-ins" below) drops
  into the IsometricScene with the right position per slot.
- **Cart subtotal** climbs (slot count + total in the dashboard)

Let it run 4-5 turns. End with the agent presenting the procedural close
turn (itemized cart + chipChoice).

---

## Hero moment 2 — Manual override on the dashboard (45 sec)

Reset (`?blank=1` reload). This time, before sending any chat:

- Click **scope** chip → "partial"
- Click **style_direction** chip → "modern"
- Type a budget range → $5000–$8000

The dashboard now shows 3 user-set slots at 95% (✓).

Send chat:
> *"OK — what should I be looking at?"*

The agent **respects every user-set slot**. No re-asks. It proposes
immediately, scoped to "partial" + "modern" + the budget range.

Point out: *"This is the bidirectional dashboard — the user can skip
ahead and the agent treats those slots as truth. Round-trip latency
on a configurator becomes one click."*

---

## Hero moment 3 — Verification harness (45 sec)

Switch terminal:

```bash
npm run eval -- --quick
```

Watch the 3-case run go (≈5 min — actually do this BEFORE the meeting so
the report is fresh; just open the report in the meeting).

Open the latest report JSON. Show:
- 7 personas × budget postures matrix
- Discovery overall avg ≥ 4.0
- Per-criterion breakdown (context_recognition, customer_type_calibration,
  scope_capture_efficiency, budget_handling, interrogation_load,
  propose_readiness_accuracy)
- One diagnosis example: judge cites the prompt section, quotes the
  agent, suggests the patch

> "Every prompt change gets a score. Regressions caught immediately.
> Three iterations from baseline to current got us from 27% case pass to
> [current %]."

---

## Part 2 — Manufacturer narrative (30 sec)

> "Same engine, manufacturer catalog filter. MasterBrand cabinetry as the
> headline example — billions of configurations, hundreds of visualizers
> that 'all suck and require manual work.' The agent's confidence model
> absorbs configurator axes as additional slots. Same dashboard. Same
> scene visualization. Three close branches: quote request, spec sheet
> download, dealer portal handoff."

(Optional: show the Part 2 mockup slide if prepared.)

---

## Close (30 sec) — what to do next

> "Three things I'd build next, in order. One: real bathroom GLBs to
> replace the stand-in meshes — fal.ai/Rodin or Meshy, ~8 fixtures,
> roughly a day. Two: top up the harness to 30 trajectories — adds two
> more persona spectrum extremes. Three: spin up one manufacturer skin
> to prove the portability. Each is roughly a week."

Stop. Don't oversell.

---

## About the stand-ins

Today the IsometricScene uses Bond-3d's existing 300-GLB furniture
catalog (chairs, sofas, cabinets) as visual placeholders — there are no
bathroom-specific GLBs in this repo yet. `sceneBridge.ts` maps each
bathroom slot to the closest-sized furniture category so the *system*
works end-to-end. The bathtub will look like a sofa; the toilet like a
chair. **Lean into this in the meeting** — the point being demonstrated
is the wiring (agent ↔ store ↔ R3F), not the photorealism. Replacing
the meshes is a day of asset generation, documented in
`13-BATHROOM-ASSETS.md`.

---

## Demo path — exact sequence (for rehearsal)

1. `localhost:5173/agent?blank=1` (Mac browser)
2. Type: "I want to redo my bathroom. We just bought our first house — kind of obsessed with that navy + brass look."
3. Wait for thinking + first agent reply
4. Click first chip option
5. Wait for product proposal
6. Click "Add all to cart" or equivalent close chip
7. Reset (`?blank=1` reload)
8. Click 3 dashboard slots manually before typing
9. Type: "OK — what should I be looking at?"
10. Show the no-re-ask behavior
11. Switch to terminal, show latest eval report
12. Switch to Figma / Notion / etc., show Part 2 mockup
13. Close

**Backup paths if a step fails:**
- If the agent doesn't call rich-component tools → walk through anyway,
  point to the prompt and explain the protocol
- If the IsometricScene is blank or a GLB fails to load → reload with
  `?scene=2d` (it preserves the old PNG-overlay panel as a fallback;
  the dashboard + cart subtotal still tell the story)
- If the eval is mid-run → open a finished report JSON; same proof

---

## Rehearsal plan (Day 8)

Five run-throughs:
1. Solo, talking out loud, just hitting marks
2. Solo, timing each section — aim 5:00 total
3. With the localhost actually open, every click rehearsed
4. With one teammate or rubber duck — answer follow-ups
5. With the *backup paths* — practice graceful failure

Common Q&A to prep for:
- *"How does this scale to other categories beyond bathroom?"* →
  catalog filter swap, same agent
- *"What happens if the user types something off-topic?"* → system prompt
  redirects, the demo has been engineered around that
- *"What's the latency?"* → ~3-8s per turn with thinking, can be tuned
  by lowering thinking budget
- *"How big is the prompt?"* → show the inspector via `?inspector=1`
- *"What about the 3D engine?"* → it's already wired — Bond-3d's
  IsometricScene + editorObjectsStore drives the right column. Stand-in
  meshes today; real bathroom GLBs are ~1 day of asset gen via Rodin/
  Meshy (see 13-BATHROOM-ASSETS.md)
- *"Cost per conversation in production?"* → Sonnet 4.6 + thinking +
  ~10 turns + tool use ≈ $0.30–0.60 per shopper; cacheable for repeated
  catalog system prompt
