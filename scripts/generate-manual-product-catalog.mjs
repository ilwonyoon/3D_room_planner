import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const candidatesPath = join(ROOT, 'raw/assets/models/manual/catalog-candidates.json')
const runtimeRoot = join(ROOT, 'public/assets/models/manual')
const outputPath = join(ROOT, 'src/constants/manualProductCatalog.generated.ts')

const categories = ['sofa', 'chair', 'table', 'storage', 'bed', 'lighting', 'decor', 'pets']

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function retailAlias(item) {
  return {
    brand: item.brand || item.author || titleCase(item.source),
    name: item.productName || titleCase(item.assetId),
  }
}

if (!existsSync(candidatesPath)) {
  throw new Error(`${candidatesPath} does not exist. Run pnpm assets:import-manual first.`)
}

const candidates = readJson(candidatesPath).filter((item) =>
  existsSync(join(runtimeRoot, `${item.assetId}.optimized.glb`)),
)

const byCategory = Object.fromEntries(categories.map((category) => [category, []]))

for (const item of candidates) {
  const category = categories.includes(item.category) ? item.category : 'decor'
  byCategory[category].push({
    id: item.assetId,
    source: 'manual',
    dimensionsCm: item.dimensionsCm,
  })
}

for (const seeds of Object.values(byCategory)) {
  seeds.sort((a, b) => a.id.localeCompare(b.id))
}

const aliases = Object.fromEntries(
  [...candidates]
    .sort((a, b) => a.assetId.localeCompare(b.assetId))
    .map((item) => [item.assetId, retailAlias(item)]),
)

const content = `import type { ProductCatalogSeed, ProductCategory, ProductRetailAlias } from './productCatalog'

// Generated from raw/assets/models/manual/catalog-candidates.json.
// Only assets with public/assets/models/manual/*.optimized.glb are included.
export const manualModelSeedsByCategory: Partial<Record<ProductCategory, ProductCatalogSeed[]>> = ${JSON.stringify(
  byCategory,
  null,
  2,
)}

export const manualRetailAliasById: Record<string, ProductRetailAlias> = ${JSON.stringify(
  aliases,
  null,
  2,
)}
`

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, content)
console.log(`Generated ${outputPath} with ${candidates.length} manual product aliases.`)
