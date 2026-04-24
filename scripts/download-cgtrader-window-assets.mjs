import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
const BLENDER = process.env.BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender'
const BLENDER_SCRIPT = join(ROOT, 'scripts/blender/import_cgtrader_window.py')
const chromeProfileDir =
  process.env.CGTRADER_CHROME_PROFILE_DIR ??
  join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 1')
const chromeLocalStatePath =
  process.env.CGTRADER_CHROME_LOCAL_STATE ??
  join(process.env.HOME, 'Library/Application Support/Google/Chrome/Local State')
const chromeBinary =
  process.env.CGTRADER_CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const remoteDebugPort = Number.parseInt(process.env.CGTRADER_REMOTE_DEBUG_PORT ?? '9610', 10)

const defaultTargets = [
  {
    slotId: 'modern-wide-picture-window',
    itemId: 3853236,
    sourceUrl:
      'https://www.cgtrader.com/free-3d-models/architectural/window/triple-window',
    targetWidthCm: 182,
    targetHeightCm: 134,
    targetDepthCm: 12,
  },
  {
    slotId: 'modern-sliding-window',
    itemId: 211108,
    sourceUrl: 'https://www.cgtrader.com/free-3d-models/architectural/window/slide-window',
    targetWidthCm: 180,
    targetHeightCm: 134,
    targetDepthCm: 12,
  },
  {
    slotId: 'modern-triple-window',
    itemId: 163659,
    sourceUrl:
      'https://www.cgtrader.com/free-3d-models/architectural/window/wide-triple-window',
    targetWidthCm: 164,
    targetHeightCm: 128,
    targetDepthCm: 12,
  },
  {
    slotId: 'modern-sliding-door-window',
    itemId: 6897802,
    sourceUrl:
      'https://www.cgtrader.com/free-3d-models/architectural/window/window-with-sliding-door-220x10x210',
    targetWidthCm: 220,
    targetHeightCm: 210,
    targetDepthCm: 10,
  },
  {
    slotId: 'modern-tall-casement-window',
    itemId: 5003228,
    sourceUrl:
      'https://www.cgtrader.com/free-3d-models/architectural/window/real-dimension-casement-window',
    targetWidthCm: 92,
    targetHeightCm: 154,
    targetDepthCm: 13,
  },
  {
    slotId: 'modern-upper-transom-window',
    itemId: 177485,
    sourceUrl: 'https://www.cgtrader.com/free-3d-models/architectural/window/single-window',
    targetWidthCm: 122,
    targetHeightCm: 82,
    targetDepthCm: 13,
  },
  {
    slotId: 'modern-dynamic-window',
    itemId: 211198,
    sourceUrl: 'https://www.cgtrader.com/free-3d-models/architectural/door/dynamic-window',
    targetWidthCm: 168,
    targetHeightCm: 132,
    targetDepthCm: 12,
  },
  {
    slotId: 'modern-casement-slider-window',
    itemId: 1924180,
    sourceUrl:
      'https://www.cgtrader.com/free-3d-models/architectural/window/casement-window-with-bottom-slider',
    targetWidthCm: 144,
    targetHeightCm: 122,
    targetDepthCm: 12,
  },
  {
    slotId: 'modern-pvc-transom-window',
    itemId: 172829,
    sourceUrl:
      'https://www.cgtrader.com/free-3d-models/architectural/window/pvc-casement-window-with-transom-1-below',
    targetWidthCm: 132,
    targetHeightCm: 146,
    targetDepthCm: 12,
  },
]
const overrideTargets = process.env.CGTRADER_WINDOW_TARGETS_JSON
  ? JSON.parse(process.env.CGTRADER_WINDOW_TARGETS_JSON)
  : null
