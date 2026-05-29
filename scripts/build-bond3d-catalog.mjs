/**
 * One-shot snapshot builder for Bond-3d (agent's product catalog).
 *
 * Pulls real products from the usedemo catalog API, HEAD-checks every image
 * URL for liveness (the CDN 503s on dead PNGs without flagging them), and
 * writes a flat array snapshot to data/catalog.json. Bond-3d's RAG reads
 * that file directly — re-run this whenever you want to refresh.
 *
 *   node scripts/build-bond3d-catalog.mjs
 *
 * Bond-3d's catalog schema (consumed by scripts/rag.mjs + proposeProductGrid):
 *
 *   { id, name, brand, category, categoryId, retailer, retailerId,
 *     price_cents, sale_price_cents, our_price_cents,
 *     availability, lead_time_days, image_url }
 *
 * Differs from Bond proto2's snapshot in three ways:
 *   1. Flat array, not slot-keyed (RAG groups by category itself).
 *   2. Prices in cents (Bond-3d convention), not whole dollars.
 *   3. PER_CATEGORY is 25 (proto2 uses 10 per slot) — gives the agent a
 *      wider organic pool to recommend from for golden-path demo flows.
 *
 * Categories selected to cover the bathroom design space the agent can
 * propose: every Z-model "scope" the user might choose (single piece,
 * partial zone, full reno) maps to at least one of these buckets.
 */

const API = 'https://api.usedemo.io/catalog/v3/products?perPage=8000'
const PER_CATEGORY = 25
const OUT = new URL('../data/catalog.json', import.meta.url)

/**
 * usedemo category.name → keep in our catalog. Order matters only for log
 * readability. Each one yields up to PER_CATEGORY SKUs.
 */
const CATEGORIES = [
  'Vanities',
  'Faucets',
  'Mirror',
  'Decorative Lighting',
  'Shower Systems',
  'Tubs',
  'Toilet',
  'Tile',
  'Towel Bars',
  'Toilet Paper Holders',
]

const PREFERRED_RETAILER = "Lowe's Demo"
const MAX_PER_FAMILY = 4 // wider than proto2's 2 — we have 25 per cat to fill

/**
 * 1-byte ranged GET — the CDN returns 503 to HEAD even for files that
 * exist, but 200/206 reliably for live ones. Cheap; we run it in batches.
 */
async function imageOk(url) {
  if (!url) return false
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' } })
    return r.status === 200 || r.status === 206
  } catch {
    return false
  }
}

/**
 * "Miranda 30-in Dark Blue Vanity by Wyndham" → "miranda". Used to cap how
 * many color/size variants of one model land in a single category so the grid
 * looks varied instead of "12 Miranda vanities in a row".
 */
function modelKey(raw) {
  const name = (raw.name ?? '').trim()
  const beforeSize = name.split(/\s+\d+[- ]?in\b/i)[0]
  return (beforeSize || raw.productFamilyName || name).toLowerCase().trim()
}

/**
 * Pick up to `limit` products with a live image. Retailer-preferred first,
 * de-duped by name + image + family.
 */
async function pickWithLiveImages(pool, limit) {
  const preferred = pool.filter((p) => p.preferredRetailer?.name === PREFERRED_RETAILER)
  const rest = pool.filter((p) => p.preferredRetailer?.name !== PREFERRED_RETAILER)
  const ordered = [...preferred, ...rest]

  const picked = []
  const seenNames = new Set()
  const seenImages = new Set()
  const familyCount = new Map()
  const overflow = []

  const BATCH = 8
  for (let i = 0; i < ordered.length && picked.length < limit; i += BATCH) {
    const batch = ordered.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (product) => ({ product, ok: await imageOk(product.featuredImage?.url) })),
    )
    for (const { product, ok } of results) {
      if (!ok || picked.length >= limit) continue
      const name = product.name ?? ''
      const img = product.featuredImage?.url ?? ''
      if (seenNames.has(name) || seenImages.has(img)) continue
      const family = modelKey(product)
      if ((familyCount.get(family) ?? 0) >= MAX_PER_FAMILY) {
        overflow.push(product)
        continue
      }
      picked.push(product)
      seenNames.add(name)
      seenImages.add(img)
      familyCount.set(family, (familyCount.get(family) ?? 0) + 1)
    }
  }

  // Top up from family-overflow (still live, image-verified) if a small pool
  // can't fill `limit` under the cap.
  for (const product of overflow) {
    if (picked.length >= limit) break
    const img = product.featuredImage?.url ?? ''
    if (seenNames.has(product.name) || seenImages.has(img)) continue
    picked.push(product)
    seenNames.add(product.name)
    seenImages.add(img)
  }
  return picked
}

/**
 * Lead time / availability are not in the API payload. We synthesize them
 * deterministically (seeded by id) so a product always shows the same
 * numbers across runs.
 */
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function syntheticAvailability(id) {
  const h = hash(id)
  // 85% IN_STOCK, 12% LOW_STOCK, 3% BACKORDER — matches the kind of
  // distribution a real retail catalog has on any given day.
  const r = h % 100
  if (r < 85) return 'IN_STOCK'
  if (r < 97) return 'LOW_STOCK'
  return 'BACKORDER'
}

function syntheticLeadTime(id, category) {
  const h = hash(id + category) >>> 4
  // Most everyday SKUs ship in 2-7 days; tile / large items can stretch.
  const slow = ['Tile', 'Tubs', 'Vanities'].includes(category)
  return slow ? 3 + (h % 10) : 1 + (h % 6) // 3..12 or 1..6
}

function toBond3dRow(raw, categoryHint) {
  const priceCents = raw.price ?? 0
  const saleCents = raw.salePrice ?? raw.ourPrice ?? raw.price ?? 0
  const ourCents = raw.ourPrice ?? raw.salePrice ?? raw.price ?? 0
  const category = raw.category?.name ?? categoryHint ?? ''
  return {
    id: raw.id,
    name: raw.name,
    brand: raw.productFamilyName ?? raw.preferredRetailer?.name ?? "Lowe's",
    category,
    categoryId: raw.category?.id ?? '',
    retailer: raw.preferredRetailer?.name ?? '',
    retailerId: raw.preferredRetailer?.id ?? '',
    price_cents: priceCents,
    sale_price_cents: saleCents,
    our_price_cents: ourCents,
    availability: syntheticAvailability(raw.id),
    lead_time_days: syntheticLeadTime(raw.id, category),
    image_url: raw.featuredImage?.url ?? '',
  }
}

async function main() {
  process.stdout.write(`Fetching catalog… `)
  const res = await fetch(API)
  if (!res.ok) throw new Error(`catalog fetch failed: HTTP ${res.status}`)
  const { data } = await res.json()
  console.log(`${data.length} products`)

  const byCategory = new Map()
  for (const p of data) {
    const c = p.category?.name
    if (!c) continue
    if (!byCategory.has(c)) byCategory.set(c, [])
    byCategory.get(c).push(p)
  }

  const all = []
  for (const cat of CATEGORIES) {
    const pool = byCategory.get(cat) ?? []
    const picked = await pickWithLiveImages(pool, PER_CATEGORY)
    const rows = picked.map((p) => toBond3dRow(p, cat))
    all.push(...rows)
    console.log(`  ${cat.padEnd(24)} ${rows.length}/${PER_CATEGORY}  (pool ${pool.length})`)
  }

  const { writeFileSync } = await import('node:fs')
  writeFileSync(OUT, JSON.stringify(all, null, 2) + '\n')
  console.log(`\nWrote ${OUT.pathname}`)
  console.log(`Total SKUs: ${all.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
