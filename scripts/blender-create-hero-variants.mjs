import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DEFAULT_MACOS_BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
const blender = process.env.BLENDER_BIN || (existsSync(DEFAULT_MACOS_BLENDER) ? DEFAULT_MACOS_BLENDER : 'blender')
const script = join(ROOT, 'scripts/blender/create-hero-variants.py')
const outputDir = join(ROOT, 'public/assets/generated/blender-variants')
const modelRoot = join(ROOT, 'output/blender/hero-variant-decompressed')
const manifestPath = join(ROOT, 'public/assets/generated/blender-variants/manifest.json')

const variants = [
  {
    id: 'desk-lamp-night-emissive',
    source: 'public/assets/models/polyhaven/desk_lamp_arm_01.optimized.glb',
    output: 'desk-lamp-night-emissive.glb',
    materialRenames: {
      desk_lamp_arm_01: 'brushed_metal_arm',
      desk_lamp_arm_01_light: 'warm_emissive_bulb',
    },
    emissiveMaterials: ['warm_emissive_bulb'],
  },
  {
    id: 'industrial-pipe-lamp-night-emissive',
    source: 'public/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb',
    output: 'industrial-pipe-lamp-night-emissive.glb',
    materialRenames: {
      industrial_pipe_lamp: 'dark_metal_lamp_body',
      industrial_pipe_lamp_glass: 'warm_emissive_glass',
    },
    emissiveMaterials: ['warm_emissive_glass'],
  },
]

mkdirSync(outputDir, { recursive: true })

function needsUpdate(src, dst) {
  if (!existsSync(dst)) return true
  return statSync(src).mtimeMs > statSync(dst).mtimeMs
}

for (const variant of variants) {
  const src = join(ROOT, variant.source)
  const dst = join(modelRoot, variant.source)
  mkdirSync(dirname(dst), { recursive: true })

  if (!needsUpdate(src, dst)) {
    continue
  }

  const copy = spawnSync('pnpm', ['exec', 'gltf-transform', 'copy', src, dst], {
    cwd: ROOT,
    stdio: 'inherit',
  })

  if (copy.error) {
    throw copy.error
  }

  if (copy.status !== 0) {
    process.exit(copy.status ?? 1)
  }
}

const result = spawnSync(
  blender,
  [
    '--background',
    '--factory-startup',
    '--python',
    script,
    '--',
    '--repo-root',
    modelRoot,
    '--output-dir',
    outputDir,
    '--variants',
    JSON.stringify(variants),
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

writeFileSync(
  manifestPath,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    variants: variants.map((variant) => ({
      id: variant.id,
      source: variant.source,
      output: `/assets/generated/blender-variants/${variant.output}`,
      purpose: 'Night/emissive material naming cleanup candidate. Source GLB is not overwritten.',
    })),
  }, null, 2)}\n`,
)

console.log(`Wrote ${relative(ROOT, manifestPath)}.`)
