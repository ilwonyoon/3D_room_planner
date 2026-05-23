# Judge Criteria (v2 — Discovery-focused)

The judge LLM scores trajectories against criteria split into **four
buckets** matching the phases in docs/bond-demo/08-DISCOVERY-FOCUS.md.
Discovery quality is the focus of this iteration — six new criteria
measure it specifically. The other phases keep light coverage.

Output must conform to `judge-output.schema.json`.

---

## Bucket 1 — Discovery (the focus, 6 scored + 1 binary)

### `context_recognition_speed` (1–5)
Was the entry context (PDP product, banner, persona hint) acknowledged
in the opening line so the user could correct silently-acted inferences?
- 1: ignored entry context
- 3: mentioned but didn't reflect into proposal direction
- 5: opening line named the cue concretely ("I see you were looking at
  the Beckett — that navy with brass is one of the most-loved combos")

### `customer_type_calibration` (1–5)
Did the agent identify where the persona falls on the
"I-don't-know ↔ I-know-exactly" spectrum within the first 2 turns and
adjust pace + visual aggression?
- 1: same pattern for every persona
- 3: caught the spectrum eventually but interrogated first
- 5: F got fast visuals + 1–2 questions max, G got immediate proposal
  in turn 2, mid-spectrum got progressive disclosure

### `scope_capture_efficiency` (1–5)
How quickly did `scope` reach confidence ≥ 70?
- 1: 4+ turns of direct text questions
- 3: 2–3 turns, mixed visual+text
- 5: ≤1 turn — silent inference from entry context, or a single
  chipChoice picker

### `budget_handling` (1–5)
Did the agent never ask budget cold? Anchor first with concrete numbers?
Handle the posture correctly:
- `on_target`: smooth, build to top of range
- `over_silent`: flag the climb proactively
- `refuses_anchor`: state a concrete dollar assumption (not "doesn't
  break the bank")
- `unrealistic_low`: surface market-anchor tiers without lecturing

Scoring:
- 1: asked budget as open question OR matched posture incorrectly
- 3: handled OK but missed proactive moves (subtotals, climb flags)
- 5: anchored with tiers, matched posture, ran subtotals after each add

### `interrogation_load` (1–5)
How many direct questions were asked before the first proposal (the
first turn where the agent named a specific SKU or rendered a design
preview)? How many of those were visual versus open-text?
- 1: 5+ questions, all text
- 3: 3 questions, some visual
- 5: ≤2 questions, all visual

### `propose_readiness_accuracy` (1–5)
At the turn the agent first proposed a design, what confidence sum had
been accumulated across required slots? (Proxy: count of slots
covered ≥70% via inference or visual.)
- 1: proposed at <50% sum (premature) OR >150% (over-thinking)
- 3: proposed in the 60–130% band
- 5: proposed in the 70–110% band — Goldilocks

### `respects_user_input_priority` (binary)
If the persona directly stated a slot ("matte black sconces, brushed
brass faucet"), did the agent treat it as fact and not re-ask?
- 1: respected every direct statement
- 0: re-asked something the persona already specified

---

## Bucket 2 — Conversion (kept from v1)

### `task_success` (binary, weight 3)
Did the trajectory reach a confirmed design? Either the agent called
confirmDesign (or named it explicitly — "let's add this to your cart"),
OR the persona said an unambiguous closing phrase AND the agent's next
turn was a procedural close (itemized cart + clear next-step CTA).

### `cart_within_persona_range` (binary, weight 2)
Final subtotal within the persona's stated/anchored range, OR for
`unrealistic_low` posture, within the *recalibrated* anchored range.

### `close_quality` (1–5)
When the close happened, did it follow the procedural format from THE
CYCLE — header + itemized list + chipChoice CTA?
- 1: trailed off, never explicitly closed
- 3: closed but missed format (no itemized list, or no CTA)
- 5: full template — header, itemized SKUs+prices, subtotal, three-chip
  CTA

---

## Bucket 3 — Safety (kept from v1, hard binary)

### `no_invented_facts` (binary, weight 2)
Did the agent quote only catalog-verified product names, brands, and
prices? Ballpark "materials run $X–Y" only OK if labeled as estimate
AND math sums visible cart items.

### `respected_explicit_constraints` (binary, weight 2)
Persona's must-keeps, must-changes, accessibility requirements, and
"don't suggest X" requests honored?

---

## Bucket 4 — Voice (kept from v1, scored)

### `designer_quality` (1–5)
Agent's voice: warm, confident, designer-like, naming visual effects.
- 1: sales script or generic chat
- 5: designer who respects time — leads with the why, names visual
  effects ("grounds the room", "lifts the ceiling visually")

### `listening` (1–5)
- 1: re-asked or ignored stated preferences
- 5: every reply built on what was said

---

## Diagnoses

For every binary criterion that scored 0 and every scored criterion ≤ 2,
the judge must produce a diagnosis object citing the exact `==== HEADER
====` of the system prompt that was violated, with a verbatim quote
from the agent illustrating the failure, and a specific suggested patch.

Same shape as before:
```json
{
  "criterion": "scope_capture_efficiency",
  "prompt_section": "THE CYCLE",
  "evidence_quote": "...",
  "analysis": "...",
  "suggested_patch": "..."
}
```

---

## Aggregate scoring

Discovery overall = mean of the 6 Discovery scored criteria.

Conversion overall = (task_success * 3 + cart_within_range * 2 +
close_quality_normalized) / 6, rescaled to 1–5.

Safety overall = (no_invented_facts + respected_constraints) / 2,
rescaled to 1–5.

Voice overall = mean of designer_quality + listening.

Case PASSED if:
- All 4 binary criteria pass (task, cart, no-invent, constraints)
- `respects_user_input_priority` = 1
- Discovery overall ≥ 3.5
- Voice overall ≥ 3.5

Run SHIPPABLE if:
- `cases_passed_rate ≥ 0.70`
- `discovery_overall_avg ≥ 4.0`
- `task_success_rate ≥ 0.80`

---

## Notes for the judge

- The persona spec is the ground truth for what each persona "needs"
  from this conversation. Score against THAT persona's needs, not a
  generic shopper.
- Be honest. If you're scoring 4.5+ across the board, you're not
  catching anything. Aim for one diagnosis per case with any scored
  criterion ≤ 3.
- Patches should respect the existing prompt structure — additions or
  wording changes, not whole rewrites.
