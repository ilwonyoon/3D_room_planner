// Headless smoke for sceneBridge — runs the bridge selection logic against
// the actual compiled productCatalog so we know which stand-in mesh would
// be picked for each agent slot.
//
// Run: `pnpm exec node --import tsx scripts/agent-bridge-smoke.mjs`
// (tsx is bundled with playwright in devDeps, so it's already on disk.)
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(process.cwd())
process.chdir(root)

const { PRODUCT_CATALOG } = await import(pathToFileURL(path.join(root, 'src/constants/productCatalog.ts')).href)

const SLOT_TO_CATEGORY = {
  vanity: 'storage',
  mirror: 'decor',
  faucet: 'decor',
  lighting: 'lighting',
  bathtub: 'sofa',
  shower: 'storage',
  toilet: 'chair',
  accessory: 'decor',
}

console.log('PRODUCT_CATALOG total:', PRODUCT_CATALOG.length)
console.log('')
console.log('Per-slot stand-in selection (mirrors sceneBridge.pickStandIn):')
for (const [slot, category] of Object.entries(SLOT_TO_CATEGORY)) {
  const inCat = PRODUCT_CATALOG.filter((p) => p.category === category)
  const withUrl = inCat.find((p) => p.modelUrl)
  const fallback = inCat[0]
  const picked = withUrl || fallback || null
  console.log(
    `  ${slot.padEnd(10)} → ${category.padEnd(10)}: ${inCat.length} avail, ${
      inCat.filter((p) => p.modelUrl).length
    } w/url, picked=${picked ? picked.id : '<NONE>'} url=${picked?.modelUrl?.slice(0, 50) ?? '<no model>'}`,
  )
}
