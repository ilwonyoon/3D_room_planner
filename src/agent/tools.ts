/**
 * Anthropic tool-use schemas for the agent. The agent emits these as
 * tool_use blocks during a turn; the client receives them as SSE events
 * and applies them to the shared SlotState (for slot tools) or to the
 * scene/cart (for design tools, added in Day 5-6).
 *
 * Mirrors data/eval/slot-model.json so the agent and the dashboard stay
 * in sync. New tools go here; the api-server passes the list to Claude
 * verbatim.
 */

export const AGENT_TOOLS = [
  {
    name: 'proposeChipChoice',
    description:
      "Surface a row of short label chips for a quick decision. Use when the shopper " +
      "has 2-5 options and you'd ask 'which of these'. The chips appear inline beneath " +
      "your text message; tapping one sends the chosen label back to you as the user's " +
      "next turn. Don't include 'Other' — the input box covers that.",
    input_schema: {
      type: 'object',
      required: ['question', 'options'],
      properties: {
        question: { type: 'string', description: 'Short framing question above the chips.' },
        options: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: { type: 'string' },
          description: 'The chip labels (short, 1-3 words each).',
        },
        slot_hint: {
          type: 'string',
          description: 'Optional slot id this picker is helping fill — used by the dashboard.',
        },
      },
    },
  },
  {
    name: 'proposeImageChoice',
    description:
      "Surface a small image grid (2-5 cards) for visual selection — typically a style " +
      "mood board or three design-tier options. Each card has a label, a one-line blurb, " +
      "and an image URL. Use when text descriptions of style are weaker than showing it.",
    input_schema: {
      type: 'object',
      required: ['question', 'options'],
      properties: {
        question: { type: 'string' },
        options: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['id', 'label'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              blurb: { type: 'string' },
              image_url: { type: 'string' },
            },
          },
        },
        slot_hint: { type: 'string' },
      },
    },
  },
  {
    name: 'proposeProductGrid',
    description:
      "Surface 2-4 concrete catalog products as cards. Pull names + prices verbatim from " +
      "the catalog. Use when proposing alternatives, pairings, or the final design set.",
    input_schema: {
      type: 'object',
      required: ['products'],
      properties: {
        intro: { type: 'string', description: 'Optional one-line framing.' },
        products: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            required: ['id', 'name', 'price_cents'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              brand: { type: 'string' },
              category: { type: 'string' },
              price_cents: { type: 'integer' },
              image_url: { type: 'string' },
              reason: { type: 'string', description: 'Designer rationale, one sentence.' },
            },
          },
        },
      },
    },
  },
  {
    name: 'updateSceneSlot',
    description:
      "Place or swap a product into the 3D room scene. Each scene slot (vanity, mirror, " +
      "faucet, toilet, bathtub, shower, tile_floor, tile_wall, lighting) holds at most one " +
      "product. Calling this with a productId from the catalog renders it in the room and " +
      "adds it to the cart. Use the catalog's brand+name+price verbatim.",
    input_schema: {
      type: 'object',
      required: ['slot', 'product_id'],
      properties: {
        slot: {
          type: 'string',
          enum: [
            'vanity', 'mirror', 'faucet', 'toilet', 'bathtub', 'shower',
            'tile_floor', 'tile_wall', 'lighting', 'paint_wall', 'accessory',
          ],
        },
        product_id: { type: 'string' },
        reason: { type: 'string', description: 'Designer rationale, one sentence.' },
      },
    },
  },
  {
    name: 'updateSlotConfidence',
    description:
      "Record what you now know (or now infer) about one slot in the project dashboard. " +
      "Call this whenever a new user message, a behavioral cue, or your own reasoning " +
      "produces a confidence change. The UI renders this immediately so the shopper sees " +
      "the project filling in as they talk to you. See data/eval/slot-model.json for the " +
      "full slot list and accepted values.",
    input_schema: {
      type: 'object',
      required: ['slot', 'confidence'],
      properties: {
        slot: {
          type: 'string',
          enum: [
            'scope',
            'style_direction',
            'room_size',
            'budget_range',
            'must_keep',
            'must_change',
            'persona_traits',
            'trigger',
            'lifestyle',
            'taste_signals',
            'budget_posture',
            'decision_speed',
          ],
          description: 'Which slot to update.',
        },
        value: {
          description:
            'New value. Shape depends on slot kind: single_choice → string from options; ' +
            "multi_choice → array of strings; range → { low, high } in dollars; list → " +
            'array of strings; aggregate → free-form object.',
        },
        confidence: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          description:
            'Your confidence in this value (0-100). User-stated facts → 85-95. ' +
            'Strong inference from explicit cue → 60-80. Inferred from indirect signal → 30-50.',
        },
        evidence: {
          type: 'string',
          description:
            'Short verbatim quote from the shopper or short explanation of how you arrived ' +
            'at this. Shown in the dashboard so the user can correct.',
        },
      },
    },
  },
] as const

export type AgentToolName = (typeof AGENT_TOOLS)[number]['name']

export type ToolUseEvent = {
  type: 'tool_use'
  id: string
  name: AgentToolName
  input: Record<string, unknown>
}
