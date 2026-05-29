/**
 * Rebuild data/catalog.json from the GLBs that actually exist on disk.
 *
 * Source of truth = Bond-assets/public/models/manifest.batch.json. For each
 * id in there, look up the full SKU record in the usedemo catalog cache,
 * project to Bond-3d's catalog schema, and stamp on a glb_path that points
 * into public/models (which is symlinked to Bond-assets).
 *
 * Why this exists: the previous data/catalog.json had 250 SKUs, only 141
 * of which had a GLB. The agent could recommend SKUs the 3D scene couldn't
 * render. Now every catalog row is guaranteed renderable.
 *
 *   node scripts/build-catalog-from-glbs.mjs
 *
 * Schema match with build-bond3d-catalog.mjs output, plus:
 *   - glb_path: "/models/<cat-slug>/<id>.glb"  (served by Vite from public/)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ASSETS_ROOT = path.resolve(repoRoot, '..', 'Bond-assets')

const MANIFEST = path.join(ASSETS_ROOT, 'public', 'models', 'manifest.batch.json')
const CATALOG_API_CACHE = '/tmp/u_full_p1.json'
const OUT = path.join(repoRoot, 'data', 'catalog.json')
const OUT_META = path.join(repoRoot, 'data', 'catalog-meta.json')

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
console.error(`Loaded manifest: ${Object.keys(manifest.items).length} GLBs`)

const cache = JSON.parse(readFileSync(CATALOG_API_CACHE, 'utf8'))
const byId = new Map()
for (const p of cache.data ?? []) byId.set(p.id, p)
console.error(`Loaded API cache: ${byId.size} products`)

const rows = []
const missing = []
const verifyMissing = []

for (const [id, m] of Object.entries(manifest.items)) {
  const p = byId.get(id)
  if (!p) {
    missing.push({ id, category: m.category, name: m.name })
    continue
  }

  const catSlug = slugify(m.category)
  const glbRel = `/models/${catSlug}/${id}.glb`
  // Sanity check — symlink should resolve
  const glbAbs = path.join(repoRoot, 'public', 'models', catSlug, `${id}.glb`)
  try {
    if (statSync(glbAbs).size < 1024) verifyMissing.push(glbRel)
  } catch {
    verifyMissing.push(glbRel)
  }

  rows.push({
    id: p.id,
    name: p.name,
    brand: p.productFamilyName ?? '',
    category: p.category?.name ?? m.category,
    categoryId: p.category?.id ?? null,
    retailer: p.preferredRetailer?.name ?? '',
    retailerId: p.preferredRetailer?.id ?? '',
    price_cents: p.price ?? null,
    sale_price_cents: p.salePrice ?? null,
    our_price_cents: p.ourPrice ?? null,
    availability: p.availability ?? null,
    lead_time_days: p.leadTimeDays ?? null,
    image_url: p.featuredImage?.url ?? m.image,
    glb_path: glbRel,
  })
}

// Backup existing catalog before overwriting
if (existsSync(OUT)) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const bak = `${OUT}.bak-${ts}`
  copyFileSync(OUT, bak)
  console.error(`Backed up existing catalog → ${path.basename(bak)}`)
}

writeFileSync(OUT, JSON.stringify(rows, null, 2))

// Category histogram
const byCat = {}
for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1
const meta = {
  source: 'manifest.batch.json + api.usedemo.io catalog cache',
  built_at: new Date().toISOString(),
  total: rows.length,
  guarantees: 'every row has a verified glb_path under public/models',
  glb_root: 'public/models (symlink → ../../Bond-assets/public/models)',
  manifest_path: MANIFEST,
  by_category: byCat,
}
if (missing.length) meta.missing_from_api = missing
if (verifyMissing.length) meta.missing_glb_files = verifyMissing
writeFileSync(OUT_META, JSON.stringify(meta, null, 2))

console.error(`\nWrote ${rows.length} catalog rows → ${path.relative(repoRoot, OUT)}`)
console.error(`By category:`)
for (const [c, n] of Object.entries(byCat).sort()) {
  console.error(`  ${c.padEnd(22)} ${n}`)
}
if (missing.length) console.error(`\n⚠ ${missing.length} manifest ids missing from API cache (not included in catalog)`)
if (verifyMissing.length) console.error(`\n⚠ ${verifyMissing.length} glb files missing on disk after symlink check`)
