/**
 * Verify the 8 bathroom GLBs the demo expects, dropped into
 * public/assets/models/bathroom/. Run after you've generated and
 * downloaded the assets from Rodin / Meshy.
 *
 * Checks per file:
 *   - present and readable
 *   - non-zero size (≥ 1 KB; broken downloads tend to be tiny)
 *   - valid GLB magic bytes ("glTF" at offset 0)
 *
 * Run: `pnpm verify:bathroom-glbs`
 * Exits 0 if all 8 are valid, 1 otherwise.
 *
 * See docs/bond-demo/13-BATHROOM-ASSETS.md for the manifest + the
 * generation prompts the filenames below assume.
 */
import { readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const baseDir = path.join(root, 'public/assets/models/bathroom')

const EXPECTED = [
  { slot: 'vanity', file: 'vanity_36in_modern_white.glb' },
  { slot: 'mirror', file: 'mirror_rect_blackframe.glb' },
  { slot: 'faucet', file: 'faucet_widespread_matteblack.glb' },
  { slot: 'lighting', file: 'sconce_brass_opal.glb' },
  { slot: 'bathtub', file: 'tub_freestanding_oval_white.glb' },
  { slot: 'shower', file: 'shower_walkin_enclosure.glb' },
  { slot: 'toilet', file: 'toilet_wallmount_white.glb' },
  { slot: 'accessory', file: 'towelbar_brushed_nickel.glb' },
]

const GLB_MAGIC = Buffer.from([0x67, 0x6c, 0x54, 0x46]) // "glTF"

function check(file) {
  const full = path.join(baseDir, file)
  if (!existsSync(full)) return { ok: false, reason: 'MISSING' }
  const stat = statSync(full)
  if (stat.size < 1024) return { ok: false, reason: `TOO_SMALL (${stat.size}B)` }
  const head = readFileSync(full).slice(0, 4)
  if (!head.equals(GLB_MAGIC)) return { ok: false, reason: 'BAD_MAGIC' }
  return { ok: true, sizeKB: Math.round(stat.size / 1024) }
}

console.log(`Verifying ${EXPECTED.length} bathroom GLBs in ${baseDir}\n`)

let failed = 0
for (const { slot, file } of EXPECTED) {
  const r = check(file)
  if (r.ok) {
    console.log(`  ✓ ${slot.padEnd(10)} ${file} (${r.sizeKB} KB)`)
  } else {
    failed++
    console.log(`  ✗ ${slot.padEnd(10)} ${file} — ${r.reason}`)
  }
}
console.log('')

if (failed === 0) {
  console.log(`✓ All ${EXPECTED.length} bathroom GLBs valid — ready to integrate.`)
  console.log('  Next: update sceneBridge.ts per docs/bond-demo/13-BATHROOM-ASSETS.md §"Integration steps".')
  process.exit(0)
} else {
  console.log(`✗ ${failed}/${EXPECTED.length} missing or invalid.`)
  console.log('  See docs/bond-demo/13-BATHROOM-ASSETS.md for the generation prompts.')
  console.log('  The demo still runs with category-stand-ins for missing slots — partial drops are graceful.')
  process.exit(1)
}
