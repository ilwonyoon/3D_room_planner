import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

globalThis.self ??= globalThis
globalThis.createImageBitmap ??= async () => ({
  close() {},
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const outputDir = path.join(rootDir, 'docs')
const reportPath = path.join(outputDir, 'room-setting-model-bounds-audit.md')
const polyhavenModelIds = new Set(['dartboard'])
const architecturalModelIds = new Set([
  'modern-wide-picture-window',
  'modern-sliding-window',
  'modern-tall-casement-window',
  'modern-square-awning-window',
  'modern-transom-window',
  'modern-flush-white-door',
  'modern-slim-glass-door',
  'modern-sliding-glass-door',
  'modern-double-glass-door',
  'modern-ribbed-oak-door',
])

const catalogSource = readFileSync(path.join(rootDir, 'src', 'constants', 'environmentCatalog.ts'), 'utf8')

function parseCatalogArray(name, category, placement, defaultRotationY = 0) {
  const block = catalogSource.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const`))?.[1]
  if (!block) {
    throw new Error(`Could not find ${name} in environmentCatalog.ts`)
  }

  return [...block.matchAll(/\[\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*\{\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*z:\s*([0-9.]+)\s*\}\s*\]/g)]
    .map((match) => ({
      id: match[1],
      category,
      placement,
      defaultRotationY,
      dimensionsM: {
        x: Number(match[2]),
        y: Number(match[3]),
        z: Number(match[4]),
      },
    }))
}

const catalogItems = [
  ...parseCatalogArray('WINDOW_ITEMS', 'windows', 'wall'),
  ...parseCatalogArray('DOOR_ITEMS', 'doors', 'wall'),
  ...parseCatalogArray('WALL_DECOR_ITEMS', 'shell', 'wall'),
  ...parseCatalogArray('DECOR_ITEMS', 'decor', 'floor'),
]

function modelPathFor(category, id) {
  if (id.includes('_') || polyhavenModelIds.has(id)) {
    return path.join(publicDir, 'assets', 'models', 'polyhaven', `${id}.optimized.glb`)
  }

  if (architecturalModelIds.has(id)) {
    return path.join(publicDir, 'assets', 'models', 'architectural', `${id}.optimized.glb`)
  }

  return path.join(publicDir, 'assets', 'models', 'environment', category, `${id}.optimized.glb`)
}

async function measureModel(filePath) {
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const buffer = readFileSync(filePath)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const gltf = await loader.parseAsync(arrayBuffer, `${path.dirname(filePath)}${path.sep}`)
  const bounds = new THREE.Box3().setFromObject(gltf.scene)
  const size = bounds.getSize(new THREE.Vector3())

  return { x: size.x, y: size.y, z: size.z }
}

function round(value) {
  return Number(value.toFixed(3))
}

function formatSize(size) {
  return `${round(size.x)} x ${round(size.y)} x ${round(size.z)}`
}

function applyQuarterTurnY(size, rotationY) {
  const turns = Math.round(rotationY / (Math.PI / 2))
  return Math.abs(turns) % 2 === 1
    ? { x: size.z, y: size.y, z: size.x }
    : size
}

function axisError(expected, actual) {
  return {
    x: Math.abs(actual.x - expected.x) / Math.max(expected.x, 0.001),
    y: Math.abs(actual.y - expected.y) / Math.max(expected.y, 0.001),
    z: Math.abs(actual.z - expected.z) / Math.max(expected.z, 0.001),
  }
}

function maxAxisError(error) {
  return Math.max(error.x, error.y, error.z)
}

function riskLabel(error, placement, renderedSize) {
  if (maxAxisError(error) > 0.4) return 'fail'
  if (placement === 'wall' && Math.max(renderedSize.x, renderedSize.z) < renderedSize.y * 0.35) return 'orientation-risk'
  if (maxAxisError(error) > 0.2) return 'review'
  return 'ok'
}

async function main() {
  const rows = []

  for (const item of catalogItems) {
      const filePath = modelPathFor(item.category, item.id)
      const sourceSize = await measureModel(filePath)
      const sourceMax = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.001)
      const targetSize = Math.max(item.dimensionsM.x, item.dimensionsM.y, item.dimensionsM.z)
      const scale = targetSize / sourceMax
      const localRenderedSize = {
        x: sourceSize.x * scale,
        y: sourceSize.y * scale,
        z: sourceSize.z * scale,
      }
      const renderedSize = applyQuarterTurnY(localRenderedSize, item.defaultRotationY)
      const error = axisError(item.dimensionsM, renderedSize)

      rows.push({
        id: item.id,
        category: item.category,
        placement: item.placement,
        expected: item.dimensionsM,
        sourceSize,
        renderedSize,
        error,
        risk: riskLabel(error, item.placement, renderedSize),
      })
  }

  rows.sort((a, b) => maxAxisError(b.error) - maxAxisError(a.error))

  const lines = [
    '# Room Setting Model Bounds Audit',
    '',
    'This compares catalog dimensions against the size that `FurnitureModel` actually renders after normalizing each GLB to `targetSize`.',
    '',
    '| Risk | Category | Placement | Model | Catalog m | Rendered m | Max axis error |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => {
      const maxError = `${Math.round(maxAxisError(row.error) * 100)}%`
      return `| ${row.risk} | ${row.category} | ${row.placement} | ${row.id} | ${formatSize(row.expected)} | ${formatSize(row.renderedSize)} | ${maxError} |`
    }),
    '',
    'Risk meanings:',
    '- `ok`: rendered model proportions are close enough for the current selection box.',
    '- `review`: some axis differs by more than 20%; selection/collision can look loose.',
    '- `fail`: some axis differs by more than 40%; catalog dimensions should be model-specific.',
    '- `orientation-risk`: wall model is much taller than it is wide/deep after normalization, which usually means the wall-facing axis needs manual placement rules.',
    '',
  ]

  const summary = rows.reduce((counts, row) => {
    counts[row.risk] = (counts[row.risk] ?? 0) + 1
    return counts
  }, {})

  await mkdir(outputDir, { recursive: true })
  await writeFile(reportPath, `${lines.join('\n')}\n`)
  console.table(rows.map((row) => ({
    risk: row.risk,
    category: row.category,
    model: row.id,
    catalogM: formatSize(row.expected),
    renderedM: formatSize(row.renderedSize),
    maxError: `${Math.round(maxAxisError(row.error) * 100)}%`,
  })))
  console.log(`[audit] wrote ${path.relative(rootDir, reportPath)}`)
  console.log('[audit] summary', summary)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
