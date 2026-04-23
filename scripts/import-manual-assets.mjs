import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const inboxRoot = process.env.ASSET_INBOX_DIR
  ? isAbsolute(process.env.ASSET_INBOX_DIR)
    ? process.env.ASSET_INBOX_DIR
    : join(ROOT, process.env.ASSET_INBOX_DIR)
  : join(ROOT, 'raw/inbox')
const outputRoot = join(ROOT, 'raw/assets/models/manual')
const allowReviewRequired = process.env.ASSET_IMPORT_ALLOW_REVIEW_REQUIRED === '1'
const acceptedStatuses = new Set(['approved', 'personal-local'])

const requiredFields = [
  'assetId',
  'source',
  'sourceUrl',
  'licenseUrl',
  'author',
  'brand',
  'productName',
  'category',
  'dimensionsCm',
  'redistributionStatus',
]

const supportedExtensions = ['.glb', '.gltf', '.fbx', '.obj']
const runtimeExtensions = ['.glb', '.gltf', '.fbx', '.obj']

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function isDirectoryEntry(path, entry) {
  return entry.isDirectory() && !entry.name.startsWith('.')
}

function assertValidAssetId(assetId) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(assetId)) {
    throw new Error(
      `Invalid assetId "${assetId}". Use lowercase letters, numbers, and hyphens only.`,
    )
  }
}

function validateManifest(manifest, manifestPath) {
  const missing = requiredFields.filter((field) => manifest[field] === undefined)
  if (missing.length > 0) {
    throw new Error(`${manifestPath} is missing required fields: ${missing.join(', ')}`)
  }

  assertValidAssetId(manifest.assetId)

  if (
    !Array.isArray(manifest.dimensionsCm) ||
    manifest.dimensionsCm.length !== 3 ||
    manifest.dimensionsCm.some((value) => typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw new Error(`${manifestPath} must provide dimensionsCm as [width, depth, height] numbers.`)
  }

  if (manifest.redistributionStatus === 'rejected') {
    throw new Error(`${manifestPath} is marked rejected and cannot be imported.`)
  }

  if (!acceptedStatuses.has(manifest.redistributionStatus) && !allowReviewRequired) {
    throw new Error(
      `${manifestPath} has redistributionStatus="${manifest.redistributionStatus}". ` +
        'Use "approved" for distributable assets or "personal-local" for personal portfolio work. ' +
        'Set ASSET_IMPORT_ALLOW_REVIEW_REQUIRED=1 only for local staging, not for shipping.',
    )
  }
}

function collectCandidateDirectories() {
  if (!existsSync(inboxRoot)) {
    return []
  }

  const candidates = []

  for (const sourceEntry of readdirSync(inboxRoot, { withFileTypes: true })) {
    if (!isDirectoryEntry(inboxRoot, sourceEntry)) {
      continue
    }

    const sourceDir = join(inboxRoot, sourceEntry.name)
    const directManifest = join(sourceDir, 'manifest.json')

    if (existsSync(directManifest)) {
      candidates.push(sourceDir)
      continue
    }

    for (const assetEntry of readdirSync(sourceDir, { withFileTypes: true })) {
      if (!isDirectoryEntry(sourceDir, assetEntry)) {
        continue
      }

      const assetDir = join(sourceDir, assetEntry.name)
      if (existsSync(join(assetDir, 'manifest.json'))) {
        candidates.push(assetDir)
      }
    }
  }

  return candidates
}

function walkFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(path))
      continue
    }

    files.push(path)
  }

  return files
}

function chooseSourceFile(candidateDir, manifest) {
  const files = walkFiles(candidateDir).filter((file) => {
    const name = basename(file).toLowerCase()
    const extension = extname(name)
    return supportedExtensions.includes(extension) && name !== 'manifest.json'
  })

  if (files.length === 0) {
    throw new Error(`${candidateDir} has no supported model file: ${supportedExtensions.join(', ')}`)
  }

  const preferredFormats = [
    manifest.preferredFormat,
    ...(Array.isArray(manifest.fallbackFormats) ? manifest.fallbackFormats : []),
    'glb',
    'gltf',
    'fbx',
    'obj',
  ]
    .filter(Boolean)
    .map((format) => `.${String(format).replace(/^\./, '').toLowerCase()}`)

  for (const extension of preferredFormats) {
    const match = files.find((file) => extname(file).toLowerCase() === extension)
    if (match) {
      return match
    }
  }

  return files[0]
}

