import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const outputRoot = join(ROOT, 'raw/inbox/zeel')
const licenseUrl = 'https://zeelproject.com/legal/content-license-agreement/'
const chromeProfileDir =
  process.env.ZEEL_CHROME_PROFILE_DIR ??
  join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 1')
const chromeLocalStatePath =
  process.env.ZEEL_CHROME_LOCAL_STATE ??
  join(process.env.HOME, 'Library/Application Support/Google/Chrome/Local State')
const remoteDebugPort = Number.parseInt(process.env.ZEEL_REMOTE_DEBUG_PORT ?? '9223', 10)

const targetProducts = [
  'https://zeelproject.com/37445-o-sofa.html',
  'https://zeelproject.com/37411-blown-armchair.html',
  'https://zeelproject.com/37243-simple-table.html',
  'https://zeelproject.com/35570-rounded-commode.html',
  'https://zeelproject.com/35561-rounded-cabinet.html',
  'https://zeelproject.com/35527-flamingo-chair.html',
  'https://zeelproject.com/35509-coffee-table.html',
  'https://zeelproject.com/54805-bed-platform.html',
  'https://zeelproject.com/49281-bed-enya.html',
  'https://zeelproject.com/54778-lounge-chair-botero.html',
  'https://zeelproject.com/54813-chair-degas.html',
  'https://zeelproject.com/49311-sofa-argo.html',
]
const limit = Number.parseInt(process.env.ZEEL_LIMIT ?? String(targetProducts.length), 10)

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

