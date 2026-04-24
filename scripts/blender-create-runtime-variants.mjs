import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const LOCAL_KTX_BIN_DIR = path.join(ROOT, 'tools/ktx/bin')
const LOCAL_KTX_LIB_DIR = path.join(ROOT, 'tools/ktx/lib')
const OUTPUT_DIR = path.join(ROOT, 'public/assets/generated/runtime-variants')
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json')
const MD_OUTPUT = path.join(ROOT, 'docs/runtime-variant-report.md')
const TS_OUTPUT = path.join(ROOT, 'src/constants/runtimeModelVariants.generated.ts')

const variants = [
  {
    id: 'beyla-shoe-cabinet-runtime-lite',
    source: 'public/assets/models/manual/dimensiva-beyla-shoe-cabinet-by-kave-home.optimized.glb',
    output: 'beyla-shoe-cabinet-runtime-lite.glb',
    simplifyRatio: 0.6,
    simplifyError: 0.002,
    textureSize: 512,
  },
  {
    id: 'vintage-cabinet-runtime-lite',
    source: 'public/assets/models/polyhaven/vintage_cabinet_01.optimized.glb',
    output: 'vintage-cabinet-runtime-lite.glb',
    simplifyRatio: 0.75,
    simplifyError: 0.0015,
    textureSize: 512,
  },
  {
    id: 'eames-armchair-runtime-lite',
    source: 'public/assets/models/manual/dimensiva-eames-armchair-rocker-rar-by-vitra.optimized.glb',
    output: 'eames-armchair-runtime-lite.glb',
    simplifyRatio: 0.32,
    simplifyError: 0.0025,
    textureSize: 512,
  },
  {
    id: 'lotus-vase-runtime-lite',
    source: 'public/assets/models/manual/dimensiva-lotus-vase-by-101-copenhagen.optimized.glb',
    output: 'lotus-vase-runtime-lite.glb',
    simplifyRatio: 0.125,
    simplifyError: 0.003,
    textureSize: 512,
  },
]

const deferredVariants = [
  {
    id: 'sheen-chair-runtime-lite',
    source: 'public/assets/models/sheen-chair.optimized.glb',
    reason: 'gltf-transform simplification drops or invalidates TEXCOORD_1 required by the occlusion texture; needs Blender UV/AO cleanup before runtime use.',
  },
]

function commandEnv() {
  return {
    ...process.env,
    PATH: `${LOCAL_KTX_BIN_DIR}:${process.env.PATH ?? ''}`,
    DYLD_LIBRARY_PATH: `${LOCAL_KTX_LIB_DIR}:${process.env.DYLD_LIBRARY_PATH ?? ''}`,
    LD_LIBRARY_PATH: `${LOCAL_KTX_LIB_DIR}:${process.env.LD_LIBRARY_PATH ?? ''}`,
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: commandEnv(),
    stdio: 'inherit',
    shell: false,
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function inspect(filePath) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'gltf-transform', 'inspect', '--format', 'csv', filePath],
    {
      cwd: ROOT,
      encoding: 'utf8',
      shell: false,
    },
  )

  if (result.status !== 0) {
    throw new Error(result.stderr || `gltf-transform inspect failed for ${filePath}`)
  }

  const sections = parseInspectCsv(result.stdout)
  const scene = sections.get('SCENES')?.[0] ?? {}
  const textures = sections.get('TEXTURES') ?? []

  return {
    bytes: statSync(filePath).size,
    renderVertexCount: number(scene.renderVertexCount),
    uploadVertexCount: number(scene.uploadVertexCount),
    textureCount: textures.length,
    textureGpuBytes: textures.reduce((sum, texture) => sum + number(texture.gpuSize), 0),
  }
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