const targets = overrideTargets ?? defaultTargets
const targetFilter = new Set(
  (process.env.CGTRADER_WINDOW_FILTER ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
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

function cloneChromeProfile() {
  if (!existsSync(chromeProfileDir)) {
    throw new Error(`Missing Chrome profile: ${chromeProfileDir}`)
  }

  if (!existsSync(chromeLocalStatePath)) {
    throw new Error(`Missing Chrome Local State: ${chromeLocalStatePath}`)
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'chrome-cgtrader-window-assets-'))
  cpSync(chromeProfileDir, join(userDataDir, 'Profile 1'), { recursive: true })
  cpSync(chromeLocalStatePath, join(userDataDir, 'Local State'))

  return userDataDir
}

function launchHeadlessChromeClone(userDataDir) {
  const child = spawn(
    chromeBinary,
    [
      '--headless',
      `--remote-debugging-port=${String(remoteDebugPort)}`,
      `--user-data-dir=${userDataDir}`,
      '--profile-directory=Profile 1',
      'about:blank',
    ],
    {
      cwd: ROOT,
      shell: false,
      detached: true,
      stdio: 'ignore',
    },
  )

  if (child.error) {
    throw child.error
  }

  if (typeof child.pid !== 'number') {
    throw new Error('Failed to launch headless Chrome clone for CGTrader windows.')
  }

  child.unref()
  return child.pid
}

async function waitForChrome() {
  for (let index = 0; index < 20; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${String(remoteDebugPort)}/json/version`)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
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
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw lastError ?? new Error('Failed to connect to Chrome remote debugging session.')
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function cookieHeader(cookies) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
}

function preferredFile(itemFiles) {
  const order = ['.glb', '.fbx.zip', '.obj.zip', '.obj.rar', '.fbx.rar', '.fbx', '.obj', '.gltf', '.blend']
  for (const extension of order) {
    const file = itemFiles.find((entry) => entry.name.toLowerCase().endsWith(extension))
    if (file) {
      return file
    }
  }

  throw new Error('No supported downloadable file found on CGTrader page.')
}

function findFirstFile(rootDir, predicate) {
  const entries = spawnSync('find', [rootDir, '-type', 'f'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  })

  if (entries.error || entries.status !== 0) {
    return undefined
  }

  return entries.stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .find(predicate)
}

async function fetchDownloadPageProps(itemId) {
  const response = await fetch(`https://www.cgtrader.com/items/${String(itemId)}/download-page`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch download page for item ${String(itemId)}: ${response.status}`)
  }

  const html = await response.text()
  const match = html.match(
    /data-react-class="NewDownloadItemPage\/NewDownloadItemPage"[^>]*data-react-props="([^"]+)"/,
  )

  if (!match) {
    throw new Error(`Unable to read download props for item ${String(itemId)}.`)
  }

  return JSON.parse(decodeHtml(match[1]))
}

