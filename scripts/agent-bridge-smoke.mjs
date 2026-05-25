/**
 * Bridge smoke — runs the sceneBridge selection logic against the
 * real productCatalog so we know which stand-in mesh is picked for
 * each agent slot, and that the slot positions don't overlap.
 *
 * Run: `pnpm dev`-style — vite must be able to resolve the same
 * imports. We invoke through `vite-node` which devDeps already has
 * via @vitejs/plugin-react.
 *
 * For now, just do a static analysis: read productCatalog.ts source,
 * find the seed counts per category, and report which slots have
 * candidates. The actual runtime pick happens in the browser.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

function countSeedsByCategory() {
  const src = readFileSync(path.join(root, 'src/constants/productCatalog.ts'), 'utf8')
  const m = src.match(/baseModelSeedsByCategory[^{]*\{([\s\S]*?)\n\}/m)
  if (!m) throw new Error('Could not locate baseModelSeedsByCategory')
  const block = m[1]
  const cats = ['sofa', 'chair', 'table', 'storage', 'decor', 'lighting', 'rug', 'appliance', 'bed', 'pets']
  const counts = {}
  for (const c of cats) {
    const sec = block.match(new RegExp(`\\b${c}:\\s*\\[([\\s\\S]*?)\\n\\s*\\],`, 'm'))
    counts[c] = sec ? (sec[1].match(/\{\s*id:\s*'/g) || []).length : 0
  }
  return counts
}

const SLOT_TO_CATEGORIES = {
  vanity: ['storage', 'table'],
  mirror: ['decor'],
  faucet: ['decor'],
  lighting: ['lighting', 'decor'],
  bathtub: ['sofa', 'storage'],
  shower: ['storage'],
  toilet: ['chair'],
  accessory: ['decor'],
}

const SLOT_POSITION = {
  vanity: { x: 1.7, z: -1.6 },
  mirror: { x: 1.7, z: -2.2 },
  faucet: { x: 1.7, z: -1.0 },
  lighting: { x: 0, z: -2.4 },
  bathtub: { x: -1.8, z: 0.5 },
  shower: { x: -1.8, z: -1.4 },
  toilet: { x: 0.5, z: 1.5 },
  accessory: { x: 1.2, z: 1.5 },
}

function verifyNoSlotOverlap(minSeparationM = 0.3) {
  const entries = Object.entries(SLOT_POSITION)
  let closest = null
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, pa] = entries[i]
      const [b, pb] = entries[j]
      const dist = Math.hypot(pa.x - pb.x, pa.z - pb.z)
      if (!closest || dist < closest.dist) closest = { a, b, dist }
    }
  }
  return { ok: !closest || closest.dist >= minSeparationM, closest }
}

console.log('=== Bridge smoke ===\n')

console.log('1. Category counts (from baseModelSeedsByCategory):')
const counts = countSeedsByCategory()
for (const [c, n] of Object.entries(counts)) console.log(`   ${c.padEnd(10)} ${n}`)
console.log('')

console.log('2. Per-slot category match:')
let allOk = true
for (const [slot, cats] of Object.entries(SLOT_TO_CATEGORIES)) {
  const available = cats.find((c) => counts[c] > 0)
  const ok = !!available
  if (!ok) allOk = false
  console.log(
    `   ${slot.padEnd(10)} → categories [${cats.join(',')}]: ${
      ok ? `OK (${available}, ${counts[available]} candidates)` : 'NO MATCH'
    }`,
  )
}
console.log('')

console.log('3. Slot-position overlap check (min 0.3m separation):')
const overlap = verifyNoSlotOverlap(0.3)
console.log(
  `   ${overlap.ok ? 'OK' : 'FAIL'} — closest pair: ${
    overlap.closest ? `${overlap.closest.a} ↔ ${overlap.closest.b} (${overlap.closest.dist.toFixed(2)}m)` : 'n/a'
  }`,
)
console.log('')

const finalOk = allOk && overlap.ok
console.log(finalOk ? '✓ Bridge smoke PASSED' : '✗ Bridge smoke FAILED')
process.exit(finalOk ? 0 : 1)
