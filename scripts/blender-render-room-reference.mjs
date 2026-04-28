import { existsSync, mkdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DEFAULT_MACOS_BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
const blender = process.env.BLENDER_BIN || (existsSync(DEFAULT_MACOS_BLENDER) ? DEFAULT_MACOS_BLENDER : 'blender')
const script = join(ROOT, 'scripts/blender/render-room-reference.py')
const modelRoot = join(ROOT, 'output/blender/models-decompressed')
const referenceModels = [
  'public/assets/models/manual/zeel-by-furniture-simple-table.optimized.glb',
  'public/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb',
  'public/assets/models/manual/designconnected-hollie-table-lamp-8909.optimized.glb',
  'public/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb',
  'public/assets/models/manual/zeel-by-furniture-rounded-commode.optimized.glb',
  'public/assets/models/manual/dimensiva-hackney-sofa-by-hay.optimized.glb',
  'public/assets/models/manual/dimensiva-ibiza-forte-coffee-table-by-ritzwell.optimized.glb',
  'public/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb',
  'public/assets/models/polyhaven/ceramic_vase_03.optimized.glb',
  'public/assets/models/architectural/modern-wide-picture-window.optimized.glb',
  'public/assets/models/polyhaven/ceramic_vase_02.optimized.glb',
  'public/assets/models/manual/dimensiva-stop-bookend-by-e15.optimized.glb',
  'public/assets/models/polyhaven/potted_plant_04.optimized.glb',
  'public/assets/models/polyhaven/potted_plant_01.optimized.glb',
  'public/assets/models/polyhaven/ceramic_vase_01.optimized.glb',
  'public/assets/models/manual/zeel-by-furniture-blown-armchair.optimized.glb',
  'public/assets/models/manual/dimensiva-slit-side-table-round-high-by-hay.optimized.glb',
  'public/assets/models/manual/dimensiva-toio-led-floor-lamp-by-flos.optimized.glb',
]

function needsUpdate(src, dst) {
  if (!existsSync(dst)) return true
  return statSync(src).mtimeMs > statSync(dst).mtimeMs
}

function prepareBlenderModels() {
  for (const relativePath of referenceModels) {
    const src = join(ROOT, relativePath)
    const dst = join(modelRoot, relativePath)
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

prepareBlenderModels()

const result = spawnSync(
  blender,
  [
    '--background',
    '--factory-startup',
    '--python',
    script,
    '--',
    '--repo-root',
    ROOT,
    '--model-root',
    modelRoot,
    '--output',
    join(ROOT, 'output/blender/current-room-reference-daylight.png'),
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
