import { existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DEFAULT_MACOS_BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
const blender = process.env.BLENDER_BIN || (existsSync(DEFAULT_MACOS_BLENDER) ? DEFAULT_MACOS_BLENDER : 'blender')
const script = join(ROOT, 'scripts/blender/bake-furniture-4k-variants.py')
const outputDir = join(ROOT, 'public/assets/generated/baked-variants')
const modelRoot = join(ROOT, 'output/blender/furniture-4k-decompressed')
const manifestPath = join(outputDir, 'manifest.json')
const tsOutput = join(ROOT, 'src/constants/bakedFurnitureVariants.generated.ts')
const textureSize = Number(process.env.FURNITURE_BAKE_TEXTURE_SIZE || 4096)

const variants = [
  {
    id: 'simple-table-4k-baked',
    source: 'public/assets/models/manual/zeel-by-furniture-simple-table.optimized.glb',
    output: 'simple-table-4k-baked.glb',
    kind: 'wood',
  },
  {
    id: 'plan-chair-4k-baked',
    source: 'public/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb',
    bakeSource: 'public/assets/generated/runtime-variants/plan-chair-runtime-lite.glb',
    output: 'plan-chair-4k-baked.glb',
    kind: 'wood',
  },
  {
    id: 'rounded-commode-4k-baked',
    source: 'public/assets/models/manual/zeel-by-furniture-rounded-commode.optimized.glb',
    output: 'rounded-commode-4k-baked.glb',
    kind: 'ceramic',
  },
  {
    id: 'hackney-sofa-4k-baked',
    source: 'public/assets/models/manual/dimensiva-hackney-sofa-by-hay.optimized.glb',
    bakeSource: 'public/assets/generated/runtime-variants/hackney-sofa-runtime-lite.glb',
    output: 'hackney-sofa-4k-baked.glb',
    kind: 'fabric',
  },
  {
    id: 'ibiza-coffee-table-4k-baked',
    source: 'public/assets/models/manual/dimensiva-ibiza-forte-coffee-table-by-ritzwell.optimized.glb',
    output: 'ibiza-coffee-table-4k-baked.glb',
    kind: 'wood',
  },
  {
    id: 'blown-armchair-4k-baked',
    source: 'public/assets/models/manual/zeel-by-furniture-blown-armchair.optimized.glb',
    output: 'blown-armchair-4k-baked.glb',
    kind: 'fabric',
  },
  {
    id: 'slit-side-table-4k-baked',
    source: 'public/assets/models/manual/dimensiva-slit-side-table-round-high-by-hay.optimized.glb',
    output: 'slit-side-table-4k-baked.glb',
    kind: 'metal',
  },
]

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function needsUpdate(src, dst) {
  if (!existsSync(dst)) return true
  return statSync(src).mtimeMs > statSync(dst).mtimeMs
}

function fileSize(path) {
  return statSync(path).size
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

mkdirSync(outputDir, { recursive: true })

const variantsWithSize = variants.map((variant) => ({
  ...variant,
  textureSize,
}))

for (const variant of variantsWithSize) {
  const source = variant.bakeSource ?? variant.source
  const sourcePath = join(ROOT, source)
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing source asset: ${source}`)
  }

  const decompressedPath = join(modelRoot, source)
  mkdirSync(dirname(decompressedPath), { recursive: true })

  if (needsUpdate(sourcePath, decompressedPath)) {
    run('pnpm', ['exec', 'gltf-transform', 'copy', sourcePath, decompressedPath])
  }
}

const blenderVariants = variantsWithSize.map((variant) => ({
  ...variant,
  source: variant.bakeSource ?? variant.source,
}))

run(blender, [
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
  JSON.stringify(blenderVariants),
])

for (const variant of variantsWithSize) {
  const outputPath = join(outputDir, variant.output)
  const optimizedPath = outputPath.replace(/\.glb$/i, '.tmp-optimized.glb')

  run('pnpm', [
    'exec',
    'gltf-transform',
    'optimize',
    outputPath,
    optimizedPath,
    '--compress',
    'meshopt',
    '--texture-compress',
    'webp',
    '--texture-size',
    String(textureSize),
    '--prune-attributes',
    'false',
  ])
  renameSync(optimizedPath, outputPath)
}

const manifest = {
  generatedAt: new Date().toISOString(),
  textureSize,
  variants: variantsWithSize.map((variant) => {
    const outputUrl = `/assets/generated/baked-variants/${variant.output}`
    const outputPath = join(ROOT, 'public', outputUrl)
    return {
      id: variant.id,
      source: `/${variant.source.replace(/^public\//, '')}`,
      outputUrl,
      textureSize,
      kind: variant.kind,
      bytes: fileSize(outputPath),
      sizeLabel: formatBytes(fileSize(outputPath)),
    }
  }),
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

const entries = manifest.variants
  .map((variant) => `  [\n    ${JSON.stringify(variant.source)},\n    ${JSON.stringify(variant.outputUrl)}\n  ],`)
  .join('\n')

writeFileSync(
  tsOutput,
  `export const bakedFurnitureVariantUrls = new Map<string, string>([\n${entries}\n])\n`,
)

console.log(`Wrote ${relative(ROOT, manifestPath)}.`)
console.log(`Wrote ${relative(ROOT, tsOutput)}.`)
