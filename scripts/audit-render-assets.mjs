import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const PUBLIC_DIR = path.join(ROOT, 'public')
const DOCS_DIR = path.join(ROOT, 'docs')
const MODEL_ROOTS = ['assets/models', 'assets/models-ktx2']
const JSON_OUTPUT = path.join(PUBLIC_DIR, 'assets/render-asset-manifest.json')
const MD_OUTPUT = path.join(DOCS_DIR, 'render-asset-audit.md')

function walkGlbFiles(directory) {
  if (!existsSync(directory)) return []

  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkGlbFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.glb')) {
      files.push(entryPath)
    }
  }

  return files
}

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += char
    }
  }

  values.push(value)
  return values
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '')
}

function parseInspectCsv(output) {
  const sections = new Map()
  let section = null
  let header = null

  for (const rawLine of output.split('\n')) {
    const line = stripAnsi(rawLine).trim()

    if (['OVERVIEW', 'SCENES', 'MESHES', 'MATERIALS', 'TEXTURES', 'ANIMATIONS'].includes(line)) {
      section = line
      header = null
      sections.set(section, [])
      continue
    }

    if (!section || !line || line.startsWith('─') || line.startsWith('No ')) {
      continue
    }

    if (!header) {
      header = parseCsvLine(line)
      continue
    }

    const values = parseCsvLine(line)
    const row = {}

    for (let index = 0; index < header.length; index += 1) {
      row[header[index]] = values[index] ?? ''
    }

    sections.get(section).push(row)
  }

  return sections
}

function runInspect(filePath) {
  const result = spawnSync('pnpm', ['exec', 'gltf-transform', 'inspect', '--format', 'csv', filePath], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || `gltf-transform inspect failed for ${filePath}`)
  }

  return parseInspectCsv(result.stdout)
}

