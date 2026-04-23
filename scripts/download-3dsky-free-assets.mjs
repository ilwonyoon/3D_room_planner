import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const outputRoot = join(ROOT, 'raw/inbox/3dsky')
const storageStatePath = join(ROOT, process.env.THREEDSKY_STATE ?? 'output/playwright/3dsky-state.json')
const headless = process.env.THREEDSKY_HEADLESS !== '0'
const downloadTimeoutMs = Number.parseInt(process.env.THREEDSKY_DOWNLOAD_TIMEOUT_MS ?? '180000', 10)
const limit = Number.parseInt(process.env.THREEDSKY_LIMIT ?? '3', 10)

const defaultPrioritySlugs = [
  'om_oficial_model_krovat_olivia_odnospalnaia_dlia_detei_i_podrostkov',
  'om_oficial_model_krovat_cherry_odnospalnaia_dlia_detei_i_podrostkov',
  'om_oficial_model_krovat_divan_oskar_s_vykatnym_iashchikom',
  'om_stul_larsen',
  'om_stul_hans',
  'om_stul_elbow',
  'om_stol_zhurnalnyi_stone_garden_01',
]

const requestedSlugs = (process.env.THREEDSKY_SLUGS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const targetSlugs = (requestedSlugs.length > 0 ? requestedSlugs : defaultPrioritySlugs).slice(0, limit)

function readStorageState() {
  return JSON.parse(readFileSync(storageStatePath, 'utf8'))
}

function writeStorageState(storageState) {
  writeFileSync(storageStatePath, `${JSON.stringify(storageState, null, 2)}\n`)
}

function localStorageEntry(storageState, name) {
  return storageState.origins
    ?.find((item) => item.origin === 'https://3dsky.org')
    ?.localStorage?.find((item) => item.name === name)
}

function readAuthToken() {
  const storageState = readStorageState()
  const token = localStorageEntry(storageState, 'skyAuthToken')?.value

  if (!token) {
    throw new Error(`Missing skyAuthToken in ${storageStatePath}`)
  }

  return token
}

function readRefreshToken() {
  const storageState = readStorageState()
  const token = localStorageEntry(storageState, 'skyRefreshToken')?.value

  if (!token) {
    throw new Error(`Missing skyRefreshToken in ${storageStatePath}`)
  }

  return token
}

async function refreshAuthToken() {
  const refreshToken = readRefreshToken()
  const response = await fetch('https://auth.3dsky.org/api/token/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  })

  const payload = await response.json()

  if (!response.ok || !payload?.data?.token) {
    throw new Error(`3dsky token refresh failed: ${response.status} ${JSON.stringify(payload).slice(0, 400)}`)
  }

  const storageState = readStorageState()
  const authEntry = localStorageEntry(storageState, 'skyAuthToken')
  const refreshEntry = localStorageEntry(storageState, 'skyRefreshToken')

  if (authEntry) {
    authEntry.value = payload.data.token
  }

  if (refreshEntry && payload.data.refresh_token) {
    refreshEntry.value = payload.data.refresh_token
  }

  writeStorageState(storageState)
  return payload.data.token
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCase(value) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeBrand(value) {
  return value
    .replace(/\b\d+\s+followers?\b/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferCategory(text) {
  const normalized = text.toLowerCase()

  if (normalized.includes('sofa')) return 'sofa'
  if (normalized.includes('bed')) return 'bed'
  if (normalized.includes('chair') || normalized.includes('stool')) return 'chair'
  if (normalized.includes('table') || normalized.includes('desk')) return 'table'
  if (
    normalized.includes('cabinet') ||
    normalized.includes('sideboard') ||
    normalized.includes('wardrobe') ||
    normalized.includes('drawer') ||
    normalized.includes('shelf')
  ) {
    return 'storage'
  }
  if (
    normalized.includes('lamp') ||
    normalized.includes('light') ||
    normalized.includes('chandelier') ||
    normalized.includes('sconce')
  ) {
    return 'lighting'
  }

  return 'decor'
}

function cleanProductName(name) {
  return name
    .replace(/^OM\s*\(Official Model\)\s*/i, '')
    .replace(/^OM\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function dimensionsFrom(product) {
  const width = Number.parseFloat(product.widthCm ?? '')
  const depth = Number.parseFloat(product.lengthCm ?? '')
  const height = Number.parseFloat(product.heightCm ?? '')

  if ([width, depth, height].every((value) => Number.isFinite(value) && value > 0)) {
    return [width, depth, height]
  }

  switch (product.category) {
    case 'bed':
      return [160, 210, 100]
    case 'sofa':
      return [220, 94, 82]
    case 'chair':
      return [66, 70, 84]
    case 'table':
      return [110, 70, 46]
    case 'storage':
      return [120, 45, 92]
    case 'lighting':
      return [42, 42, 120]
    default:
      return [44, 34, 54]
  }
}

function writeManifest(assetDir, product) {
  const assetId = `3dsky-${slugify(product.slug)}`
  const manifest = {
    assetId,
    source: '3dsky',
    sourceUrl: product.url,
    licenseUrl: 'https://3dsky.org/faq/163/show',
    licenseType: 'personal-local',
    author: product.author,
    brand: product.brand,
    productName: product.productName,
    category: product.category,
    styleTags: ['modern', 'archviz', 'manufacturer-free'],
    preferredFormat: 'obj',
    fallbackFormats: ['fbx'],
    dimensionsCm: dimensionsFrom(product),
    redistributionStatus: 'personal-local',
    notes: `3dsky free model; platform ${product.platform}; render ${product.render}; size ${product.fileSize}.`,
  }

  writeFileSync(join(assetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

function extractArchive(archivePath, extractDir) {
  rmSync(extractDir, { recursive: true, force: true })
  ensureDir(extractDir)
  if (archivePath.endsWith('.rar')) {
    run('bsdtar', ['-xf', archivePath, '-C', extractDir])
    return
  }

  run('7z', ['x', '-y', archivePath, `-o${extractDir}`])
}

async function dismissOverlays(page) {
  for (const name of ['I agree', 'Got it']) {
    const button = page.getByRole('button', { name })
    if ((await button.count()) === 0) {
      continue
    }

    try {
      await button.click({ timeout: 1500 })
    } catch {}
  }
}

async function readProduct(page, slug) {
  const url = `https://3dsky.org/3dmodels/show/${slug}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ state: 'attached', timeout: 15000 })
  await dismissOverlays(page)

  return page.evaluate(() => {
    const text = (selector) => {
      const element = document.querySelector(selector)
      return element?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    }

    const rows = Array.from(document.querySelectorAll('table tr'))
    const valueFor = (label) => {
      const row = rows.find((item) => item.textContent?.toLowerCase().includes(label.toLowerCase()))
      const cells = row?.querySelectorAll('td')
      return cells && cells.length > 1 ? cells[1].textContent?.replace(/\s+/g, ' ').trim() ?? '' : ''
    }

    const author = text('h1') ? text('h1') : ''
    const username = text('a[href^="/users/"]') || text('[href^="/users/"]')
    const title = text('h1')
    const category = text('a[href*="cat=furniture"], a[href*="cat=lighting"], a[href*="cat=dekor"]')

    return {
      title,
      username,
      categoryLabel: category,
      platform: valueFor('Platform:'),
      render: valueFor('Render:'),
      fileSize: valueFor('Size:'),
      polygons: valueFor('Polygons:'),
      lengthCm: valueFor('Length:').replace(/[^\d.]/g, ''),
      widthCm: valueFor('Width:').replace(/[^\d.]/g, ''),
      heightCm: valueFor('Height:').replace(/[^\d.]/g, ''),
      style: valueFor('Style:'),
      materials: valueFor('Materials:'),
    }
  })
}

async function resolveDownloadUrl(page, slug, authToken) {
  const fetchDownloadResponse = async (token) =>
    page.evaluate(
      async ({ slug: modelSlug, token: bearerToken }) => {
        const result = await fetch(`/api/models/download/${modelSlug}`, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            Accept: 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
          },
        })

        return {
          ok: result.ok,
          status: result.status,
          body: await result.text(),
        }
      },
      { slug, token },
    )

  let response = await fetchDownloadResponse(authToken)

  if (response.status === 401 && response.body.includes('expired')) {
    const nextToken = await refreshAuthToken()
    response = await fetchDownloadResponse(nextToken)
  }

  if (!response.ok) {
    throw new Error(`3dsky download API failed for ${slug}: ${response.status} ${response.body.slice(0, 300)}`)
  }

  let payload
  try {
    payload = JSON.parse(response.body)
  } catch (error) {
    throw new Error(`3dsky download API returned invalid JSON for ${slug}: ${error.message}`)
  }

  const secureUrl = payload?.data?.url
  if (!secureUrl) {
    throw new Error(`3dsky download API did not return a secure URL for ${slug}`)
  }

  return secureUrl
}

async function saveArchive(secureUrl, archivePath) {
  const response = await fetch(secureUrl, {
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Secure archive download failed: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(archivePath, buffer)
}

async function downloadProduct(page, slug, authToken) {
  const detail = await readProduct(page, slug)
  const productName = cleanProductName(detail.title || titleCase(slug))
  const brand = normalizeBrand(detail.username || '3dsky Official Model')
  const category = inferCategory(`${detail.categoryLabel} ${productName}`)
  const assetId = `3dsky-${slugify(slug)}`
  const assetDir = join(outputRoot, assetId)
  const archivePath = join(assetDir, `${assetId}.rar`)
  const extractDir = join(assetDir, 'extracted')
  const url = `https://3dsky.org/3dmodels/show/${slug}`

  ensureDir(assetDir)
  const manifest = writeManifest(assetDir, {
    slug,
    url,
    author: brand,
    brand,
    productName,
    category,
    platform: detail.platform,
    render: detail.render,
    fileSize: detail.fileSize,
    widthCm: detail.widthCm,
    lengthCm: detail.lengthCm,
    heightCm: detail.heightCm,
  })

  if (existsSync(archivePath) && existsSync(extractDir) && readdirSync(extractDir).length > 0) {
    return { assetId, status: 'exists', manifest }
  }

  const secureUrl = await resolveDownloadUrl(page, slug, authToken)
  await saveArchive(secureUrl, archivePath)
  extractArchive(archivePath, extractDir)

  return {
    assetId,
    status: 'downloaded',
    archiveUrl: secureUrl,
    manifest,
  }
}

async function main() {
  if (!existsSync(storageStatePath)) {
    throw new Error(`Missing 3dsky storage state: ${storageStatePath}`)
  }

  ensureDir(outputRoot)
  const authToken = readAuthToken()

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({
    acceptDownloads: true,
    storageState: storageStatePath,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)

  try {
    const results = []
    for (const [index, slug] of targetSlugs.entries()) {
      console.log(`[3dsky] ${index + 1}/${targetSlugs.length} ${slug}`)
      try {
        results.push(await downloadProduct(page, slug, authToken))
      } catch (error) {
        results.push({ assetId: `3dsky-${slugify(slug)}`, slug, status: 'failed', error: error.message })
      }
    }

    writeFileSync(join(outputRoot, 'download-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    const downloaded = results.filter((item) => item.status === 'downloaded' || item.status === 'exists').length
    const failed = results.filter((item) => item.status === 'failed').length
    console.log(`Downloaded/staged ${downloaded}/${targetSlugs.length} 3dsky free model(s); failed ${failed}.`)
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
