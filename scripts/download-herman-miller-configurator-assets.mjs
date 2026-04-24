import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const outputRoot = join(ROOT, 'raw/inbox/herman-miller')
const chromeProfileDir =
  process.env.HM_CHROME_PROFILE_DIR ??
  join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 1')
const chromeLocalStatePath =
  process.env.HM_CHROME_LOCAL_STATE ??
  join(process.env.HOME, 'Library/Application Support/Google/Chrome/Local State')
const remoteDebugPort = Number.parseInt(process.env.HM_REMOTE_DEBUG_PORT ?? '9224', 10)
const licenseUrl = 'https://www.millerknoll.com/legal/terms-of-use'

const targetProducts = [
  {
    sourceUrl:
      'https://www.hermanmiller.com/products/seating/lounge-seating/pawson-drift-sofa-group/product-configurator/',
    category: 'sofa',
  },
  {
    sourceUrl:
      'https://www.hermanmiller.com/products/tables/occasional-tables/girard-flower-table/product-configurator/',
    category: 'table',
  },
  {
    sourceUrl:
      'https://www.hermanmiller.com/products/storage/nelson-basic-cabinet-series/product-configurator/',
    category: 'storage',
  },
]
const limit = Number.parseInt(process.env.HM_LIMIT ?? String(targetProducts.length), 10)

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

function assetIdFor(productName) {
  return `herman-miller-${slugify(productName)}`
}

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function fallbackProductName(sourceUrl) {
  const withoutQuery = sourceUrl.split('?')[0]
  const segments = withoutQuery.split('/').filter(Boolean)
  const slug = segments[segments.length - 2] ?? segments[segments.length - 1] ?? 'product'
  return titleCase(slug)
}

function canonicalProductName(sourceUrl, productName) {
  const fallback = fallbackProductName(sourceUrl)

  if (!productName) {
    return fallback
  }

  const normalized = productName.trim()
  if (/^nelson$/i.test(normalized)) {
    return fallback
  }

  return normalized.startsWith('/iframe/') ? fallback : normalized
}

function launchChromeClone() {
  if (!existsSync(chromeProfileDir)) {
    throw new Error(`Missing Chrome profile: ${chromeProfileDir}`)
  }

  if (!existsSync(chromeLocalStatePath)) {
    throw new Error(`Missing Chrome Local State: ${chromeLocalStatePath}`)
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'chrome-hm-'))
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
    throw openResult.error ?? new Error('Failed to launch Chrome clone for Herman Miller intake.')
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

