import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const FREE_MODELS_URL = 'https://dimensiva.com/free-3d-models/'
const LICENSE_URL = 'https://dimensiva.com/license/'
const outputRoot = join(ROOT, 'raw/inbox/dimensiva')
const limit = Number.parseInt(process.env.DIMENSIVA_LIMIT ?? '0', 10)
const filterPattern = process.env.DIMENSIVA_FILTER ? new RegExp(process.env.DIMENSIVA_FILTER, 'i') : null

const includeTerms = [
  'armchair',
  'basket',
  'bed',
  'bench',
  'bookcase',
  'bookend',
  'cabinet',
  'candleholder',
  'chair',
  'clock',
  'coat',
  'desk',
  'lamp',
  'light',
  'mirror',
  'pedestal',
  'sideboard',
  'sofa',
  'stand',
  'table',
  'vase',
]

const skipTerms = [
  'camera',
  'iphone',
  'keyboard',
  'perfume',
  'phone booth',
  'poster',
  'samsung',
  'speaker',
  'textile',
  'tv',
  'wallpaper',
]

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function fetchText(url) {
  const result = spawnSync('curl', ['-L', '-s', url], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return result.stdout
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&#038;/g, 'and')
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function decodeHtml(value) {
  return value
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&hellip;/g, '...')
    .replace(/&quot;/g, '"')
}

function inferCategory(title) {
  const lower = title.toLowerCase()

  if (lower.includes('sofa') || lower.includes('bench')) return 'sofa'
  if (lower.includes('bed')) return 'bed'
  if (lower.includes('chair') || lower.includes('stool')) return 'chair'
  if (lower.includes('lamp') || lower.includes('light')) return 'lighting'
  if (
    lower.includes('cabinet') ||
    lower.includes('bookcase') ||
    lower.includes('sideboard') ||
    lower.includes('desk body')
  ) {
    return 'storage'
  }
  if (lower.includes('table') || lower.includes('desk')) return 'table'

  return 'decor'
}

function dimensionsFor(category) {
  switch (category) {
    case 'sofa':
      return [220, 94, 82]
    case 'bed':
      return [210, 160, 90]
    case 'chair':
      return [62, 66, 82]
    case 'table':
      return [110, 70, 46]
    case 'storage':
      return [120, 45, 92]
    case 'lighting':
      return [42, 42, 120]
    default:
      return [42, 34, 52]
  }
}

function parseBrandAndProduct(title) {
  const cleanTitle = decodeHtml(title)
  const split = cleanTitle.split(/\s+by\s+/i)

  if (split.length >= 2) {
    return {
      productName: split.slice(0, -1).join(' by '),
      brand: split[split.length - 1],
    }
  }

  return {
    productName: cleanTitle,
    brand: 'Dimensiva',
  }
}

function parseRows(html) {
  const rows = []
  const regex =
    /<div class="edd_download" id="edd_download_(\d+)">[\s\S]*?<a href="([^"]+)" title="([^"]+)"/g
  let match

  while ((match = regex.exec(html))) {
    const title = decodeHtml(match[3])
    const lower = title.toLowerCase()

    if (!includeTerms.some((term) => lower.includes(term))) {
      continue
    }

    if (skipTerms.some((term) => lower.includes(term))) {
      continue
    }

    rows.push({
      downloadId: match[1],
      sourceUrl: match[2],
      title,
    })
  }

  return rows
}

function writeManifest(assetDir, row) {
  const category = inferCategory(row.title)
  const { brand, productName } = parseBrandAndProduct(row.title)
  const assetId = `dimensiva-${slugify(row.title)}`

  writeFileSync(
    join(assetDir, 'manifest.json'),
    `${JSON.stringify(
      {
        assetId,
        source: 'dimensiva',
        sourceUrl: row.sourceUrl,
        downloadUrl: `${FREE_MODELS_URL}?edd_action=free_downloads_process_download&download_id=${row.downloadId}&price_ids=`,
        licenseUrl: LICENSE_URL,
        licenseType: 'personal-local',
        author: 'Dimensiva',
        brand,
        productName,
        category,
        styleTags: ['modern', 'archviz', 'photoreal'],
        preferredFormat: 'fbx',
        fallbackFormats: ['obj', 'glb', 'gltf'],
        dimensionsCm: dimensionsFor(category),
        redistributionStatus: 'personal-local',
        notes: 'Free Dimensiva download imported for local personal portfolio use.',
      },
      null,
      2,
    )}\n`,
  )
}

function downloadRow(row) {
  const assetId = `dimensiva-${slugify(row.title)}`
  const assetDir = join(outputRoot, assetId)
  const archive = join(assetDir, `${assetId}.zip`)
  const extractDir = join(assetDir, 'extracted')
  const downloadUrl = `${FREE_MODELS_URL}?edd_action=free_downloads_process_download&download_id=${row.downloadId}&price_ids=`

  ensureDir(assetDir)
  writeManifest(assetDir, row)

  if (!existsSync(archive)) {
    run('curl', ['-L', '--fail', '--retry', '2', downloadUrl, '-o', archive])
  }

  const hasExtractedFiles = existsSync(extractDir) && readdirSync(extractDir).length > 0
  if (!hasExtractedFiles) {
    ensureDir(extractDir)
    run('unzip', ['-o', archive, '-d', extractDir])
  }
}

ensureDir(outputRoot)

const html = existsSync(join(outputRoot, 'free-3d-models.html'))
  ? readFileSync(join(outputRoot, 'free-3d-models.html'), 'utf8')
  : fetchText(FREE_MODELS_URL)

writeFileSync(join(outputRoot, 'free-3d-models.html'), html)

const rows = parseRows(html)
const filteredRows = filterPattern
  ? rows.filter((row) => filterPattern.test(`${row.title} ${row.sourceUrl}`))
  : rows
const selectedRows = limit > 0 ? filteredRows.slice(0, limit) : filteredRows

for (const row of selectedRows) {
  downloadRow(row)
}

writeFileSync(
  join(outputRoot, 'downloaded-candidates.json'),
  `${JSON.stringify(selectedRows, null, 2)}\n`,
)

console.log(`Downloaded/staged ${selectedRows.length} Dimensiva free candidate(s).`)