function canonicalModelName(sourceFile) {
  const extension = extname(sourceFile).toLowerCase()

  if (extension === '.glb') {
    return 'source.glb'
  }

  if (extension === '.gltf') {
    return 'source.gltf'
  }

  if (extension === '.fbx') {
    return 'model.fbx'
  }

  if (extension === '.obj') {
    return 'model.obj'
  }

  throw new Error(`Unsupported model extension: ${extension}`)
}

function importCandidate(candidateDir) {
  const manifestPath = join(candidateDir, 'manifest.json')
  const manifest = readJson(manifestPath)
  validateManifest(manifest, manifestPath)

  const sourceFile = chooseSourceFile(candidateDir, manifest)
  const extension = extname(sourceFile).toLowerCase()
  const targetDir = join(outputRoot, manifest.assetId)
  const targetFile = join(targetDir, canonicalModelName(sourceFile))
  const relativeSourceFile = relative(candidateDir, sourceFile)

  rmSync(targetDir, { recursive: true, force: true })
  ensureDir(dirname(targetFile))

  cpSync(candidateDir, join(targetDir, 'source-package'), { recursive: true })

  const sourcePayloadDir = dirname(sourceFile)
  if (sourcePayloadDir !== candidateDir) {
    for (const entry of readdirSync(sourcePayloadDir, { withFileTypes: true })) {
      const payloadSource = join(sourcePayloadDir, entry.name)
      const payloadTarget = join(targetDir, entry.name)

      if (entry.isDirectory()) {
        cpSync(payloadSource, payloadTarget, { recursive: true })
        continue
      }

      copyFileSync(payloadSource, payloadTarget)
    }
  }

  copyFileSync(sourceFile, targetFile)

  const sourceJson = {
    ...manifest,
    importedAt: new Date().toISOString(),
    inboxPath: relative(ROOT, candidateDir),
    originalModelFile: relativeSourceFile,
    canonicalModelFile: basename(targetFile),
    runtimePrepareStatus: runtimeExtensions.includes(extension) ? 'ready' : 'staged-only',
  }

  writeFileSync(join(targetDir, 'source.json'), `${JSON.stringify(sourceJson, null, 2)}\n`)

  return sourceJson
}

const candidates = collectCandidateDirectories()

if (candidates.length === 0) {
  console.log(`No manual asset candidates found under ${relative(ROOT, inboxRoot)}.`)
  process.exit(0)
}

ensureDir(outputRoot)

const imported = []
const skipped = []

for (const candidate of candidates) {
  try {
    imported.push(importCandidate(candidate))
  } catch (error) {
    skipped.push({
      candidate: relative(ROOT, candidate),
      error: error.message,
    })
  }
}

writeFileSync(
  join(outputRoot, 'catalog-candidates.json'),
  `${JSON.stringify(
    imported.map((item) => ({
      assetId: item.assetId,
      source: item.source,
      brand: item.brand,
      productName: item.productName,
      category: item.category,
      dimensionsCm: item.dimensionsCm,
      sourceUrl: item.sourceUrl,
      licenseUrl: item.licenseUrl,
      redistributionStatus: item.redistributionStatus,
      runtimePrepareStatus: item.runtimePrepareStatus,
    })),
    null,
    2,
  )}\n`,
)

writeFileSync(join(outputRoot, 'import-skipped.json'), `${JSON.stringify(skipped, null, 2)}\n`)

console.log(
  `Imported ${imported.length} manual asset candidate(s) into ${relative(ROOT, outputRoot)}. ` +
    `Skipped ${skipped.length}.`,
)
