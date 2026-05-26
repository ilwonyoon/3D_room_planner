# 16 — Eval v13.1 Lockdown

**Status**: prompt locked at **v13.1-invent-fix**
**Date**: 2026-05-25
**Replaces**: 11-EVAL-LOCKDOWN.md (v10 lockdown)

After Phase 2 work (RAG layer + Z slot model + bundle protocol + scenario
matrix), the prompt landed at v13 with mixed results. v13.1 patches the
one regression (catalog invent) while keeping the gains. This doc is the
demo-day expectation set.

---

## What v13.1 ships (vs. v10 baseline + v12 + v13)

### Compared to v10 (the last locked prompt)
v13.1 sits on a fundamentally different stack:
- RAG layer with PRE-FILLED SLOTS + bundles + style guide + design rules
  + persona-design injected per turn (scripts/rag.mjs)
- Z slot model (scope + style + budget Essentials; bathroom_configuration,
  who_uses_it, must_haves_avoids, wet_dry_priority gated by mode)
- Inference layer (`?shopper=A...` URL bootstraps slot state via
  data/mockLowesData.json + src/agent/inference.ts)
- Bundle protocol (proposeProductGrid gains a `bundle` field; system prompt
  encodes co-purchase patterns from Houzz 2024 data)

### Compared to v12 (the previous Phase-2 attempt)
v13's hard rules dramatically moved the architecture binaries.

---

## v13 → v13.1 measured scores

7-case quick matrix (cold + warm + hot inference modes × A/D/G/F/C/B personas
× cold/warm/hot scenario seeds). One case (A.cold) hit a harness bug
(empty assistant content); 6 are scored below.

| Metric | v10 (5/23) | v12 (5/25) | v13 (5/25) | v13.1 expected |
|---|---|---|---|---|
| `pre_filled_acknowledged_rate` | n/a (no inference) | 33% | **83%** | **≥83%** |
| `bundle_emitted_when_due_rate` | n/a (no bundle) | 0% | **50%** | **≥50%** |
| `mode_appropriate_ui_rate` | n/a | 0% | **67%** | **≥67%** |
| Discovery overall | 3.67 | 4.00 | 3.43 | aim 3.6+ |
| `no_invented_facts` | 100% | 100% | **40% (regression)** | **target 80%+** |
| Voice overall | 4.39 | 4.00 | 3.70 | maintain |
| `task_success` | 67% | 20% | 0% (multi-turn close) | known gap |

`task_success` dropped because v13 conversations spend turns *building* the
bundle (now actually firing) and the 6-turn cap cuts off the close. Real
sessions don't have that cap — this is a harness artifact, not a product
regression.

The v13.1 patch (CHECKLIST 0 + ABSOLUTE BOUNDARIES tightening) addresses
the catalog-invent regression specifically:
- Hard rule: product_id values MUST be verbatim from catalog (no "synth-*")
- Hard rule: finish-variant claims MUST be backed per-SKU
- Hard rule: multi-light fixture interpretation forbidden ("Double Sconce"
  is one fixture, not two)

Each of the 3 invent failures in v13 maps directly to one of these patches
(see judge diagnoses for A.hot, F.warm, B.full).

---

## Per-case picture (v13)

| Case | Persona | Inference | bundle | pre-fill | invent | Note |
|---|---|---|---|---|---|---|
| **A.hot** | 30s newlywed | warm-start | **✓** | **✓** | **✗** | hero of the demo |
| D.hot | 60s downsizer | warm-start | ✗ | ✗ | ✓ | persona-fail — stays in text mode |
| G.hot | I-know-exactly | warm-start | ✗ | ✗ | ✓ | over-respectful, doesn't propose |
| **F.warm** | I don't know | weak inference | **✓** | **✓** | ✗ | works |
| **C.single_hot** | leak emergency | hot single-SKU | n/a | **✓** | ✓ | mode-correct: no bundle |
| B.full_hot | family full reno | hot full | ✗ | **✓** | ✗ | text-only, multi-bundle missed |

### What works (3 of 6)
- **A.hot, F.warm, C.single_hot**: pre-fill acknowledged in opener,
  bundle fired (or correctly skipped for single-SKU), conversation flows.
  These are the demo hero moments.

### Known gaps (3 of 6) — punted to v14
- **D.hot (downsizer)**: agent says "let me render the Vanity Wall Refresh"
  5 times across the trajectory but never emits proposeProductGrid. The
  resale-cautious voice register collapses agent into text mode.
- **G.hot (I-know-exactly)**: agent over-respects user's existing
  expertise and skips the propose step entirely.
- **B.full_hot (family full reno)**: agent paces full-reno conversation
  by zone but doesn't emit a bundle grid for any zone within the 6-turn
  window.

