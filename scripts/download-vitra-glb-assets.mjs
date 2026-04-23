import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const SOURCE_URL = 'https://downloads.vitra.com/#/media?media_category_media_type=root.cad.glb.'
const LICENSE_URL = 'https://downloads.vitra.com/#/media?media_category_media_type=root.cad.glb.'
const outputRoot = join(ROOT, 'raw/inbox/vitra')
const limit = Number.parseInt(process.env.VITRA_LIMIT ?? '14', 10)

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

function inferCategory(title) {
  const text = title.toLowerCase()
  if (text.includes('sofa') || text.includes('bench')) return 'sofa'
  if (text.includes('chair') || text.includes('stool')) return 'chair'
  if (text.includes('lamp') || text.includes('akari')) return 'lighting'
  if (text.includes('storage') || text.includes('shelf')) return 'storage'
  if (text.includes('table') || text.includes('desk') || text.includes('work')) return 'table'
  return 'chair'
}

function dimensionsFor(category) {
  switch (category) {
    case 'sofa':
      return [220, 94, 82]
    case 'lighting':
      return [42, 42, 120]
    case 'storage':
      return [120, 45, 92]
    case 'table':
      return [140, 80, 74]
    default:
      return [66, 70, 84]
  }
}

function cleanName(title) {
  return title.replace(/_glTF$/i, '').replace(/_/g, ' ').trim()
}

async function fetchAndDownload() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://downloads.vitra.com/', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(6000)

  const items = await page.evaluate(async (maxItems) => {
    const response = await fetch(
      `/api/v2/media?media_category_media_type=root.cad.glb.&per_page=${maxItems}&sorting=create_desc`,
      { credentials: 'include' },
    )
    const json = await response.json()
    return json.items
      .filter((item) => item.showdownload && item.files?.some((file) => file.key === 'master'))
      .slice(0, maxItems)
      .map((item) => ({
        id: item.id,
        title: item.title,
        size: item.files.find((file) => file.key === 'master')?.size ?? 0,
      }))
  }, limit || 20)

  const results = []

  for (const item of items) {
    const productName = cleanName(item.title)
    const assetId = `vitra-${slugify(productName)}-${item.id}`
    const assetDir = join(outputRoot, assetId)
    const archivePath = join(assetDir, `${assetId}.zip`)
    const extractDir = join(assetDir, 'extracted')

    try {
      ensureDir(assetDir)
      if (!existsSync(archivePath)) {
        const base64 = await page.evaluate(async ({ id }) => {
          await fetch('/api/v2/request_download', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ [id]: 'master' }),
          })

          const response = await fetch('/api/v2/download', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            credentials: 'include',
            body: new URLSearchParams({ [id]: 'master' }).toString(),
          })

          if (!response.ok) {
            throw new Error(`download returned ${response.status}`)
          }

          const buffer = await response.arrayBuffer()
          let binary = ''
          const bytes = new Uint8Array(buffer)
          const chunkSize = 0x8000
          for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
          }
          return btoa(binary)
        }, item)

        writeFileSync(archivePath, Buffer.from(base64, 'base64'))
      }

      ensureDir(extractDir)
      runZip(['-o', archivePath, '-d', extractDir])

      const category = inferCategory(productName)
      writeFileSync(
        join(assetDir, 'manifest.json'),
        `${JSON.stringify(
          {
            assetId,
            source: 'vitra',
            sourceUrl: SOURCE_URL,
            licenseUrl: LICENSE_URL,
            licenseType: 'personal-local',
            author: 'Vitra',
            brand: 'Vitra',
            productName,
            category,
            dimensionsCm: dimensionsFor(category),
            preferredFormat: 'glb',
            fallbackFormats: ['glb', 'gltf'],
            redistributionStatus: 'personal-local',
          },
          null,
          2,
        )}\n`,
      )

      results.push({ ...item, assetId, status: 'downloaded' })
    } catch (error) {
      results.push({ ...item, assetId, status: 'failed', error: error.message })
    }
  }

  await browser.close()
  return results
}

ensureDir(outputRoot)
const results = await fetchAndDownload()
writeFileSync(join(outputRoot, 'download-results.json'), `${JSON.stringify(results, null, 2)}\n`)
console.log(`Downloaded/staged ${results.filter((item) => item.status === 'downloaded').length}/${results.length} Vitra GLB asset(s).`)