function number(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function percentChange(before, after) {
  if (!before) return 'n/a'
  return `${(((after - before) / before) * 100).toFixed(1)}%`
}

function createVariant(variant) {
  const source = path.join(ROOT, variant.source)
  const output = path.join(OUTPUT_DIR, variant.output)

  if (!existsSync(source)) {
    throw new Error(`Missing source asset: ${variant.source}`)
  }

  mkdirSync(path.dirname(output), { recursive: true })

  run('pnpm', [
    'exec',
    'gltf-transform',
    'optimize',
    source,
    output,
    '--compress',
    'meshopt',
    '--texture-compress',
    'ktx2',
    '--texture-size',
    String(variant.textureSize),
    '--prune-attributes',
    'false',
    '--simplify',
    'true',
    '--simplify-ratio',
    String(variant.simplifyRatio),
    '--simplify-error',
    String(variant.simplifyError),
  ])

  const before = inspect(source)
  const after = inspect(output)

  return {
    ...variant,
    outputUrl: `/assets/generated/runtime-variants/${variant.output}`,
    sourceStats: before,
    runtimeStats: after,
    deltas: {
      transferBytes: percentChange(before.bytes, after.bytes),
      renderVertexCount: percentChange(before.renderVertexCount, after.renderVertexCount),
      textureGpuBytes: percentChange(before.textureGpuBytes, after.textureGpuBytes),
    },
  }
}

function writeMarkdown(results) {
  const rows = results
    .map(
      (result) =>
        `| ${result.id} | \`${result.source}\` | \`${result.outputUrl}\` | ${result.sourceStats.renderVertexCount.toLocaleString()} -> ${result.runtimeStats.renderVertexCount.toLocaleString()} (${result.deltas.renderVertexCount}) | ${formatBytes(result.sourceStats.textureGpuBytes)} -> ${formatBytes(result.runtimeStats.textureGpuBytes)} (${result.deltas.textureGpuBytes}) | ${formatBytes(result.sourceStats.bytes)} -> ${formatBytes(result.runtimeStats.bytes)} (${result.deltas.transferBytes}) |`,
    )
    .join('\n')

  const deferredRows = deferredVariants
    .map((variant) => `| ${variant.id} | \`${variant.source}\` | ${variant.reason} |`)
    .join('\n')

  const body = `# Runtime Variant Report

Generated: ${new Date().toISOString()}

These runtime-lite GLBs are generated variants. Source GLBs are not overwritten.

| Variant | Source | Output | Render vertices | Texture GPU | Transfer |
| --- | --- | --- | ---: | ---: | ---: |
${rows}

## Notes

- All active variants are opt-in through \`VITE_ENABLE_RUNTIME_VARIANTS=true\`.
- Texture GPU size may remain unchanged when source textures are embedded WebP; \`gltf-transform optimize\` currently skips KTX2 conversion for those textures.
- Validator info for \`EXT_meshopt_compression\` is expected because the validator does not inspect that extension. Warnings such as generated tangent space still need browser visual QA.

## Deferred Candidates

| Variant | Source | Reason |
| --- | --- | --- |
${deferredRows}

## Next Steps

- Visually compare variants against source assets in isometric view.
- Use \`runtimeModelUrl\` / \`heroModelUrl\` metadata for selection-aware or camera-distance variant policy.
- Keep windows on current assets for now; they are under the Phase 3 window budget.

## Commands

Generate runtime variants:

\`\`\`sh
pnpm blender:create-runtime-variants
\`\`\`

Validate generated runtime variants:

\`\`\`sh
pnpm blender:validate-runtime-variants
\`\`\`
`

  mkdirSync(path.dirname(MD_OUTPUT), { recursive: true })
  writeFileSync(MD_OUTPUT, body)
}

function writeTypeScriptMap(results) {
  const variants = results
    .map((result) => [
      `/${result.source.replace(/^public\//, '')}`,
      result.outputUrl,
    ])
    .sort((a, b) => a[0].localeCompare(b[0]))

  mkdirSync(path.dirname(TS_OUTPUT), { recursive: true })
  writeFileSync(
    TS_OUTPUT,
    `export const runtimeModelVariantUrls = new Map<string, string>(${JSON.stringify(variants, null, 2)})\n`,
  )
}

mkdirSync(OUTPUT_DIR, { recursive: true })

const results = variants.map(createVariant)

writeFileSync(
  MANIFEST_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      variants: results,
    },
    null,
    2,
  )}\n`,
)
writeMarkdown(results)
writeTypeScriptMap(results)

console.log(
  `Wrote ${path.relative(ROOT, MANIFEST_PATH)}, ${path.relative(ROOT, MD_OUTPUT)}, and ${path.relative(ROOT, TS_OUTPUT)}.`,
)
