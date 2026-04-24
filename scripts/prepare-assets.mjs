import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const LOCAL_KTX_BIN_DIR = join(ROOT, 'tools/ktx/bin')
const LOCAL_KTX_LIB_DIR = join(ROOT, 'tools/ktx/lib')

const prepareScope = new Set(
  (process.env.ASSET_PREPARE_SCOPE ?? 'all')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean),
)
const modelFilter = new Set(
  (process.env.ASSET_MODEL_FILTER ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
)

const shouldPrepare = (scope) => prepareScope.has('all') || prepareScope.has(scope)
const shouldPrepareModel = (id) => modelFilter.size === 0 || modelFilter.has(id)
const textureCompression = process.env.ASSET_TEXTURE_FORMAT ?? 'webp'
const modelOutputVariant = process.env.ASSET_MODEL_VARIANT ?? 'runtime'
const forcePrepare = process.env.ASSET_PREPARE_FORCE === '1'
const fbxConvertTimeoutMs = Number.parseInt(process.env.ASSET_FBX_CONVERT_TIMEOUT_MS ?? '240000', 10)
const objConvertTimeoutMs = Number.parseInt(process.env.ASSET_OBJ_CONVERT_TIMEOUT_MS ?? '240000', 10)
const objInputUpAxis = process.env.ASSET_OBJ_INPUT_UP_AXIS ?? 'Z'
const objOutputUpAxis = process.env.ASSET_OBJ_OUTPUT_UP_AXIS ?? 'Y'
const modelOutputRoot = join(
  ROOT,
  modelOutputVariant === 'ktx2' ? 'public/assets/models-ktx2' : 'public/assets/models',
)

if (!['webp', 'ktx2', 'avif', 'auto'].includes(textureCompression)) {
  throw new Error(
    `Unsupported ASSET_TEXTURE_FORMAT=${textureCompression}. Use webp, ktx2, avif, or auto.`,
  )
}

if (textureCompression === 'ktx2' && !hasCommand('toktx')) {
  throw new Error('KTX2 compression requires `toktx`. Run `pnpm assets:install-ktx` first.')
}

const shareTexturesFurnitureModels = [
  'sharetextures-chair-25',
  'sharetextures-chair-26',
  'sharetextures-chair-27',
  'sharetextures-chair-28',
  'sharetextures-chair-29',
  'sharetextures-bench-32',
  'sharetextures-cabinet-3',
  'sharetextures-stool-5',
  'sharetextures-stool-7',
  'sharetextures-stool-8',
]

const objaverseFurnitureModels = [
  'objaverse-messy-bed-2',
  'objaverse-soho-bed',
  'objaverse-chelsea-storage-bed',
  'objaverse-bed-0101',
  'objaverse-king-floor-bed',
  'objaverse-large-grantham-bed',
]

const architecturalEnvironmentModels = {
  windows: [
    'modern-wide-picture-window',
    'modern-triple-window',
    'modern-sliding-window',
    'modern-sliding-door-window',
    'modern-tall-casement-window',
    'modern-upper-transom-window',
    'modern-dynamic-window',
    'modern-casement-slider-window',
    'modern-pvc-transom-window',
  ],
  doors: [
    'modern-flush-white-door',
    'modern-slim-glass-door',
    'modern-sliding-glass-door',
    'modern-double-glass-door',
    'modern-ribbed-oak-door',
  ],
}

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

function hasCommand(command) {
  if (existsSync(join(LOCAL_KTX_BIN_DIR, command))) {
    return true
  }

  const result = spawnSync('which', [command], { env: commandEnv(), stdio: 'ignore' })
  return result.status === 0
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return undefined
  }

  return JSON.parse(readFileSync(path, 'utf8'))
}

function modelOutputPath(...segments) {
  return join(modelOutputRoot, ...segments)
}

function prepareTextureDirectory(source, target, maxSize) {
  if (!existsSync(source)) {
    throw new Error(`Missing texture source: ${source}`)
  }

  rmSync(target, { recursive: true, force: true })
  ensureDir(target)

  for (const file of readdirSync(source).filter((name) => name.endsWith('.jpg'))) {
    const src = join(source, file)
    const dest = join(target, file)

    if (hasCommand('sips')) {
      run('sips', ['-Z', String(maxSize), src, '--out', dest])
    } else {
      cpSync(src, dest)
    }
  }
}

