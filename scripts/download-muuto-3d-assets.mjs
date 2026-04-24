import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const SOURCE_URL = 'https://download.muuto.com/digitalshowroom/#/gallery/3D-files'
const LICENSE_URL = 'https://professionals.muuto.com/toolbox/product-information/download-ad-files/'
const outputRoot = join(ROOT, 'raw/inbox/muuto')
const limit = Number.parseInt(process.env.MUUTO_LIMIT ?? '18', 10)
const filterPattern = process.env.MUUTO_FILTER ? new RegExp(process.env.MUUTO_FILTER, 'i') : null

const includeTerms = [
  'bench',
  'chair',
  'coffee table',
  'compile',
  'desk',
  'lamp',
  'mirror',
  'pendant',
  'shelf',
  'sofa',
  'stacked',
  'storage',
  'stool',
  'table',
]

const skipTerms = ['2d', 'revit', 'image', 'jpg', 'pdf']

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function runZip(args) {
  const result = spawnSync('unzip', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`unzip ${args.join(' ')} failed`)
  }
}

function walk(directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(path))
    } else {
      files.push(path)
    }
  }

  return files
}

function inferCategory(title) {
  const text = title.toLowerCase()
  if (text.includes('sofa') || text.includes('bench')) return 'sofa'
  if (text.includes('chair') || text.includes('stool')) return 'chair'
  if (text.includes('lamp') || text.includes('pendant')) return 'lighting'
  if (text.includes('shelf') || text.includes('storage')) return 'storage'
  if (text.includes('table') || text.includes('desk')) return 'table'
  if (text.includes('mirror')) return 'decor'
  return 'decor'
}

function dimensionsFor(category) {
  switch (category) {
    case 'sofa':
      return [220, 94, 82]
    case 'chair':
      return [66, 70, 84]
    case 'lighting':
      return [42, 42, 120]
    case 'storage':
      return [120, 45, 92]
    case 'table':
      return [120, 80, 74]
    default:
      return [44, 34, 54]
  }
}

function cleanProductName(filetitle) {
  return filetitle
    .replace(/\s*3D Files.*$/i, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
}

function isRelevant(file) {
  const text = `${file.filetitle} ${file.filename}`.toLowerCase()
  return (
    includeTerms.some((term) => text.includes(term)) &&
    !skipTerms.some((term) => text.includes(term)) &&
    (!filterPattern || filterPattern.test(`${file.filetitle} ${file.filename}`))
  )
}

async function fetchCandidates() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  let candidates = []

  page.on('response', async (response) => {
    if (!response.url().includes('/api/digitalshowroom/1/search')) return

    const json = await response.json().catch(() => null)
    if (!json?.file) return

    candidates = json.file
      .filter((file) => file.contenttype === 'application/zip')
      .filter(isRelevant)
      .map((file) => ({
        sourceProductId: String(file.KEY),
        productName: cleanProductName(file.filetitle),
        fileName: file.filename,
        title: file.filetitle,
        downloadUrl: `https://assets.presscloud.com${file.imageurl}`,
        sourceUrl: SOURCE_URL,
        fileSize: file.filesize,
      }))
  })

  await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(10000)
  await browser.close()

  return candidates.slice(0, limit || candidates.length)
}

async function download(url, target) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(target, buffer)
}

function chooseObj(extractDir) {
  const objFiles = walk(extractDir).filter((file) => file.toLowerCase().endsWith('.obj'))
  if (objFiles.length === 0) return null

  return objFiles.sort((a, b) => basename(a).length - basename(b).length)[0]
}

function writeManifest(assetDir, candidate, sourceObj) {
  const category = inferCategory(candidate.productName)
  writeFileSync(
    join(assetDir, 'manifest.json'),
    `${JSON.stringify(
      {
        assetId: `muuto-${slugify(candidate.productName)}-${candidate.sourceProductId}`,
        source: 'muuto',
        sourceUrl: candidate.sourceUrl,
        licenseUrl: LICENSE_URL,
        licenseType: 'personal-local',
        author: 'Muuto',
        brand: 'Muuto',
        productName: candidate.productName,
        category,
        dimensionsCm: dimensionsFor(category),
        preferredFormat: 'obj',
        fallbackFormats: ['obj'],
        redistributionStatus: 'personal-local',
        notes: `Original archive: ${candidate.title}. Selected OBJ: ${sourceObj}`,
      },
      null,
      2,
    )}\n`,
  )
}

ensureDir(outputRoot)

const candidates = await fetchCandidates()
const results = []

for (const candidate of candidates) {
  const assetId = `muuto-${slugify(candidate.productName)}-${candidate.sourceProductId}`
  const assetDir = join(outputRoot, assetId)
  const archivePath = join(assetDir, `${assetId}.zip`)
  const extractDir = join(assetDir, 'extracted')

  try {
    ensureDir(assetDir)
    if (!existsSync(archivePath)) {
      await download(candidate.downloadUrl, archivePath)
    }

    ensureDir(extractDir)
    runZip(['-o', archivePath, '-d', extractDir])

    const obj = chooseObj(extractDir)
    if (!obj) {
      throw new Error('No OBJ file found in archive')
    }

    writeManifest(assetDir, candidate, obj)
    results.push({ ...candidate, assetId, status: 'downloaded', selectedObj: obj })
  } catch (error) {
    results.push({ ...candidate, assetId, status: 'failed', error: error.message })
  }
}

writeFileSync(join(outputRoot, 'download-results.json'), `${JSON.stringify(results, null, 2)}\n`)
console.log(`Downloaded/staged ${results.filter((item) => item.status === 'downloaded').length}/${results.length} Muuto asset(s).`)