function number(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function vector(value) {
  const [x = 0, y = 0, z = 0] = String(value ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
  return { x, y, z }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function classifyAsset({ bytes, renderVertexCount, textureGpuBytes }) {
  if (bytes > 3 * 1024 * 1024 || renderVertexCount > 100_000 || textureGpuBytes > 32 * 1024 * 1024) {
    return 'heavy'
  }

  if (bytes > 800 * 1024 || renderVertexCount > 30_000 || textureGpuBytes > 8 * 1024 * 1024) {
    return 'medium'
  }

  return 'light'
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeSignal(value) {
  return String(value ?? '').toLowerCase()
}

function materialSignalNames(materials, signals) {
  return materials
    .map((material) => material.name)
    .filter((name) => {
      const normalized = normalizeSignal(name)
      return signals.some((signal) => normalized.includes(signal))
    })
}

function inspectModel(filePath) {
  const sections = runInspect(filePath)
  const overview = Object.fromEntries(
    (sections.get('OVERVIEW') ?? []).map((row) => [row.key, row.value]),
  )
  const scenes = sections.get('SCENES') ?? []
  const meshes = sections.get('MESHES') ?? []
  const materials = sections.get('MATERIALS') ?? []
  const textures = sections.get('TEXTURES') ?? []
  const scene = scenes[0] ?? {}
  const bboxMin = vector(scene.bboxMin)
  const bboxMax = vector(scene.bboxMax)
  const bytes = statSync(filePath).size
  const renderVertexCount = number(scene.renderVertexCount)
  const uploadVertexCount = number(scene.uploadVertexCount)
  const textureBytes = textures.reduce((sum, texture) => sum + number(texture.size), 0)
  const textureGpuBytes = textures.reduce((sum, texture) => sum + number(texture.gpuSize), 0)
  const relativePath = `/${path.relative(PUBLIC_DIR, filePath).split(path.sep).join('/')}`
  const asset = {
    path: relativePath,
    bytes,
    sizeLabel: formatBytes(bytes),
    extensionsUsed: overview.extensionsUsed ? overview.extensionsUsed.split(/,\s*/) : [],
    extensionsRequired: overview.extensionsRequired ? overview.extensionsRequired.split(/,\s*/) : [],
    bounds: {
      min: bboxMin,
      max: bboxMax,
      size: {
        x: Number((bboxMax.x - bboxMin.x).toFixed(4)),
        y: Number((bboxMax.y - bboxMin.y).toFixed(4)),
        z: Number((bboxMax.z - bboxMin.z).toFixed(4)),
      },
    },
    renderVertexCount,
    uploadVertexCount,
    meshCount: meshes.length,
    materialCount: materials.length,
    materialNames: unique(materials.map((material) => material.name)).sort(),
    renderMaterialSignals: {
      fabric: materialSignalNames(materials, ['fabric', 'seat', 'cushion', 'pillow']).sort(),
      wood: materialSignalNames(materials, ['wood', 'oak', 'desk', 'shelf']).sort(),
      metal: materialSignalNames(materials, ['metal', 'steel', 'frame', 'leg']).sort(),
      glass: materialSignalNames(materials, ['glass', 'window']).sort(),
      emissive: materialSignalNames(materials, ['lamp', 'emission', 'emissive', 'light_box', '_light']).sort(),
    },
    textureCount: textures.length,
    textureBytes,
    textureGpuBytes,
    textureGpuSizeLabel: formatBytes(textureGpuBytes),
    maxTextureResolution: textures.reduce((max, texture) => {
      const [width = 0, height = 0] = String(texture.resolution ?? '')
        .split('x')
        .map((value) => number(value))
      return Math.max(max, width, height)
    }, 0),
  }

  return {
    ...asset,
    qualityTier: classifyAsset(asset),
  }
}

function summarize(models) {
  const tierCounts = { light: 0, medium: 0, heavy: 0 }

  for (const model of models) {
    tierCounts[model.qualityTier] += 1
  }

  return {
    totalModels: models.length,
    totalBytes: models.reduce((sum, model) => sum + model.bytes, 0),
    totalTextureGpuBytes: models.reduce((sum, model) => sum + model.textureGpuBytes, 0),
    tierCounts,
  }
}

function markdownTable(rows) {
  return [
    '| Tier | Asset | File | Render vertices | Textures | GPU texture |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...rows.map(
      (row) =>
        `| ${row.qualityTier} | \`${row.path}\` | ${row.sizeLabel} | ${row.renderVertexCount.toLocaleString()} | ${row.textureCount} | ${row.textureGpuSizeLabel} |`,
    ),
  ].join('\n')
}

function materialSignalTable(rows) {
  return [
    '| Asset | Tier | Materials | Signals |',
    '| --- | --- | ---: | --- |',
    ...rows.map((row) => {
      const signals = Object.entries(row.renderMaterialSignals)
        .filter(([, names]) => names.length > 0)
        .map(([signal, names]) => `${signal}: ${names.slice(0, 3).join(', ')}`)
        .join('; ')
      return `| \`${row.path}\` | ${row.qualityTier} | ${row.materialCount} | ${signals || '-'} |`
    }),
  ].join('\n')
}

function writeReport(models, summary) {
  const heavyRows = [...models]
    .sort((a, b) => {
      const aScore = Math.max(a.bytes, a.textureGpuBytes, a.renderVertexCount * 32)
      const bScore = Math.max(b.bytes, b.textureGpuBytes, b.renderVertexCount * 32)
      return bScore - aScore
    })
    .slice(0, 30)
  const materialSignalRows = models
    .filter((model) => model.qualityTier !== 'heavy')
    .filter((model) =>
      Object.values(model.renderMaterialSignals).some((names) => names.length > 0),
    )
    .sort((a, b) => {
      const aSignals = Object.values(a.renderMaterialSignals).reduce((sum, names) => sum + names.length, 0)
      const bSignals = Object.values(b.renderMaterialSignals).reduce((sum, names) => sum + names.length, 0)
      return bSignals - aSignals || b.materialCount - a.materialCount
    })
    .slice(0, 20)

  const body = `# Render Asset Audit

Generated: ${new Date().toISOString()}

## Summary

- Models inspected: ${summary.totalModels}
- GLB transfer size: ${formatBytes(summary.totalBytes)}
- Estimated texture GPU allocation: ${formatBytes(summary.totalTextureGpuBytes)}
- Tiers: ${summary.tierCounts.light} light, ${summary.tierCounts.medium} medium, ${summary.tierCounts.heavy} heavy

## Largest / Riskiest Assets

${markdownTable(heavyRows)}

## Material Override Candidates

These non-heavy assets expose material names that can be targeted by runtime PBR override rules.

${materialSignalTable(materialSignalRows)}

## Tier Rules

- heavy: GLB > 3 MB, render vertices > 100k, or estimated texture GPU allocation > 32 MB.
- medium: GLB > 800 KB, render vertices > 30k, or estimated texture GPU allocation > 8 MB.
- light: below the medium thresholds.

Full machine-readable data is written to \`public/assets/render-asset-manifest.json\`.
`

  mkdirSync(DOCS_DIR, { recursive: true })
  mkdirSync(path.dirname(JSON_OUTPUT), { recursive: true })
  writeFileSync(MD_OUTPUT, body)
}

const modelFiles = MODEL_ROOTS.flatMap((root) => walkGlbFiles(path.join(PUBLIC_DIR, root))).sort()
const models = modelFiles.map(inspectModel)
const summary = summarize(models)

mkdirSync(path.dirname(JSON_OUTPUT), { recursive: true })
writeFileSync(
  JSON_OUTPUT,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, models }, null, 2)}\n`,
)
writeReport(models, summary)

console.log(`Audited ${summary.totalModels} render assets.`)
console.log(`Wrote ${path.relative(ROOT, JSON_OUTPUT)} and ${path.relative(ROOT, MD_OUTPUT)}.`)