async function downloadFile(url, cookie, destinationPath) {
  const response = await fetch(url, {
    headers: {
      Cookie: cookie,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Download failed for ${url}: ${response.status} ${response.statusText}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  writeFileSync(destinationPath, bytes)
}

function unzipArchive(archivePath, destinationDir) {
  ensureDir(destinationDir)
  run('unzip', ['-o', archivePath, '-d', destinationDir], { stdio: 'ignore' })
}

function extractRarArchive(archivePath, destinationDir) {
  ensureDir(destinationDir)
  run('bsdtar', ['-xf', archivePath, '-C', destinationDir], { stdio: 'ignore' })
}

function optimizeGlb(input, output) {
  run('pnpm', [
    'exec',
    'gltf-transform',
    'optimize',
    input,
    output,
    '--compress',
    'meshopt',
    '--texture-compress',
    'webp',
    '--texture-size',
    '1024',
  ])
}

function renderWithBlender(input, output, target) {
  run(BLENDER, [
    '--background',
    '--python',
    BLENDER_SCRIPT,
    '--',
    '--input',
    input,
    '--output',
    output,
    '--target-width-cm',
    String(target.targetWidthCm),
    '--target-height-cm',
    String(target.targetHeightCm),
    '--target-depth-cm',
    String(target.targetDepthCm),
  ])
}

async function main() {
  const userDataDir = cloneChromeProfile()
  const chromePid = launchHeadlessChromeClone(userDataDir)
  let browser
  const sessionTempDir = mkdtempSync(join(tmpdir(), 'cgtrader-window-intake-'))

  try {
    await waitForChrome()
    browser = await connectToChrome()
    const context = browser.contexts()[0]
    const cookies = await context.cookies(['https://www.cgtrader.com'])
    const cookie = cookieHeader(cookies)

    const selectedTargets =
      targetFilter.size > 0 ? targets.filter((target) => targetFilter.has(target.slotId)) : targets

    for (const target of selectedTargets) {
      const output = join(
        ROOT,
        'public/assets/models/architectural',
        `${target.slotId}.optimized.glb`,
      )

      const workingDir = join(sessionTempDir, target.slotId)
      ensureDir(workingDir)

      const props = await fetchDownloadPageProps(target.itemId)
      const itemFiles = props?.topSection?.itemFiles ?? []
      if (itemFiles.length === 0) {
        throw new Error(`No files listed for ${target.sourceUrl}`)
      }

      const chosenFile = preferredFile(itemFiles)
      const chosenUrl = `https://www.cgtrader.com${chosenFile.url}`
      const chosenPath = join(workingDir, chosenFile.name)

      await downloadFile(chosenUrl, cookie, chosenPath)

      let inputPath = chosenPath
      const chosenLower = chosenFile.name.toLowerCase()

      if (chosenLower.endsWith('.obj.zip')) {
        unzipArchive(chosenPath, workingDir)
        const mtlArchive = itemFiles.find((entry) => entry.name.toLowerCase().endsWith('.mtl.zip'))
        if (mtlArchive) {
          const mtlZipPath = join(workingDir, mtlArchive.name)
          await downloadFile(`https://www.cgtrader.com${mtlArchive.url}`, cookie, mtlZipPath)
          try {
            unzipArchive(mtlZipPath, workingDir)
          } catch {}
        }
        inputPath = findFirstFile(workingDir, (entry) => entry.toLowerCase().endsWith('.obj'))
      } else if (chosenLower.endsWith('.fbx.zip')) {
        unzipArchive(chosenPath, workingDir)
        inputPath = findFirstFile(workingDir, (entry) => entry.toLowerCase().endsWith('.fbx'))
      } else if (chosenLower.endsWith('.obj.rar')) {
        extractRarArchive(chosenPath, workingDir)
        inputPath = findFirstFile(workingDir, (entry) => entry.toLowerCase().endsWith('.obj'))
      } else if (chosenLower.endsWith('.fbx.rar')) {
        extractRarArchive(chosenPath, workingDir)
        inputPath = findFirstFile(workingDir, (entry) => entry.toLowerCase().endsWith('.fbx'))
      } else if (chosenLower.endsWith('.obj')) {
        const mtlFile = itemFiles.find((entry) => entry.name.toLowerCase().endsWith('.mtl'))
        if (mtlFile) {
          await downloadFile(`https://www.cgtrader.com${mtlFile.url}`, cookie, join(workingDir, mtlFile.name))
        }
      }

      if (!inputPath || !existsSync(inputPath)) {
        throw new Error(`Resolved model input missing for ${target.sourceUrl}`)
      }

      const texturesArchive = itemFiles.find((entry) => /texture/i.test(entry.name))
      if (texturesArchive) {
        const texturesPath = join(workingDir, texturesArchive.name)
        await downloadFile(`https://www.cgtrader.com${texturesArchive.url}`, cookie, texturesPath)
        if (texturesArchive.name.toLowerCase().endsWith('.zip')) {
          unzipArchive(texturesPath, workingDir)
        } else if (texturesArchive.name.toLowerCase().endsWith('.rar')) {
          extractRarArchive(texturesPath, workingDir)
        }
      }

      const normalized = join(workingDir, `${target.slotId}.normalized.glb`)
      renderWithBlender(inputPath, normalized, target)
      optimizeGlb(normalized, output)
      console.log(`prepared ${target.slotId} from ${target.sourceUrl}`)
    }
  } finally {
    await browser?.close().catch(() => {})
    if (chromePid) {
      try {
        process.kill(chromePid)
      } catch {}
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {}
    try {
      rmSync(sessionTempDir, { recursive: true, force: true })
    } catch {}
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
