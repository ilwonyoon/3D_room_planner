/**
 * Top-down line-drawing sprites for the 4 bathroom configuration
 * options. Pure SVG, no external assets — the goal is *clarity of
 * fixture layout*, not photorealism. A 40-60-yr shopper should be able
 * to glance at the sprite and immediately recognize their own
 * bathroom shape.
 *
 * The viewBox is 100x100 with a 4px padding margin; all rooms are
 * normalized to fit the same bounding box even though they're
 * different physical sizes — visual comparability beats scale fidelity
 * for picker cards.
 *
 * Used by SlotConfidencePanel's bathroom_configuration editor.
 */

type Props = {
  readonly config: 'powder' | 'three_quarter' | 'full_bath' | 'primary'
  readonly active?: boolean
}

const STROKE = 'currentColor'

export function BathroomConfigSprite({ config, active = false }: Props) {
  const color = active ? 'var(--color-lowes-blue)' : 'var(--color-muted)'
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden
      style={{ color }}
      strokeWidth={1.8}
      stroke={STROKE}
      fill="none"
    >
      {/* Room outline — same for every config so the comparison is
          clear; only fixtures inside change. */}
      <rect x="4" y="4" width="92" height="92" rx="3" />
      {config === 'powder' ? <PowderFixtures /> : null}
      {config === 'three_quarter' ? <ThreeQuarterFixtures /> : null}
      {config === 'full_bath' ? <FullBathFixtures /> : null}
      {config === 'primary' ? <PrimaryFixtures /> : null}
    </svg>
  )
}

/** Powder room: toilet + sink. Two fixtures, lots of negative space. */
function PowderFixtures() {
  return (
    <g>
      {/* Sink (left wall, top half) */}
      <rect x="8" y="20" width="22" height="14" rx="1.5" />
      <circle cx="19" cy="27" r="2.5" />
      {/* Toilet (right wall, bottom half) */}
      <rect x="70" y="62" width="20" height="22" rx="2" />
      <ellipse cx="80" cy="76" rx="7" ry="9" fill="white" />
    </g>
  )
}

/** Three-quarter: toilet + sink + shower (no tub). */
function ThreeQuarterFixtures() {
  return (
    <g>
      {/* Sink (left wall) */}
      <rect x="8" y="14" width="20" height="14" rx="1.5" />
      <circle cx="18" cy="21" r="2.5" />
      {/* Toilet (left wall, below sink) */}
      <rect x="8" y="50" width="18" height="20" rx="2" />
      <ellipse cx="17" cy="62" rx="6" ry="8" fill="white" />
      {/* Shower (right wall, full height — square enclosure) */}
      <rect x="58" y="14" width="34" height="72" rx="1.5" />
      <line x1="60" y1="80" x2="90" y2="20" />
      <circle cx="74" cy="20" r="2" fill={STROKE} />
    </g>
  )
}

/** Full bath: toilet + sink + tub. Common US starter-home bath. */
function FullBathFixtures() {
  return (
    <g>
      {/* Sink (left wall, top) */}
      <rect x="8" y="14" width="22" height="14" rx="1.5" />
      <circle cx="19" cy="21" r="2.5" />
      {/* Toilet (left wall, middle) */}
      <rect x="8" y="44" width="18" height="20" rx="2" />
      <ellipse cx="17" cy="56" rx="6" ry="8" fill="white" />
      {/* Tub (right wall, full length) */}
      <rect x="48" y="14" width="44" height="32" rx="3" />
      <rect x="52" y="17" width="36" height="26" rx="2.5" fill="white" />
      {/* Shower head over tub */}
      <circle cx="89" cy="30" r="1.5" fill={STROKE} />
    </g>
  )
}

/** Primary: separate tub + walk-in shower + double sink. */
function PrimaryFixtures() {
  return (
    <g>
      {/* Double vanity (top, full width) */}
      <rect x="8" y="8" width="84" height="16" rx="1.5" />
      <circle cx="28" cy="16" r="2.5" />
      <circle cx="72" cy="16" r="2.5" />
      {/* Toilet (left wall, mid) */}
      <rect x="8" y="40" width="18" height="20" rx="2" />
      <ellipse cx="17" cy="52" rx="6" ry="8" fill="white" />
      {/* Tub (bottom-right, freestanding oval) */}
      <ellipse cx="74" cy="80" rx="18" ry="10" />
      {/* Walk-in shower (bottom-left next to toilet) */}
      <rect x="34" y="62" width="28" height="28" rx="1.5" />
      <line x1="36" y1="88" x2="60" y2="64" />
      <circle cx="48" cy="64" r="1.7" fill={STROKE} />
    </g>
  )
}
