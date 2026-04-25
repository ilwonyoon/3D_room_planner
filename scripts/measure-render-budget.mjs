import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const PRESETS = ['daylight-window', 'warm-evening', 'night-room']
const VIEWS = ['isometric', 'bird', 'pov']
const OUT_DIR = 'output/render-budget'

function parseArgs() {
  const args = new Map()
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=')
    args.set(key.replace(/^--/, ''), value ?? true)
  }

  return {
    url: args.get('url') || process.env.RENDER_QUALITY_URL || 'http://127.0.0.1:5188/',
    quality: args.get('quality') || 'medium',
    outDir: args.get('out-dir') || OUT_DIR,
  }
}

async function applyDebugState(page, { view, preset, quality }) {
  const ok = await page.evaluate(
    ({ view: mode, preset: lightingPreset, quality: renderQuality }) => {
      if (!window.__pocketroomDebug) return false
      window.__pocketroomDebug.setCameraMode(mode)
      window.__pocketroomDebug.setLightingPreset(lightingPreset)
      window.__pocketroomDebug.setRenderQuality(renderQuality)
      return true
    },
    { view, preset, quality },
  )

  if (!ok) {
    throw new Error('window.__pocketroomDebug is required for render budget metrics')
  }
}

function summarize(rows) {
  return rows.reduce(
    (summary, row) => ({
      maxCalls: Math.max(summary.maxCalls, row.render.calls),
      maxTriangles: Math.max(summary.maxTriangles, row.render.triangles),
      maxTextures: Math.max(summary.maxTextures, row.memory.textures),
      maxGeometries: Math.max(summary.maxGeometries, row.memory.geometries),
    }),
    {
      maxCalls: 0,
      maxTriangles: 0,
      maxTextures: 0,
      maxGeometries: 0,
    },
  )
}

function writeMarkdown(path, report) {
  const rows = report.measurements
    .map(
      (row) =>
        `| ${row.view} | ${row.preset} | ${row.render.calls} | ${row.render.triangles.toLocaleString()} | ${row.memory.geometries} | ${row.memory.textures} | ${row.dpr} |`,
    )
    .join('\n')

  writeFileSync(
    path,
    `# Render Budget Report

Generated: ${report.generatedAt}

Quality: \`${report.quality}\`

URL: \`${report.url}\`

Render calls and triangles are scene-graph estimates from visible meshes. Texture and geometry counts still come from live \`WebGLRenderer.info.memory\`.

## Summary

- Max draw calls: ${report.summary.maxCalls}
- Max triangles: ${report.summary.maxTriangles.toLocaleString()}
- Max geometries: ${report.summary.maxGeometries}
- Max textures: ${report.summary.maxTextures}

## Measurements

| View | Preset | Draw calls | Triangles | Geometries | Textures | DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${rows}

## Current Budget Targets

- Medium quality draw calls should stay below 180.
- Medium quality triangles should stay below 450k.
- Medium quality live WebGL textures should stay below 90.

If a visual change improves screenshots but exceeds these targets, treat it as an A/B candidate rather than a default.
`,
  )
}

async function main() {
  const options = parseArgs()
  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  mkdirSync(options.outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  await page.goto(options.url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!document.querySelector('canvas'), undefined, { timeout: 15000 })
  await page.waitForFunction(() => !!window.__pocketroomRenderStats, undefined, { timeout: 15000 })

  const measurements = []

  for (const view of VIEWS) {
    for (const preset of PRESETS) {
      await applyDebugState(page, { view, preset, quality: options.quality })
      await page.waitForTimeout(view === 'pov' ? 900 : 700)
      const stats = await page.evaluate(() => window.__pocketroomRenderStats ?? null)
      if (!stats) {
        throw new Error('window.__pocketroomRenderStats was not populated')
      }
      measurements.push({ view, preset, ...stats })
    }
  }

  await browser.close()

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    url: options.url,
    quality: options.quality,
    summary: summarize(measurements),
    measurements,
  }
  const jsonPath = join(options.outDir, `${runId}.json`)
  const latestJsonPath = join(options.outDir, 'latest.json')
  const mdPath = join('docs', 'render-budget-report.md')
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`)
  writeMarkdown(mdPath, report)

  console.log(`wrote ${jsonPath}`)
  console.log(
    `maxCalls=${report.summary.maxCalls} maxTriangles=${report.summary.maxTriangles} maxTextures=${report.summary.maxTextures}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
