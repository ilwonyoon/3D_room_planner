# 17 — Cold-open research: who speaks first + announcement anti-pattern

**Status**: research complete, applied as v13.3 + WelcomeCard.
**Date**: 2026-05-26.

After v13 eval showed bundle emission at 50% and v13.2 (ALWAYS-FIRST
SENTENCE rule) showed a regression — agent stuck in "Pulling the X
right now…" loops without ever firing `proposeProductGrid` — we
researched what intent-bounded shopping AIs actually do. Findings
informed v13.3 (act-first prompt) + the new `WelcomeCard` component.

---

## Key findings

### ✅ User instinct was right about cold open
- Intent-bounded chatbots SHOULD speak first.
- Microsoft Bot Framework + NN/G explicit guidance.
- Klarna AI, Amazon Rufus, Home Depot Magic Apron, Lowe's MyLo all greet.
- ChatGPT / Claude.ai don't, because intent is open-domain — different category.

### ❌ User instinct was wrong about every-turn announcement
- arXiv:2605.09252 (2026): forced reason-then-act preamble dropped Llama
  tool-call accuracy from 83.1% → 47.9%.
- arXiv:2604.02155: optimal pre-tool reasoning is 8-16 tokens; >256
  collapses below baseline.
- Our v13.2 measurement = exact documented failure mode.

### Vendor vs academic disagreement is real but contextual
- OpenAI / Anthropic recommend preambles for long-horizon coding agents.
- Academic literature warns against preambles for sub-second commerce
  turns where the tool output IS the answer.
- Bond = commerce, short turns → academic findings apply.

---

## Recommended pattern

### Cold open (once per session)
**Pattern C + D + G synthesis** (Amazon Rufus + Klarna + state strip):

```
[Context strip]    Designing around: Beckett 24-in Navy Vanity
[Greeting]         Let's build the rest of the bathroom around it.
[Chips]            [Just this piece] [Match the wall] [Full bathroom]
```

- Context strip names the entry — Amazon Rufus does this on PDPs.
- Greeting is scope-framing, NOT "How can I help?" (Microsoft anti-pattern).
- Chips teach the capability space + provide low-effort scope path.
- Rendered CLIENT-SIDE — no LLM call, no latency, no announce-without-act risk.

### Subsequent turns — act first, speak after
1. If user message maps to a tool → emit tool FIRST, no preamble.
2. Speak AFTER tool returns, summarizing RESULT not intent.
3. Status during tool execution → UI chrome (typing indicator, pulsing
   dot, `agent-shimmer` text), NOT assistant prose.
4. Multi-step turns may include one ≤15-word plan sentence — only if
   user is waiting >2s for a tool chain.
5. Clarifying questions → chip tools (`proposeChipChoice`), not prose.

### BANNED phrases in assistant prose
These are status, not conversation. Belong in UI chrome:
- "Pulling …" / "Let me pull …"
- "Let me see …" / "Let me check …"
- "Lining up …"
- "Generating …"
- "I'll grab / build / render …"
- "Right now …" (as commitment to next-turn action)
- "Hang on …"

Designer voice = act, then describe the result.
✅ "The Beckett anchors the wall in navy — the brass mirror picks it
   up at eye height."
❌ "Pulling the Beckett vanity wall set right now…"

---

## Implementation

### v13.3 prompt
- REMOVED ALWAYS-FIRST SENTENCE section.
- ADDED ACT FIRST, SPEAK AFTER section with banned-phrase list and
  result-vs-intent voice rule.
- `DEFAULT_PROMPT_VERSION = 2026-05-25-v13.3-act-first`.

### `WelcomeCard.tsx` (new client component)
Renders entry-aware cold open from `scenarios.ts` Scenario data.
4 entry surfaces:

| Entry | Context | Greeting | Chips |
|---|---|---|---|
| PDP | "Designing around: \<brand\> \<product\>" | "Let's build the rest of the bathroom around it." | Just this piece / Match the wall / Full bathroom |
| Global nav | "Starting fresh" | "Let's design your bathroom together." | Scope chips + style chips |
| Banner | "Spring Refresh" | "Looking for a budget-friendly refresh? Let me help." | Update zone / Hardware / Full reno |
| Cold (null) | (none) | "I'm Mylow — your AI bathroom designer. What are we working on?" | Single piece / Refresh one zone / Whole bathroom / Exploring |

Mounted inside `ChatThread` when `messages.length === 0`. Chip click
calls `onUserPick(chipLabel)` — same path as a regular user message,
which triggers the agent's first real turn.

### Seed removal
`chat.seed()` is no longer called for blank scenario. For scenario
entries (A-E), entry context is silent — it appears in the WelcomeCard
visually + still threads into RAG via slotState on the first chat call.
Agent does not speak first; user clicks a chip or types.

---

## Test plan

Pre-demo measurement targets (add to `lib/analytics.ts`):

- `cold_open_chip_clicked` — chip click rate at first turn. Target >40%.
- `agent_announcement_without_tool` — assistant turns where text contains
  banned phrases AND no tool was emitted within 2s. Target ≤2%.
- `time_to_first_tool_call` — p50 from user message → first tool. Target <800ms.
- Zero 5-turn "Pulling the X…" loops in pre-demo dry runs.

Re-run 7-case eval at v13.3 to confirm no regression on:
- bundle_emitted_when_due (v13 baseline: 50%)
- pre_filled_acknowledged (v13 baseline: 83%)
- mode_appropriate_ui (v13 baseline: 67%)
- no_invented_facts (v13.1 patch target: 80%+)

---

## Sources

- NN/G "10 Guidelines for Designing Your Site's AI Chatbots"
- Microsoft Bot Service "Design a bot's first user interaction"
- arXiv:2605.09252 "LLM Agents Already Know When to Call Tools"
- arXiv:2604.02155 "Brief Is Better: Non-Monotonic CoT Budget Effects"
- arXiv:2109.04137 Sun et al. "Fusing TOD + open-domain"
- Tyler 2018 review of Lowe's MyLo
- Klarna AI / Amazon Rufus / Home Depot Magic Apron press materials
- OpenAI GPT-5 prompting guide (tool preambles for long-horizon agents)
- Anthropic "Writing tools for agents"
- Smashing Magazine "Practical Interface Patterns For AI Transparency" (May 2026)

Full bibliography in research subagent transcript.
