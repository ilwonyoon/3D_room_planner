import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const MANIFEST_PATH = path.join(ROOT, 'public/assets/generated/runtime-variants/manifest.json')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

if (!existsSync(MANIFEST_PATH)) {
  throw new Error(`Missing ${path.relative(ROOT, MANIFEST_PATH)}. Run pnpm blender:create-runtime-variants first.`)
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))

if (!Array.isArray(manifest.variants) || manifest.variants.length === 0) {
  throw new Error(`${path.relative(ROOT, MANIFEST_PATH)} does not contain runtime variants.`)
}

for (const variant of manifest.variants) {
  const outputUrl = variant.outputUrl

  if (typeof outputUrl !== 'string' || !outputUrl.startsWith('/assets/')) {
    throw new Error(`Invalid outputUrl for ${variant.id ?? 'unknown variant'}: ${outputUrl}`)
  }

  const outputPath = path.join(ROOT, 'public', outputUrl)

  if (!existsSync(outputPath)) {
    throw new Error(`Missing runtime variant file: ${path.relative(ROOT, outputPath)}`)
  }

  run('pnpm', ['exec', 'gltf-transform', 'validate', outputPath])
}

console.log(`Validated ${manifest.variants.length} runtime variant GLB files.`)