async function waitForConfiguratorFrame(page) {
  for (let index = 0; index < 30; index += 1) {
    const frame = page.frames().find((entry) => entry.url().includes('3d-configurator.vercel.app/iframe/'))
    if (frame) {
      return frame
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  return undefined
}

function loadGlbDimensions(glbPath) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'gltf-transform', 'inspect', glbPath],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      shell: false,
    },
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`Failed to inspect GLB bounds for ${glbPath}`)
  }

  const output = `${result.stdout}\n${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, '')
  const match = output.match(
    /Root Scene\s*│\s*RootNode\s*│\s*([^│]+)\s*│\s*([^│]+)\s*│/m,
  )

  if (!match) {
    throw new Error(`Unable to parse GLB bounds for ${glbPath}`)
  }

  const parseVector = (value) =>
    value
      .split(',')
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isFinite(entry))

  const min = parseVector(match[1])
  const max = parseVector(match[2])

  if (min.length !== 3 || max.length !== 3) {
    throw new Error(`Unexpected bounds vector format for ${glbPath}`)
  }

  return [
    Number(((max[0] - min[0]) * 100).toFixed(1)),
    Number(((max[2] - min[2]) * 100).toFixed(1)),
    Number(((max[1] - min[1]) * 100).toFixed(1)),
  ]
}

function writeManifest(assetDir, product) {
  const manifest = {
    assetId: assetIdFor(product.productName),
    source: 'herman-miller',
    sourceUrl: product.sourceUrl,
    licenseUrl,
    licenseType: 'personal-local',
    author: 'Herman Miller',
    brand: 'Herman Miller',
    productName: product.productName,
    category: product.category,
    styleTags: ['modern', 'official-configurator', 'manufacturer'],
    preferredFormat: 'glb',
    dimensionsCm: product.dimensionsCm,
    redistributionStatus: 'personal-local',
    notes:
      `Downloaded from Herman Miller 3D configurator via official GLB export API. ` +
      `SKU ${product.sku}.`,
  }

  writeFileSync(join(assetDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

async function extractProduct(page, target) {
  await page.goto(target.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForSelector('iframe.product-configurator-3d', { timeout: 120000 })

  const frame = await waitForConfiguratorFrame(page)
  if (!frame) {
    throw new Error(`Configurator iframe not found for ${target.sourceUrl}`)
  }

  await frame.waitForFunction(
    () => {
      const kg = document.querySelector('marxent-kongfigurator')?.kongfigurator
      return Boolean(kg?.configurationController?._currentSkus?.length && kg?.configurationController?._model?.productName)
    },
    undefined,
    { timeout: 120000 },
  )

  const product = await frame.evaluate(() => {
    const kg = document.querySelector('marxent-kongfigurator')?.kongfigurator
    const controller = kg?.configurationController
    const lines = (document.body.innerText ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const priceIndex = lines.findIndex((line) => /^\$[\d,]+(?:\.\d+)?$/.test(line))

    return {
      productName: priceIndex > 0 ? lines[priceIndex - 1] : '',
      sku: controller?._currentSkus?.[0] ?? '',
    }
  })

  const titleMatch = (await page.title()).match(/^Configure\s+(.+?)\s+-\s+.+?\s+-\s+Herman Miller$/)
  const productName = canonicalProductName(
    target.sourceUrl,
    product.productName || titleMatch?.[1] || '',
  )

  if (!productName || !product.sku) {
    throw new Error(`Failed to resolve Herman Miller product metadata for ${target.sourceUrl}`)
  }

  return { ...target, ...product, productName, frame }
}

async function resolveDownload(page, product) {
  const exportRequestPromise = page.waitForRequest(
    (request) => request.url().startsWith('https://mxt-client-services.3dcloud.io/v1/ar-od/'),
    { timeout: 120000 },
  )

  await product.frame.evaluate(() => {
    document.querySelector('button[data-action="download"]')?.click()
  })
  await page.waitForTimeout(1000)
  await product.frame.evaluate(() => {
    document.querySelector('#mxt-download-popover .glb-text')?.parentElement?.click()
  })

  const exportRequest = await exportRequestPromise
  const requestHeaders = exportRequest.headers()
  const apiKey = requestHeaders['x-api-key']

  if (!apiKey) {
    throw new Error(`Missing x-api-key for ${product.productName}`)
  }

  const exportResponse = await fetch(exportRequest.url(), {
    headers: {
      'content-type': requestHeaders['content-type'] ?? 'application/json',
      referer: requestHeaders.referer ?? 'https://3d-configurator.vercel.app/',
      'user-agent':
        requestHeaders['user-agent'] ??
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      'x-api-key': apiKey,
    },
  })

  if (!exportResponse.ok) {
    throw new Error(`Herman Miller export API failed for ${product.productName}: ${exportResponse.status}`)
  }

  const payload = await exportResponse.json()
  if (!payload?.url) {
    throw new Error(`Herman Miller export API returned no GLB URL for ${product.productName}`)
  }

  return {
    apiUrl: exportRequest.url(),
    glbUrl: payload.url,
    apiKey,
  }
}

async function downloadAsset(product) {
  const assetId = assetIdFor(product.productName)
  const assetDir = join(outputRoot, assetId)
  const glbPath = join(assetDir, 'source.glb')

  ensureDir(assetDir)

  const response = await fetch(product.glbUrl)
  if (!response.ok) {
    throw new Error(`GLB download failed for ${product.productName}: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(glbPath, buffer)

  const dimensionsCm = loadGlbDimensions(glbPath)
  const manifest = writeManifest(assetDir, { ...product, dimensionsCm })

  writeFileSync(
    join(assetDir, 'download.json'),
    `${JSON.stringify(
      {
        apiUrl: product.apiUrl,
        glbUrl: product.glbUrl,
        sku: product.sku,
        bytes: buffer.length,
      },
      null,
      2,
    )}\n`,
  )

  return { manifest, glbPath, bytes: buffer.length }
}

async function main() {
  ensureDir(outputRoot)
  const userDataDir = launchChromeClone()
  let browser

  try {
    await waitForChrome()
    browser = await connectToChrome()
    const context = browser.contexts()[0]
    const results = []

    for (const target of targetProducts.slice(0, limit)) {
      const page = await context.newPage()
      console.log(`[herman-miller] ${target.sourceUrl}`)

      try {
        const product = await extractProduct(page, target)
        const assetId = assetIdFor(product.productName)
        const assetDir = join(outputRoot, assetId)

        if (existsSync(join(assetDir, 'source.glb')) && existsSync(join(assetDir, 'manifest.json'))) {
          results.push({ assetId, sourceUrl: target.sourceUrl, status: 'exists' })
          await page.close()
          continue
        }

        const download = await resolveDownload(page, product)
        const staged = await downloadAsset({ ...product, ...download })
        results.push({
          assetId,
          sourceUrl: target.sourceUrl,
          status: 'downloaded',
          bytes: staged.bytes,
        })
      } catch (error) {
        results.push({
          sourceUrl: target.sourceUrl,
          status: 'failed',
          error: error.message,
        })
      } finally {
        await page.close()
      }
    }

    writeFileSync(join(outputRoot, 'download-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    const completed = results.filter((item) => item.status === 'downloaded' || item.status === 'exists').length
    const failed = results.filter((item) => item.status === 'failed').length
    console.log(`Downloaded/staged ${completed}/${Math.min(limit, targetProducts.length)} Herman Miller asset(s); failed ${failed}.`)
  } finally {
    if (browser) {
      await browser.close()
    }
    spawnSync('pkill', ['-f', `remote-debugging-port=${String(remoteDebugPort)}`], {
      stdio: 'ignore',
      shell: false,
    })
    for (let index = 0; index < 3; index += 1) {
      try {
        rmSync(userDataDir, { recursive: true, force: true })
        break
      } catch (error) {
        if (index === 2) {
          console.warn(`[herman-miller] cleanup skipped for ${userDataDir}: ${error.message}`)
          break
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 1000)
        })
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
