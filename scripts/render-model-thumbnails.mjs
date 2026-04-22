import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const rootDir = process.cwd()
const publicDir = path.join(rootDir, 'public')
const modelsDir = path.join(publicDir, 'assets', 'models')
const outputDir = path.join(publicDir, 'assets', 'model-thumbnails')
const port = Number(process.env.THUMBNAIL_PORT ?? 5176)
const force = process.argv.includes('--force')

async function listOptimizedModels(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return listOptimizedModels(fullPath)
      }

      if (!entry.isFile() || !entry.name.endsWith('.optimized.glb')) {
        return []
      }

      return [fullPath]
    }),
  )

  return nested.flat()
}

function toPublicUrl(filePath) {
  return `/${path.relative(publicDir, filePath).split(path.sep).join('/')}`
}

function toThumbnailPath(filePath) {
  const basename = path.basename(filePath, '.optimized.glb')
  return path.join(outputDir, `${basename}.png`)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer() {
  const startedAt = Date.now()
  const url = `http://127.0.0.1:${port}/scripts/thumbnail-renderer.html`

  while (Date.now() - startedAt < 20000) {
    try {
      const response = await fetch(url)
      if (response.ok) return url
    } catch {
      // keep waiting
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for Vite thumbnail server on port ${port}`)
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const modelFiles = (await listOptimizedModels(modelsDir)).sort()
  const targets = modelFiles
    .map((filePath) => ({
      filePath,
      modelUrl: toPublicUrl(filePath),
      thumbnailPath: toThumbnailPath(filePath),
    }))
    .filter((target) => force || !existsSync(target.thumbnailPath))

  if (targets.length === 0) {
    console.log('[thumbs] all thumbnails already exist')
    return
  }

  const server = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  server.stdout.on('data', (chunk) => process.stdout.write(chunk))
  server.stderr.on('data', (chunk) => process.stderr.write(chunk))

  let browser
  try {
    const rendererUrl = await waitForServer()
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 240, height: 240 }, deviceScaleFactor: 2 })
    await page.goto(rendererUrl, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__thumbnailRendererReady === true)

    for (const [index, target] of targets.entries()) {
      const dataUrl = await page.evaluate((modelUrl) => window.renderModelThumbnail(modelUrl), target.modelUrl)
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      await writeFile(target.thumbnailPath, Buffer.from(base64, 'base64'))
      console.log(`[thumbs] ${index + 1}/${targets.length} ${path.basename(target.thumbnailPath)}`)
    }
  } finally {
    if (browser) {
      await browser.close()
    }
    server.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
