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
  'public/assets/models/polyhaven/metal_office_desk.optimized.glb',
  'public/assets/models/polyhaven/modern_arm_chair_01.optimized.glb',
  'public/assets/models/polyhaven/desk_lamp_arm_01.optimized.glb',
  'public/assets/models/polyhaven/steel_frame_shelves_03.optimized.glb',
  'public/assets/models/sharetextures/sharetextures-cabinet-3.optimized.glb',
  'public/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb',
  'public/assets/models/polyhaven/side_table_01.optimized.glb',
  'public/assets/models/polyhaven/potted_plant_04.optimized.glb',
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
    join(ROOT, 'output/blender/reference-daylight.png'),
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
