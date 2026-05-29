import { useMemo } from 'react'

/**
 * Day 6 minimum: a symbolic room visualization that fills in as the agent
 * calls updateSceneSlot. NOT a real 3D scene — the demo's hero moment is the
 * dashboard + chat lockstep, not photoreal rendering. This panel uses the
 * existing /proto2/room-3d.png hero image as a backdrop and overlays the
 * cart contents as a stacked product strip beneath it. When time allows,
 * the 3D_room_planner repo can replace this without changing the data shape.
 *
 * The agent's updateSceneSlot tool calls land in `sceneState` (slot →
 * { productId, brand, name, price_cents, reason }). The panel renders:
 *   - the room hero image
 *   - a compact product strip showing each filled slot
 *   - a subtotal pill
 */

export type SceneSlot = {
  readonly productId: string
  readonly brand?: string
  readonly name: string
  readonly price_cents: number
  readonly image_url?: string
  readonly reason?: string
}

export type SceneState = Record<string, SceneSlot | undefined>

const SLOT_ORDER: readonly string[] = [
  'vanity', 'mirror', 'faucet', 'lighting',
  'tile_wall', 'tile_floor', 'paint_wall',
  'bathtub', 'shower', 'toilet', 'accessory',
]

// Approximate screen-coordinate anchors for each slot, calibrated to
// /proto2/room-3d.png. Values are percentages of the displayed image box.
// These overlay floating cards in the right region as slots fill — a
// stand-in for live 3D until 3D_room_planner is integrated.
const SLOT_ANCHORS: Record<string, { top: string; left: string }> = {
  vanity:     { top: '64%', left: '78%' },
  mirror:     { top: '32%', left: '78%' },
  faucet:     { top: '55%', left: '76%' },
  lighting:   { top: '15%', left: '78%' },
  tile_wall:  { top: '35%', left: '40%' },
  tile_floor: { top: '88%', left: '50%' },
  paint_wall: { top: '20%', left: '15%' },
  bathtub:    { top: '70%', left: '28%' },
  shower:     { top: '30%', left: '28%' },
  toilet:     { top: '70%', left: '50%' },
  accessory:  { top: '50%', left: '60%' },
}

type Props = {
  readonly state: SceneState
}

export function RoomScenePanel({ state }: Props) {
  const slots = useMemo(
    () => SLOT_ORDER.map((id) => ({ id, value: state[id] })).filter((s) => s.value),
    [state],
  )
  const subtotal = useMemo(
    () => slots.reduce((acc, s) => acc + (s.value?.price_cents ?? 0), 0),
    [slots],
  )
  const isEmpty = slots.length === 0

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[var(--color-surface-sunken)]"
      aria-label="Room scene"
    >
      {/* Hero image area — placeholder room visual.
          Will swap to live 3D_room_planner output later.
          Floating product markers overlay the image at hard-coded
          slot anchors (SLOT_ANCHORS) as the agent calls updateSceneSlot. */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden border-b border-[var(--color-border)] bg-[#f3f4f6]">
        <div className="relative inline-block max-h-full">
          <img
            src="/proto2/room-3d.png"
            alt="Bathroom room scene"
            className={`block max-h-[60vh] max-w-full object-contain transition-opacity duration-500 ${
              isEmpty ? 'opacity-40' : 'opacity-100'
            }`}
          />
          {slots.map((s) => {
            const anchor = SLOT_ANCHORS[s.id]
            if (!anchor || !s.value) return null
            return (
              <div
                key={s.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-[scene-pop_0.45s_ease-out]"
                style={{ top: anchor.top, left: anchor.left }}
                aria-hidden
              >
                {/* dot + product card */}
                <div className="relative flex items-start gap-1.5">
                  <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--color-lowes-blue)] shadow-[0_0_0_3px_rgba(255,255,255,0.8),0_0_0_5px_rgba(0,73,144,0.25)]" />
                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10.5px] shadow-sm">
                    <p className="font-bold leading-tight text-[var(--color-ink)] max-w-[140px] truncate">
                      {s.value.name.slice(0, 28)}{s.value.name.length > 28 ? '…' : ''}
                    </p>
                    <p className="text-[var(--color-muted)]">
                      ${(s.value.price_cents / 100).toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {isEmpty ? (
          <p className="pointer-events-none absolute text-caption text-[var(--color-muted)]">
            room renders as products are placed
          </p>
        ) : null}
      </div>

      {/* Cart strip — slots that have been filled */}
      <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[10.5px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
            Cart · {slots.length} item{slots.length === 1 ? '' : 's'}
          </span>
          <span className="text-callout font-extrabold text-[var(--color-ink)]">
            ${(subtotal / 100).toFixed(2)}
          </span>
        </div>
        {slots.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-0.5 pl-1 pr-2"
                title={s.value?.name}
              >
                {s.value?.image_url ? (
                  <img
                    src={s.value.image_url}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="h-5 w-5 rounded-full bg-[color-mix(in_srgb,var(--color-lowes-blue)_30%,white)]"
                    aria-hidden
                  />
                )}
                <span className="text-[11px] font-medium text-[var(--color-ink)]">
                  {s.id.replace(/_/g, ' ')}
                </span>
                <span className="text-[10.5px] text-[var(--color-muted)]">
                  ${((s.value?.price_cents ?? 0) / 100).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] italic text-[var(--color-muted)]">
            empty — agent will add items as you talk
          </p>
        )}
      </div>
    </section>
  )
}
