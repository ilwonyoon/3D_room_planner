import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const MANIFEST_PATH = path.join(ROOT, 'public/assets/render-asset-manifest.json')
const JSON_OUTPUT = path.join(ROOT, 'output/asset-runtime-budget.json')
const MD_OUTPUT = path.join(ROOT, 'docs/asset-runtime-budget.md')

const categoryBudgets = {
  storage: { maxRenderVertices: 80_000, maxTextureGpuBytes: 24 * 1024 * 1024 },
  window: { maxRenderVertices: 20_000, maxTextureGpuBytes: 12 * 1024 * 1024 },
  chair: { maxRenderVertices: 50_000, maxTextureGpuBytes: 24 * 1024 * 1024 },
  decor: { maxRenderVertices: 40_000, maxTextureGpuBytes: 16 * 1024 * 1024 },
  bed: { maxRenderVertices: 120_000, maxTextureGpuBytes: 24 * 1024 * 1024 },
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function assetIdFromPath(assetPath) {
  return path.basename(assetPath, '.optimized.glb')
}

function canonicalPath(assetPath) {
  return assetPath.replace('/assets/models-ktx2/', '/assets/models/')
}

function classifyCategory(assetPath) {
  const id = assetIdFromPath(assetPath).toLowerCase()
  const fullPath = assetPath.toLowerCase()

  if (fullPath.includes('/architectural/') && id.includes('door')) return null
  if (fullPath.includes('/architectural/') && id.includes('window')) return 'window'
  if (/(^|[-_])(bed|bunk|mattress)($|[-_])/.test(id)) return 'bed'
  if (/(cabinet|shel(?:f|ves)|bookshelf|drawer|commode|storage|nightstand|console)/.test(id)) return 'storage'
  if (/(chair|stool|armchair|lounge)/.test(id)) return 'chair'
  if (/(plant|vase|picture|frame|mirror|book|clock|dartboard|screen|planter)/.test(id)) return 'decor'

  return null
}

function budgetOverage(asset, budget) {
  const vertexOverage = asset.renderVertexCount / budget.maxRenderVertices
  const textureOverage = asset.textureGpuBytes / budget.maxTextureGpuBytes
  return Math.max(vertexOverage, textureOverage)
}

function optimizationScore(asset, category) {
  const budget = categoryBudgets[category]
  const overage = budgetOverage(asset, budget)
  const vertexScore = asset.renderVertexCount / 1_000
  const textureScore = asset.textureGpuBytes / (1024 * 1024)
  const transferScore = asset.bytes / (256 * 1024)

  return overage * 100 + vertexScore * 0.75 + textureScore * 1.5 + transferScore
}

function recommendedAction(asset, category) {
  const budget = categoryBudgets[category]
  const actions = []

  if (asset.renderVertexCount > budget.maxRenderVertices) {
    const targetRatio = Math.max(0.35, budget.maxRenderVertices / asset.renderVertexCount)
    actions.push(`create runtime mesh at about ${(targetRatio * 100).toFixed(0)}% vertices`)
  }

  if (asset.textureGpuBytes > budget.maxTextureGpuBytes) {
    actions.push('downsize or KTX2-compress support maps')
  }

  if (asset.textureCount > 6) {
    actions.push('audit duplicated or oversized texture set')
  }

  return actions.length > 0 ? actions.join('; ') : 'keep as monitored candidate'
}

function dedupeModels(models) {
  const byCanonicalPath = new Map()

  for (const model of models) {
    const key = canonicalPath(model.path)
    const current = byCanonicalPath.get(key)

    if (!current || (!model.path.includes('/models-ktx2/') && current.path.includes('/models-ktx2/'))) {
      byCanonicalPath.set(key, model)
    }
  }

  return [...byCanonicalPath.values()]
}

function buildReport(manifest) {
  const candidates = dedupeModels(manifest.models)
    .map((asset) => {
      const category = classifyCategory(asset.path)

      if (!category) {
        return null
      }

      const budget = categoryBudgets[category]
      const score = optimizationScore(asset, category)

      return {
        id: assetIdFromPath(asset.path),
        category,
        path: asset.path,
        renderVertexCount: asset.renderVertexCount,
        textureCount: asset.textureCount,
        textureGpuBytes: asset.textureGpuBytes,
        textureGpuSizeLabel: formatBytes(asset.textureGpuBytes),
        transferBytes: asset.bytes,
        transferSizeLabel: formatBytes(asset.bytes),
        budget,
        budgetOverage: Number(budgetOverage(asset, budget).toFixed(2)),
        score: Number(score.toFixed(2)),
        recommendedAction: recommendedAction(asset, category),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)

  const topByCategory = Object.fromEntries(
    Object.keys(categoryBudgets).map((category) => [
      category,
      candidates.filter((asset) => asset.category === category).slice(0, 8),
    ]),
  )

  const topOverall = candidates.slice(0, 20)

  return {
    generatedAt: new Date().toISOString(),
    sourceManifest: path.relative(ROOT, MANIFEST_PATH),
    budgets: categoryBudgets,
    topOverall,
    topByCategory,
  }
}

function markdownTable(rows) {
  return [
    '| Category | Asset | Vertices | Textures | GPU texture | Transfer | Overage | Action |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows.map(
      (row) =>
        `| ${row.category} | \`${row.path}\` | ${row.renderVertexCount.toLocaleString()} | ${row.textureCount} | ${row.textureGpuSizeLabel} | ${row.transferSizeLabel} | ${row.budgetOverage}x | ${row.recommendedAction} |`,
    ),
  ].join('\n')
}

function writeMarkdown(report) {
  const categorySections = Object.entries(report.topByCategory)
    .map(([category, rows]) => {
      const budget = report.budgets[category]

      return `## ${category}

Budget:

- render vertices: ${budget.maxRenderVertices.toLocaleString()}
- texture GPU: ${formatBytes(budget.maxTextureGpuBytes)}

${rows.length > 0 ? markdownTable(rows) : 'No candidates found.'}
`
    })
    .join('\n')

  const body = `# Asset Runtime Budget Audit

Generated: ${report.generatedAt}

Source manifest: \`${report.sourceManifest}\`

This report supports Phase 3 of \`docs/21-runtime-asset-optimization-plan.md\`. It ranks assets that should get runtime-lite variants first. It does not rewrite any GLB.

## Top Candidates

${markdownTable(report.topOverall)}

${categorySections}
`

  mkdirSync(path.dirname(MD_OUTPUT), { recursive: true })
  writeFileSync(MD_OUTPUT, body)
}

if (!existsSync(MANIFEST_PATH)) {
  throw new Error(`Missing ${path.relative(ROOT, MANIFEST_PATH)}. Run pnpm assets:audit-render first.`)
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const report = buildReport(manifest)

mkdirSync(path.dirname(JSON_OUTPUT), { recursive: true })
writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`)
writeMarkdown(report)

console.log(`Wrote ${path.relative(ROOT, JSON_OUTPUT)} and ${path.relative(ROOT, MD_OUTPUT)}.`)