function prepareTextureGroup(sourceRoot, targetRoot, maxSize) {
  if (!existsSync(sourceRoot)) {
    return
  }

  for (const directory of readdirSync(sourceRoot)) {
    const source = join(sourceRoot, directory)
    const target = join(targetRoot, directory)
    prepareTextureDirectory(source, target, maxSize)
  }
}

function prepareTextures() {
  const jobs = [
    {
      source: join(ROOT, 'raw/assets/textures/wood-floor-051'),
      target: join(ROOT, 'public/assets/textures-runtime/wood-floor-051'),
      maxSize: 1024,
    },
    {
      source: join(ROOT, 'raw/assets/textures/painted-plaster-017'),
      target: join(ROOT, 'public/assets/textures-runtime/painted-plaster-017'),
      maxSize: 1024,
    },
  ]

  for (const job of jobs) {
    prepareTextureDirectory(job.source, job.target, job.maxSize)
  }

  prepareTextureGroup(
    join(ROOT, 'raw/assets/textures/walls'),
    join(ROOT, 'public/assets/textures-runtime/walls'),
    1024,
  )
  prepareTextureGroup(
    join(ROOT, 'raw/assets/textures/floors'),
    join(ROOT, 'public/assets/textures-runtime/floors'),
    1024,
  )
}

function optimizeModel(input, output) {
  if (!existsSync(input)) {
    throw new Error(`Missing model source: ${input}`)
  }

  ensureDir(dirname(output))

  run('pnpm', [
    'exec',
    'gltf-transform',
    'optimize',
    input,
    output,
    '--compress',
    'meshopt',
    '--texture-compress',
    textureCompression,
    '--texture-size',
    '1024',
  ])
}

function fbx2gltfBinaryPath() {
  const platformDirectory =
    process.platform === 'darwin' ? 'Darwin' : process.platform === 'linux' ? 'Linux' : 'Windows_NT'
  const binaryName = platformDirectory === 'Windows_NT' ? 'FBX2glTF.exe' : 'FBX2glTF'

  return join(ROOT, 'node_modules/fbx2gltf/bin', platformDirectory, binaryName)
}

function convertFbxToGlb(input, output) {
  if (!existsSync(input)) {
    throw new Error(`Missing FBX source: ${input}`)
  }

  const binary = fbx2gltfBinaryPath()

  if (!existsSync(binary)) {
    throw new Error('Missing fbx2gltf. Run `pnpm install` before preparing ShareTextures models.')
  }

  ensureDir(dirname(output))

  const outputBase = output.endsWith('.glb') ? output.slice(0, -4) : output
  run(binary, ['--input', input, '--output', outputBase, '--binary'], {
    timeout: fbxConvertTimeoutMs,
  })
}

function convertObjToGlb(input, output) {
  if (!existsSync(input)) {
    throw new Error(`Missing OBJ source: ${input}`)
  }

  ensureDir(dirname(output))

  run(
    'pnpm',
    [
      'exec',
      'obj2gltf',
      '--input',
      input,
      '--output',
      output,
      '--binary',
      '--inputUpAxis',
      objInputUpAxis,
      '--outputUpAxis',
      objOutputUpAxis,
      '--doubleSidedMaterial',
    ],
    { timeout: objConvertTimeoutMs },
  )
}

function manualObjSourcePath(sourceDir) {
  const sourceJson = readJsonIfExists(join(sourceDir, 'source.json'))
  const originalModelFile =
    sourceJson?.canonicalModelFile === 'model.obj' && typeof sourceJson.originalModelFile === 'string'
      ? sourceJson.originalModelFile
      : undefined
  const sourcePackageObj = originalModelFile
    ? join(sourceDir, 'source-package', originalModelFile)
    : undefined

  if (sourcePackageObj && existsSync(sourcePackageObj)) {
    return sourcePackageObj
  }

  return join(sourceDir, 'model.obj')
}

