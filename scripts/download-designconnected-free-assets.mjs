import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const FREEBIES_URL = 'https://www.designconnected.com/freebies'
const LICENSE_URL = 'https://www.designconnected.com/faq'
const outputRoot = join(ROOT, 'raw/inbox/designconnected')
const storageStatePath = join(ROOT, process.env.DESIGNCONNECTED_STATE ?? 'output/playwright/designconnected-state.json')
const limit = Number.parseInt(process.env.DESIGNCONNECTED_LIMIT ?? '0', 10)
const headless = process.env.DESIGNCONNECTED_HEADLESS !== '0'
const downloadTimeoutMs = Number.parseInt(process.env.DESIGNCONNECTED_DOWNLOAD_TIMEOUT_MS ?? '180000', 10)
const forcedIds = new Set(
  (process.env.DESIGNCONNECTED_ID_FILTER ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const includeTerms = [
  'armchair',
  'bench',
  'bookcase',
  'cabinet',
  'chair',
  'chaise',
  'clock',
  'console',
  'desk',
  'lamp',
  'light',
  'mirror',
  'nightstand',
  'pedestal',
  'shelf',
  'sideboard',
  'sofa',
  'stool',
  'table',
  'vase',
]

const skipTerms = [
  'carpet',
  'curtain',
  'material',
  'rug',
  'shower',
  'textile',
  'veneer',
  'wall covering',
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

function runZip(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0 && result.status !== 1) {
    console.warn(`[designconnected] continuing after ${command} exit ${result.status}: ${args.join(' ')}`)
  }
}

function expandNestedZips(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      expandNestedZips(entryPath)
      continue
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.zip')) {
      continue
    }

    const nestedTarget = entryPath.slice(0, -4)
    ensureDir(nestedTarget)
    runZip('unzip', ['-o', entryPath, '-d', nestedTarget])
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function inferCategory(product) {
  const text = `${product.name} ${product.url}`.toLowerCase()

  if (text.includes('rug') || text.includes('carpet')) return 'rug'
  if (text.includes('sofa') || text.includes('bench') || text.includes('chaise')) return 'sofa'
  if (text.includes('bed') || text.includes('nightstand')) return 'bed'
  if (text.includes('chair') || text.includes('stool')) return 'chair'
  if (text.includes('lamp') || text.includes('light')) return 'lighting'
  if (
    text.includes('bookcase') ||
    text.includes('cabinet') ||
    text.includes('console') ||
    text.includes('shelf') ||
    text.includes('sideboard')
  ) {
    return 'storage'
  }
  if (text.includes('table') || text.includes('desk')) return 'table'

  return 'decor'
}

function dimensionsFor(category) {
  switch (category) {
    case 'sofa':
      return [220, 94, 82]
    case 'bed':
      return [210, 160, 90]
    case 'chair':
      return [66, 70, 84]
    case 'table':
      return [110, 70, 46]
    case 'storage':
      return [120, 45, 92]
    case 'lighting':
      return [42, 42, 120]
    case 'rug':
      return [240, 160, 2]
    default:
      return [44, 34, 54]
  }
}

function isRelevant(product) {
  if (forcedIds.has(product.sourceProductId)) {
    return true
  }

  const text = `${product.name} ${product.brand} ${product.url}`.toLowerCase()

  if (skipTerms.some((term) => text.includes(term))) {
    return false
  }

  return includeTerms.some((term) => text.includes(term))
}

async function clickLoadMoreUntilDone(page) {
  for (let index = 0; index < 80; index += 1) {
    const before = await page.locator('a[href*="_p"]').count()
    const button = page.locator('button:has-text("load more"), a:has-text("load more")').last()

    if ((await button.count()) === 0 || !(await button.isVisible())) {
      break
    }

    await button.click()
    await page.waitForTimeout(1800)
    const after = await page.locator('a[href*="_p"]').count()

    if (after <= before) {
      break
    }
  }
}

async function extractProducts(page) {
  return page.evaluate(() => {
    const byId = new Map()

    for (const anchor of Array.from(document.querySelectorAll('a[href*="_p"]'))) {
      const href = anchor.href
      const idMatch = href.match(/_p(\d+)/)
      if (!idMatch) continue

      const text = anchor.textContent.trim()
      const imageAlt = anchor.querySelector('img')?.getAttribute('alt')?.trim() ?? ''
      const name = text || imageAlt
      if (!name) continue

      const card =
        anchor.closest('.col-xs-6, .col-sm-4, .col-md-3, .dc4_modelBox, .product-box') ??
        anchor.parentElement
      const links = Array.from(card?.querySelectorAll('a') ?? [])
      const brand =
        links
          .map((link) => link.textContent.trim())
          .find((value) => value && value !== name && !value.includes('3d model')) ?? 'Design Connected'

      if (!byId.has(idMatch[1])) {
        byId.set(idMatch[1], {
          sourceProductId: idMatch[1],
          name,
          brand,
          url: href,
        })
      }
    }

    return Array.from(byId.values())
  })
}

async function openDownloadModal(page, product) {
  await page.evaluate((id) => window.addFreeToDownload(Number(id)), product.sourceProductId)
  await page.waitForSelector('#modal-download', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('#modal-download input.formats', { timeout: 30000 })
}

async function downloadProduct(page, product) {
  const assetId = `designconnected-${slugify(product.name)}-${product.sourceProductId}`
  const assetDir = join(outputRoot, assetId)
  const archive = join(assetDir, `${assetId}.zip`)
  const extractDir = join(assetDir, 'extracted')

  ensureDir(assetDir)

  const category = inferCategory(product)
  writeFileSync(
    join(assetDir, 'manifest.json'),
    `${JSON.stringify(
      {
        assetId,
        source: 'designconnected',
        sourceUrl: product.url,
        licenseUrl: LICENSE_URL,
        licenseType: 'personal-local',
        author: 'Design Connected',
        brand: product.brand,
        productName: product.name,
        category,
        styleTags: ['modern', 'archviz', 'photoreal'],
        preferredFormat: 'fbx',
        fallbackFormats: ['obj', 'glb', 'gltf'],
        dimensionsCm: dimensionsFor(category),
        redistributionStatus: 'personal-local',
        notes: 'Free Design Connected sample imported for local personal portfolio use.',
      },
      null,
      2,
    )}\n`,
  )

  if (existsSync(archive) && existsSync(extractDir) && readdirSync(extractDir).length > 0) {
    expandNestedZips(extractDir)
    return { status: 'exists', assetId }
  }

  await openDownloadModal(page, product)

  const hasObjFbx = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#modal-download input.formats')).some(
      (input) => input.dataset.groupId === '4',
    ),
  )

  if (!hasObjFbx) {
    await page.keyboard.press('Escape')
    return { status: 'skipped-no-obj-fbx', assetId }
  }

  const download = await Promise.all([
    page.waitForEvent('download', { timeout: downloadTimeoutMs }),
    page.evaluate(() => {
      document.querySelectorAll('#modal-download input.formats').forEach((input) => {
        input.checked = ['4', '7'].includes(input.dataset.groupId)
      })
      window.streamDropboxDownload()
    }),
  ]).then(([receivedDownload]) => receivedDownload)

  const suggestedPath = join(assetDir, download.suggestedFilename())
  await download.saveAs(suggestedPath)

  if (suggestedPath !== archive) {
    rmSync(archive, { force: true })
    renameSync(suggestedPath, archive)
  }

  rmSync(extractDir, { recursive: true, force: true })
  ensureDir(extractDir)
  runZip('unzip', ['-o', archive, '-d', extractDir])
  expandNestedZips(extractDir)

  await page.keyboard.press('Escape')
  return { status: 'downloaded', assetId }
}

async function main() {
  if (!existsSync(storageStatePath)) {
    throw new Error(
      `Missing Design Connected storage state: ${storageStatePath}. Log in with the Playwright browser and save state first.`,
    )
  }

  ensureDir(outputRoot)

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({
    acceptDownloads: true,
    storageState: storageStatePath,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)

  try {
    await page.goto(FREEBIES_URL, { waitUntil: 'networkidle' })
    await clickLoadMoreUntilDone(page)

    const allProducts = await extractProducts(page)
    const candidates = forcedIds.size > 0 ? allProducts.filter((product) => forcedIds.has(product.sourceProductId)) : allProducts.filter(isRelevant)
    const selected = limit > 0 ? candidates.slice(0, limit) : candidates

    writeFileSync(join(outputRoot, 'freebies-candidates.json'), `${JSON.stringify(selected, null, 2)}\n`)

    const results = []
    for (const [index, product] of selected.entries()) {
      console.log(`[designconnected] ${index + 1}/${selected.length} ${product.name}`)
      try {
        results.push({ product, ...(await downloadProduct(page, product)) })
      } catch (error) {
        results.push({ product, status: 'failed', error: error.message })
        await page.goto(FREEBIES_URL, { waitUntil: 'networkidle' })
      }
    }

    writeFileSync(join(outputRoot, 'download-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    const downloaded = results.filter((item) => item.status === 'downloaded' || item.status === 'exists').length
    const skipped = results.filter((item) => item.status === 'skipped-no-obj-fbx').length
    const failed = results.filter((item) => item.status === 'failed').length
    console.log(
      `Downloaded/staged ${downloaded} Design Connected candidate(s); skipped ${skipped} without OBJ/FBX; failed ${failed}.`,
    )
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
