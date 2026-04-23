import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DEFAULT_MACOS_BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
const blender = process.env.BLENDER_BIN || (existsSync(DEFAULT_MACOS_BLENDER) ? DEFAULT_MACOS_BLENDER : 'blender')
const script = join(ROOT, 'scripts/blender/audit-hero-assets.py')
const modelRoot = join(ROOT, 'output/blender/hero-assets-decompressed')
const jsonOutput = join(ROOT, 'output/blender/hero-asset-qa.json')
const mdOutput = join(ROOT, 'docs/blender-hero-asset-qa.md')

const heroModels = [
  { id: 'desk', path: 'public/assets/models/polyhaven/metal_office_desk.optimized.glb' },
  { id: 'armchair', path: 'public/assets/models/polyhaven/modern_arm_chair_01.optimized.glb' },
  { id: 'desk-lamp', path: 'public/assets/models/polyhaven/desk_lamp_arm_01.optimized.glb' },
  { id: 'bookcase-left', path: 'public/assets/models/polyhaven/steel_frame_shelves_03.optimized.glb' },
  { id: 'storage-right', path: 'public/assets/models/sharetextures/sharetextures-cabinet-3.optimized.glb' },
  { id: 'reading-lamp', path: 'public/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb' },
  { id: 'round-side-table', path: 'public/assets/models/polyhaven/side_table_01.optimized.glb' },
  { id: 'window-main', path: 'public/assets/models/architectural/modern-wide-picture-window.optimized.glb' },
  { id: 'wall-art-back', path: 'public/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb' },
  { id: 'wall-art-small', path: 'public/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb' },
  { id: 'floor-plant', path: 'public/assets/models/polyhaven/potted_plant_04.optimized.glb' },
  { id: 'small-plant', path: 'public/assets/models/polyhaven/ceramic_vase_01.optimized.glb' },
]

function needsUpdate(src, dst) {
  if (!existsSync(dst)) return true
  return statSync(src).mtimeMs > statSync(dst).mtimeMs
}

function prepareBlenderModels() {
  for (const model of heroModels) {
    const src = join(ROOT, model.path)
    const dst = join(modelRoot, model.path)
    mkdirSync(dirname(dst), { recursive: true })

    if (!needsUpdate(src, dst)) {
      continue
    }

    const result = spawnSync('pnpm', ['exec', 'gltf-transform', 'copy', src, dst], {
      cwd: ROOT,
      stdio: 'inherit',
    })

    if (result.error) {
      throw result.error
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1)
    }
  }
}

function writeMarkdownReport(report) {
  const rows = report.assets
    .map((asset) => {
      const size = `${asset.bounds.size.x.toFixed(3)} x ${asset.bounds.size.y.toFixed(3)} x ${asset.bounds.size.z.toFixed(3)}`
      const signals = Object.entries(asset.materialSignals)
        .filter(([, names]) => names.length > 0)
        .map(([key, names]) => `${key}: ${names.slice(0, 3).join(', ')}`)
        .join('; ')
      const risks = asset.risks.length > 0 ? asset.risks.join('; ') : '-'
      return `| ${asset.id} | ${asset.meshCount} | ${asset.materials.length} | ${size} | ${signals || '-'} | ${risks} |`
    })
    .join('\n')

  const body = `# Blender Hero Asset QA

Generated: ${report.generatedAt}

This report imports the default-room hero GLBs in Blender CLI after a temporary glTF copy step. It does not rewrite source assets.

## Summary

- Assets inspected: ${report.assets.length}
- Assets with risks: ${report.assets.filter((asset) => asset.risks.length > 0).length}
- Output JSON: \`${relative(ROOT, jsonOutput)}\`

## Asset Table

| Asset | Meshes | Materials | Blender bounds XYZ | Material signals | Risks |
| --- | ---: | ---: | --- | --- | --- |
${rows}

## How To Use

- Prefer assets with separated glass, metal, wood, fabric, and lamp/emissive material names.
- Treat missing signal names as runtime override risk, not an automatic rejection.
- If an important hero asset has poor material naming, create a separate variant instead of editing the source GLB.
`

  mkdirSync(dirname(mdOutput), { recursive: true })
  writeFileSync(mdOutput, body)
}

prepareBlenderModels()
mkdirSync(dirname(jsonOutput), { recursive: true })

const result = spawnSync(
  blender,
  [
    '--background',
    '--factory-startup',
    '--python',
    script,
    '--',
    '--model-root',
    modelRoot,
    '--models',
    JSON.stringify(heroModels),
    '--output',
    jsonOutput,
  ],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

writeMarkdownReport(JSON.parse(readFileSync(jsonOutput, 'utf8')))
console.log(`Wrote ${relative(ROOT, jsonOutput)} and ${relative(ROOT, mdOutput)}.`)