function prepareModels() {
  const standaloneModels = ['sheen-chair', 'sheen-wood-leather-sofa']

  if (shouldPrepare('khronos')) {
    for (const modelId of standaloneModels) {
      if (!shouldPrepareModel(modelId)) {
        continue
      }

      const input = join(ROOT, `raw/assets/models/${modelId}.glb`)
      const output = modelOutputPath(`${modelId}.optimized.glb`)
      optimizeModel(input, output)
    }
  }

  const polyHavenSourceDir = join(ROOT, 'raw/assets/models/polyhaven')
  const polyHavenOutputDir = modelOutputPath('polyhaven')

  if (shouldPrepare('polyhaven') && existsSync(polyHavenSourceDir)) {
    ensureDir(polyHavenOutputDir)

    for (const assetId of readdirSync(polyHavenSourceDir)) {
      if (!shouldPrepareModel(assetId)) {
        continue
      }

      const source = join(polyHavenSourceDir, assetId, `${assetId}_1k.gltf`)
      const target = join(polyHavenOutputDir, `${assetId}.optimized.glb`)

      if (!existsSync(source)) {
        continue
      }

      optimizeModel(source, target)
    }
  }

  const shareTexturesSourceDir = join(ROOT, 'raw/assets/models/sharetextures')

  if (shouldPrepare('sharetextures') && existsSync(shareTexturesSourceDir)) {
    for (const modelId of shareTexturesFurnitureModels) {
      if (!shouldPrepareModel(modelId)) {
        continue
      }

      const source = join(shareTexturesSourceDir, modelId, 'model.fbx')
      const converted = join(shareTexturesSourceDir, modelId, `${modelId}.converted.glb`)
      const target = modelOutputPath('sharetextures', `${modelId}.optimized.glb`)

      convertFbxToGlb(source, converted)
      optimizeModel(converted, target)
    }
  }

  const objaverseSourceDir = join(ROOT, 'raw/assets/models/objaverse')

  if (shouldPrepare('objaverse') && existsSync(objaverseSourceDir)) {
    for (const modelId of objaverseFurnitureModels) {
      if (!shouldPrepareModel(modelId)) {
        continue
      }

      const source = join(objaverseSourceDir, modelId, 'source.glb')
      const target = modelOutputPath('objaverse', `${modelId}.optimized.glb`)
      optimizeModel(source, target)
    }
  }

  const manualSourceDir = join(ROOT, 'raw/assets/models/manual')

  if (shouldPrepare('manual') && existsSync(manualSourceDir)) {
    const manualFailures = []

    for (const entry of readdirSync(manualSourceDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue
      }

      const modelId = entry.name

      if (!shouldPrepareModel(modelId)) {
        continue
      }

      const sourceDir = join(manualSourceDir, modelId)
      const sourceGlb = join(sourceDir, 'source.glb')
      const sourceGltf = join(sourceDir, 'source.gltf')
      const sourceFbx = join(sourceDir, 'model.fbx')
      const sourceObj = manualObjSourcePath(sourceDir)
      const converted = join(sourceDir, `${modelId}.converted.glb`)
      const target = modelOutputPath('manual', `${modelId}.optimized.glb`)

      try {
        if (!forcePrepare && existsSync(target)) {
          continue
        }

        if (existsSync(sourceGlb)) {
          optimizeModel(sourceGlb, target)
        } else if (existsSync(sourceGltf)) {
          optimizeModel(sourceGltf, target)
        } else if (existsSync(sourceFbx)) {
          convertFbxToGlb(sourceFbx, converted)
          optimizeModel(converted, target)
        } else if (existsSync(sourceObj)) {
          convertObjToGlb(sourceObj, converted)
          optimizeModel(converted, target)
        } else {
          throw new Error(
            `Manual asset ${modelId} has no runtime-ready source.glb, source.gltf, model.fbx, or model.obj.`,
          )
        }
      } catch (error) {
        manualFailures.push({ modelId, error: error.message })
      }
    }

    writeFileSync(
      join(manualSourceDir, 'prepare-failures.json'),
      `${JSON.stringify(manualFailures, null, 2)}\n`,
    )
  }

  if (shouldPrepare('architectural')) {
    run('node', ['scripts/generate-architectural-assets.mjs'])

    for (const [category, modelIds] of Object.entries(architecturalEnvironmentModels)) {
      for (const modelId of modelIds) {
        const source = join(ROOT, `raw/assets/models/architectural/${modelId}.glb`)
        const target = modelOutputPath('architectural', `${modelId}.optimized.glb`)
        optimizeModel(source, target)
      }
    }
  }
}

function prepareHdri() {
  const input = join(ROOT, 'raw/assets/hdri/poly_haven_studio_1k.hdr')
  const output = join(ROOT, 'public/assets/hdri/poly_haven_studio_1k.hdr')

  if (!existsSync(input)) {
    return
  }

  ensureDir(dirname(output))
  cpSync(input, output)
}

if (shouldPrepare('textures')) {
  prepareTextures()
}
prepareModels()
if (shouldPrepare('hdri')) {
  prepareHdri()
}

console.log(
  `Prepared runtime assets from ${basename(join(ROOT, 'raw'))}/ using ${textureCompression} textures into ${modelOutputVariant} model output.`,
)