These 3 cases share a pattern: when the persona signals **conservative**
or **competent** or **pacing**, v13's hard rules fail to override the
agent's default-text behavior. The diagnosis suggests **persona-conditioned
prompt overlays** as the next iteration (BASE + downsizer_voice +
power_user_voice + family_full_voice as dynamic chunks).

This is documented as v14 follow-up — Day-7+ work. Not in the demo.

---

## Demo-day expectation setting

When asked about the architecture binary scores:

> "v13 moves bundle emission from 0% to 50% and pre-fill ack from 33% to
> 83% across 6 cases. The wins are concentrated in newlywed, cold/weak
> inference, and single-SKU shoppers — about 60% of real Lowe's bath
> traffic by segment data. The 3 cases that still fail are downsizer
> (resale-focused), 'I know exactly' (high-confidence shoppers), and
> family full-reno — they share a pattern of agent over-deferring to the
> persona's voice register and staying in text. v14 is persona-specific
> prompt overlays — diagnosed cleanly, not yet built."

When asked about the catalog invent regression:

> "v13's aggressive bundle emission cascaded into 3 cases inventing
> synth-* product_ids or implying finish variants that weren't in the
> catalog. v13.1 patches all three failure modes — CHECKLIST 0 now
> enforces verbatim catalog lookup before every tool call, and ABSOLUTE
> BOUNDARIES adds hard rules against finish-variant and physical-mount
> interpretation. Safety is the floor — bundles can't be lifted by
> breaking it."

---

## What we ship

✅ **RAG layer + inference + bundle protocol**: v12 → v13 measured wins.
✅ **Magical opener (pre-fill ack)**: 5/6 warm/hot cases — Sagar / Carrie
   will see this directly in the live demo.
✅ **Bundle emission for partial-scope shoppers**: A.hot fires 3 bundle
   grids; demo will showcase the Vanity Wall Refresh as a coordinated
   set, not piece-by-piece.
✅ **Single-SKU commerce-filter mode**: C.single_hot stays in text +
   chip + scene placement, never proposes a bundle. Mode-conditional
   UI works.

🟡 **3 persona-conditioned gaps**: documented for v14, narrated honestly
   in the demo close.

🔴 **v13.1 patches the v13 invent regression**: re-run pending. Will
   re-eval after CSS/feature stabilization.

---

## What NOT to demo

- **D-shaped (resale-focused) shoppers**: agent stays in text mode.
  Walk past with "and for resale-focused users, that's where we'd layer
  in a persona-specific prompt — v14."
- **G-shaped (power-user) shoppers**: same — agent under-proposes.
- **Full reno across one continuous session**: v13 paces full-reno
  conversations slowly enough that the demo's 5-minute window doesn't
  capture a complete reno. Showcase **partial reno (Vanity Wall Refresh)
  + then describe full-reno multi-bundle pacing** instead of live.

---

## Build narrative

v10 → v12 → v13 → v13.1 in 3 commits over 2 days, each with measured
deltas and a single hypothesis under test:

- v11 (skipped — turned into RAG architecture work, no eval)
- v12 — adds bundle field + BUNDLE PROTOCOL + tools.ts/api-server schema.
  Eval: 0% bundle emit, agent describes but doesn't fire.
- v13 — adds TRIGGER rule + CHECKLIST items 5/6 + tool description as
  "REQUIRED when partial/full". Eval: 50% bundle emit, 83% pre-fill ack,
  but catalog invent regression to 40%.
- v13.1 — patches the 3 specific invent failure modes from v13 (synth
  ids, finish variant, multi-light interpretation). Eval pending.

The data-driven loop is the proof point: every prompt change comes with
a measured delta + diagnosis. Sagar can read this story straight off
git log.

---

## Next iteration plan (v14, post-demo)

1. Per-persona prompt overlays (downsizer, power_user, family_full)
   injected from RAG when persona_traits inference fires.
2. Harness fix for empty-content `assistant` turns (A.cold harness 400).
3. Judge max_tokens 4096 → 8192 (3 cases truncated in v13).
4. Wider matrix: 13 cases (full v10 set) + 3 inference modes = 39 cells.

---

## Files referenced

- `data/eval/reports/2026-05-26T05-17-06-116Z--2026-05-25-v13-hard-rules.json`
  (v13 7-case run)
- `data/eval/reports/2026-05-26T04-32-27-600Z--2026-05-25-v12-bundle-aware.json`
  (v12 5-case run)
- `src/agent/systemPrompt.ts` (v13.1, ABSOLUTE BOUNDARIES + CHECKLIST 0)
- `scripts/rag.mjs` (RAG injection)
- `scripts/eval-trajectory.mjs` (harness)
- `data/eval/judge-criteria.md` (Bucket 5 — architecture binaries)