function inferCategory(text) {
  const normalized = text.toLowerCase()

  if (normalized.includes('sofa') || normalized.includes('armchair')) return 'sofa'
  if (normalized.includes('bed')) return 'bed'
  if (normalized.includes('chair') || normalized.includes('stool')) return 'chair'
  if (normalized.includes('table') || normalized.includes('desk')) return 'table'
  if (
    normalized.includes('cabinet') ||
    normalized.includes('commode') ||
    normalized.includes('drawer') ||
    normalized.includes('shelf') ||
    normalized.includes('sideboard')
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

function dimensionsFrom(product) {
  if (
    Array.isArray(product.dimensionsCm) &&
    product.dimensionsCm.length === 3 &&
    product.dimensionsCm.every((value) => Number.isFinite(value) && value > 0)
  ) {
    return product.dimensionsCm
  }

  switch (product.category) {
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
    default:
      return [44, 34, 54]
  }
}

function extractArchive(archivePath, extractDir) {
  rmSync(extractDir, { recursive: true, force: true })
  ensureDir(extractDir)

  if (archivePath.endsWith('.rar')) {
    run('bsdtar', ['-xf', archivePath, '-C', extractDir])
    return
  }

  run('unzip', ['-o', archivePath, '-d', extractDir])
}

function writeManifest(assetDir, product) {
  const assetId = `zeel-${slugify(product.brand)}-${slugify(product.productName)}`
  const manifest = {
    assetId,
    source: 'zeel',
    sourceUrl: product.sourceUrl,
    licenseUrl,
    licenseType: 'personal-local',
    author: product.brand,
    brand: product.brand,
    productName: product.productName,
    category: product.category,
    styleTags: ['modern', 'archviz', 'manufacturer-free'],
    preferredFormat: 'fbx',
    fallbackFormats: ['obj'],
    dimensionsCm: dimensionsFrom(product),
    redistributionStatus: 'personal-local',
    notes: `Zeel Project direct brand download staged from ${product.sourceUrl}.`,
  }

  writeFileSync(join(assetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

function launchChromeClone() {
  if (!existsSync(chromeProfileDir)) {
    throw new Error(`Missing Chrome profile: ${chromeProfileDir}`)
  }

  if (!existsSync(chromeLocalStatePath)) {
    throw new Error(`Missing Chrome Local State: ${chromeLocalStatePath}`)
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'chrome-zeel-'))
  run('cp', ['-R', chromeProfileDir, join(userDataDir, 'Profile 1')])
  run('cp', [chromeLocalStatePath, join(userDataDir, 'Local State')])

  spawnSync('pkill', ['-f', `remote-debugging-port=${String(remoteDebugPort)}`], {
    stdio: 'ignore',
    shell: false,
  })

  const openResult = spawnSync(
    'open',
    [
      '-na',
      'Google Chrome',
      '--args',
      `--remote-debugging-port=${String(remoteDebugPort)}`,
      `--user-data-dir=${userDataDir}`,
      '--profile-directory=Profile 1',
      'about:blank',
    ],
    {
      cwd: ROOT,
      shell: false,
    },
  )

  if (openResult.error || openResult.status !== 0) {
    throw openResult.error ?? new Error('Failed to launch Chrome clone for Zeel intake.')
  }

  return userDataDir
}

async function waitForChrome() {
  for (let index = 0; index < 20; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${String(remoteDebugPort)}/json/version`)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  throw new Error(`Chrome remote debugging on port ${String(remoteDebugPort)} did not become ready.`)
}

async function connectToChrome() {
  let lastError

  for (let index = 0; index < 10; index += 1) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${String(remoteDebugPort)}`)
    } catch (error) {
      lastError = error
      await new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    }
  }

  throw lastError ?? new Error('Failed to connect to Chrome remote debugging session.')
}

async function extractProduct(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  const product = await page.evaluate(() => {
    const body = document.body.textContent?.replace(/\s+/g, ' ') ?? ''
    const title = document.querySelector('h1')?.textContent?.trim() ?? ''
    const brandLinks = Array.from(document.querySelectorAll('a[href*="/brands/"]'))
      .map((anchor) => anchor.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .filter((value) => value !== 'Brands')
    const brand = brandLinks[0] ?? 'Zeel Project'
    const button = Array.from(document.querySelectorAll('a')).find((anchor) =>
      /Download 3D Model/i.test(anchor.textContent ?? ''),
    )
    const downloadData = button?.getAttribute('onclick')?.match(/StartDownload\('(\d+)',\s*'([^']+)'\)/)
    const dimensionEntries = [...body.matchAll(/(Width|Depth|Length|Height)\s*-\s*([\d.,]+)\s*cm/gi)]
    const dimensionMap = Object.fromEntries(
      dimensionEntries.map((match) => [
        match[1].toLowerCase(),
        Number(match[2].replace(',', '.')),
      ]),
    )
    const width = dimensionMap.width
    const depth = dimensionMap.depth ?? dimensionMap.length
    const height = dimensionMap.height

    return {
      productName: title,
      brand,
      downloadFileId: downloadData?.[1] ?? '',
      downloadHash: downloadData?.[2] ?? '',
      dimensionsCm:
        Number.isFinite(width) && Number.isFinite(depth) && Number.isFinite(height)
          ? [width, depth, height]
          : null,
    }
  })

  if (!product.downloadFileId || !product.downloadHash) {
    throw new Error(`No Zeel download metadata found for ${url}`)
  }

  return {
    ...product,
    sourceUrl: url,
    category: inferCategory(`${product.productName} ${product.brand}`),
  }
}

async function downloadProduct(context, product) {
  const assetId = `zeel-${slugify(product.brand)}-${slugify(product.productName)}`
  const assetDir = join(outputRoot, assetId)
  const archiveUrl =
    `https://zeelproject.com/index.php?do=download&id=${product.downloadFileId}` +
    `&hash=${product.downloadHash}`
  const extractDir = join(assetDir, 'extracted')

  ensureDir(assetDir)
  const manifest = writeManifest(assetDir, product)

  const cookies = await context.cookies('https://zeelproject.com', 'https://s1.zeelproject.com')
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')

  const response = await fetch(archiveUrl, {
    redirect: 'follow',
    headers: {
      Cookie: cookieHeader,
      Referer: product.sourceUrl,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`Zeel archive request failed for ${product.productName}: ${response.status}`)
  }

  const disposition = response.headers.get('content-disposition') ?? ''
  const archiveNameMatch = disposition.match(/filename="([^"]+)"/i)
  const archiveName = archiveNameMatch?.[1] ?? `${assetId}.rar`
  const archivePath = join(assetDir, archiveName)

  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(archivePath, buffer)
  extractArchive(archivePath, extractDir)

  return {
    assetId,
    archiveName,
    bytes: buffer.length,
    manifest,
  }
}

async function main() {
  ensureDir(outputRoot)
  const userDataDir = launchChromeClone()
  let browser

  try {
    await waitForChrome()
    browser = await connectToChrome()
    const context = browser.contexts()[0]
    const page = context.pages()[0] ?? (await context.newPage())
    const targets = targetProducts.slice(0, limit)
    const results = []

    for (const url of targets) {
      console.log(`[zeel] ${url}`)
      try {
        const product = await extractProduct(page, url)
        const assetId = `zeel-${slugify(product.brand)}-${slugify(product.productName)}`
        const assetDir = join(outputRoot, assetId)

        const existingArchive = existsSync(assetDir)
          ? readdirSync(assetDir).find((name) => name.endsWith('.rar') || name.endsWith('.zip'))
          : undefined
        const extractedReady =
          existsSync(join(assetDir, 'extracted')) && readdirSync(join(assetDir, 'extracted')).length > 0

        if (existingArchive && extractedReady) {
          results.push({ assetId, status: 'exists', sourceUrl: url })
          continue
        }

        const download = await downloadProduct(context, product)
        results.push({ assetId, status: 'downloaded', sourceUrl: url, archiveName: download.archiveName })
      } catch (error) {
        results.push({ sourceUrl: url, status: 'failed', error: error.message })
      }
    }

    writeFileSync(join(outputRoot, 'download-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    const downloaded = results.filter((item) => item.status === 'downloaded' || item.status === 'exists').length
    const failed = results.filter((item) => item.status === 'failed').length
    console.log(`Downloaded/staged ${downloaded}/${targets.length} Zeel model(s); failed ${failed}.`)
  } finally {
    if (browser) {
      await browser.close()
    }
    spawnSync('pkill', ['-f', `remote-debugging-port=${String(remoteDebugPort)}`], {
      stdio: 'ignore',
      shell: false,
    })
    rmSync(userDataDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
