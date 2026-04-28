import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const PRESETS = [
  { id: 'daylight-window', label: 'day' },
  { id: 'warm-evening', label: 'warm' },
  { id: 'night-room', label: 'night' },
]

const VIEWS = [
  { id: 'isometric', label: 'iso' },
  { id: 'bird', label: 'bird' },
  { id: 'pov', label: 'pov' },
]

const HERO_SETS = [
  {
    id: 'baseline',
    label: 'base',
    description: 'Current default-room hero assets.',
    patches: {},
  },
  {
    id: 'lounge-accents',
    label: 'acc',
    description: 'Current-room lounge accent replacements for vase and small tabletop object material signal.',
    patches: {
      'coffee-table-vase': {
        label: 'Lotus Vase',
        url: '/assets/models/manual/dimensiva-lotus-vase-by-101-copenhagen.optimized.glb',
        targetSize: 0.22,
        dimensionsM: { x: 0.2, y: 0.22, z: 0.2 },
      },
      'small-plant': {
        label: 'Serif Vase',
        url: '/assets/models/manual/dimensiva-serif-vase-by-kristina-dam-studio.optimized.glb',
        targetSize: 0.32,
        dimensionsM: { x: 0.22, y: 0.32, z: 0.22 },
      },
    },
  },
  {
    id: 'designer-lamps',
    label: 'lamp',
    description: 'Lamp-focused replacements to test Night/POV mood gains.',
    patches: {
      'reading-lamp': {
        label: 'Hello Floor Lamp',
        url: '/assets/models/manual/dimensiva-hello-floor-lamp-by-normann-copenhagen.optimized.glb',
        targetSize: 1.64,
        dimensionsM: { x: 0.52, y: 1.64, z: 0.52 },
      },
      'desk-lamp': {
        label: 'Neat Noon Table Lamp',
        url: '/assets/models/manual/designconnected-neat-noon-table-lamp-10748.optimized.glb',
        targetSize: 0.5,
        dimensionsM: { x: 0.28, y: 0.5, z: 0.28 },
      },
    },
  },
]

function parseArgs() {
  const args = new Map()

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=')
    args.set(key.replace(/^--/, ''), value ?? true)
  }

  return {
    url: args.get('url') || process.env.RENDER_QUALITY_URL || 'http://127.0.0.1:5188/',
    outDir: args.get('out-dir') || 'output/render-quality-metrics',
    baseline: args.get('baseline'),
    heroSets: String(args.get('hero-sets') || args.get('hero-set') || 'baseline')
      .split(',')
      .map((heroSet) => heroSet.trim())
      .filter(Boolean),
    views: String(args.get('views') || 'isometric')
      .split(',')
      .map((view) => view.trim())
      .filter(Boolean),
    quality: args.get('quality') || process.env.RENDER_QUALITY_LEVEL || 'high',
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function scoreRange(value, low, high) {
  return clamp((value - low) / Math.max(high - low, 0.0001))
}

function scoreBand(value, min, idealLow, idealHigh, max) {
  if (value >= idealLow && value <= idealHigh) return 1
  if (value < idealLow) return scoreRange(value, min, idealLow)
  return 1 - scoreRange(value, idealHigh, max)
}

function scoreMetrics(metrics, presetId) {
  const night = presetId === 'night-room'
  const contrastScore = night
    ? scoreBand(metrics.lumaRangeP05P95, 58, 96, 178, 232)
    : scoreRange(metrics.lumaRangeP05P95, 84, 176)
  const localContrastScore = night
    ? scoreRange(metrics.localContrast, 2.8, 7.2)
    : scoreRange(metrics.localContrast, 3.4, 10.5)
  const groundingScore = night
    ? scoreBand(metrics.shadowRatio, 0.16, 0.32, 0.56, 0.82)
    : scoreBand(metrics.shadowRatio, 0.08, 0.18, 0.36, 0.58)
  const highlightScore = night
    ? scoreBand(metrics.highlightRatio, 0.001, 0.006, 0.065, 0.18)
    : scoreBand(metrics.highlightRatio, 0.012, 0.035, 0.18, 0.34)
  const colorSeparationScore = night
    ? scoreRange(metrics.warmCoolStdDev, 0.036, 0.082)
    : scoreRange(metrics.warmCoolStdDev, 0.028, 0.09)
  const occupancyScore = night
    ? scoreRange(metrics.sceneOccupancy, 0.32, 0.7)
    : scoreRange(metrics.sceneOccupancy, 0.42, 0.78)
  const darkBlobPenalty = scoreRange(metrics.darkBlobRatio, 0.018, 0.075)

  const weighted =
    contrastScore * 0.2 +
    localContrastScore * 0.18 +
    groundingScore * 0.18 +
    highlightScore * 0.14 +
    colorSeparationScore * 0.16 +
    occupancyScore * 0.14
  const adjusted = clamp(weighted - darkBlobPenalty * 0.18)

  return {
    perceptualProxyScore: Math.round(adjusted * 1000) / 10,
    profile: night ? 'night-mood' : 'balanced-room',
    components: {
      contrastScore: Math.round(contrastScore * 1000) / 1000,
      localContrastScore: Math.round(localContrastScore * 1000) / 1000,
      groundingScore: Math.round(groundingScore * 1000) / 1000,
      highlightScore: Math.round(highlightScore * 1000) / 1000,
      colorSeparationScore: Math.round(colorSeparationScore * 1000) / 1000,
      occupancyScore: Math.round(occupancyScore * 1000) / 1000,
      darkBlobPenalty: Math.round(darkBlobPenalty * 1000) / 1000,
    },
  }
}

function summarizeRuns(current, baselinePath) {
  if (!baselinePath) return null

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const baselineByPreset = new Map(baseline.presets.map((preset) => [preset.id, preset]))

  return current.presets
    .map((preset) => {
      const previous = baselineByPreset.get(preset.id)
      if (!previous) return null

      return {
        id: preset.id,
        scoreDelta: Math.round((preset.score.perceptualProxyScore - previous.score.perceptualProxyScore) * 10) / 10,
        contrastDelta: Math.round((preset.metrics.lumaRangeP05P95 - previous.metrics.lumaRangeP05P95) * 100) / 100,
        localContrastDelta: Math.round((preset.metrics.localContrast - previous.metrics.localContrast) * 100) / 100,
        shadowRatioDelta: Math.round((preset.metrics.shadowRatio - previous.metrics.shadowRatio) * 10000) / 10000,
        highlightRatioDelta: Math.round((preset.metrics.highlightRatio - previous.metrics.highlightRatio) * 10000) / 10000,
        warmCoolStdDevDelta: Math.round((preset.metrics.warmCoolStdDev - previous.metrics.warmCoolStdDev) * 10000) / 10000,
      }
    })
    .filter(Boolean)
}

function summarizeHeroSets(presets) {
  const groups = new Map()

  for (const preset of presets) {
    const group = groups.get(preset.heroSetId) ?? {
      id: preset.heroSetId,
      description: preset.heroSetDescription,
      count: 0,
      total: 0,
      byView: new Map(),
      byLightingPreset: new Map(),
    }
    group.count += 1
    group.total += preset.score.perceptualProxyScore

    const viewTotal = group.byView.get(preset.viewMode) ?? { count: 0, total: 0 }
    viewTotal.count += 1
    viewTotal.total += preset.score.perceptualProxyScore
    group.byView.set(preset.viewMode, viewTotal)

    const presetTotal = group.byLightingPreset.get(preset.lightingPreset) ?? { count: 0, total: 0 }
    presetTotal.count += 1
    presetTotal.total += preset.score.perceptualProxyScore
    group.byLightingPreset.set(preset.lightingPreset, presetTotal)

    groups.set(preset.heroSetId, group)
  }

  return Array.from(groups.values())
    .map((group) => ({
      id: group.id,
      description: group.description,
      averageScore: Math.round((group.total / group.count) * 10) / 10,
      byView: Object.fromEntries(
        Array.from(group.byView.entries()).map(([view, value]) => [
          view,
          Math.round((value.total / value.count) * 10) / 10,
        ]),
      ),
      byLightingPreset: Object.fromEntries(
        Array.from(group.byLightingPreset.entries()).map(([preset, value]) => [
          preset,
          Math.round((value.total / value.count) * 10) / 10,
        ]),
      ),
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
}

function summarizeWinners(presets) {
  const groups = new Map()

  for (const preset of presets) {
    const key = `${preset.viewMode}:${preset.lightingPreset}`
    const previous = groups.get(key)
    if (!previous || preset.score.perceptualProxyScore > previous.score.perceptualProxyScore) {
      groups.set(key, preset)
    }
  }

  return Array.from(groups.entries())
    .map(([id, preset]) => ({
      id,
      heroSetId: preset.heroSetId,
      label: preset.label,
      score: preset.score.perceptualProxyScore,
      screenshot: preset.screenshot,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function writeMarkdownReport(path, result) {
  const setRows = result.heroSetSummary
    .map(
      (set) =>
        `| ${set.id} | ${set.averageScore} | ${set.byView.isometric ?? '-'} | ${set.byView.bird ?? '-'} | ${set.byView.pov ?? '-'} | ${set.byLightingPreset['daylight-window'] ?? '-'} | ${set.byLightingPreset['warm-evening'] ?? '-'} | ${set.byLightingPreset['night-room'] ?? '-'} |`,
    )
    .join('\n')
  const winnerRows = result.winners
    .map((winner) => `| ${winner.id} | ${winner.heroSetId} | ${winner.score} | ${winner.screenshot} |`)
    .join('\n')

  writeFileSync(
    path,
    `# Render Quality Report

Generated: ${result.generatedAt}

URL: ${result.url}

Quality: \`${result.quality}\`

Average perceptual proxy score: ${result.averagePerceptualProxyScore}

## Hero Set Summary

| Hero set | Avg | Isometric | Bird | POV | Day | Warm | Night |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${setRows}

## Winners By View And Preset

| View/Preset | Winning hero set | Score | Screenshot |
| --- | --- | ---: | --- |
${winnerRows}

## Reading Rule

Do not promote an A/B candidate just because it exists. Promote it only when the screenshot looks better and the same view/preset score is not materially worse. If human preference and proxy score diverge, record that preference and recalibrate the score weights.
`,
  )
}

function resolveHeroSets(heroSetIds) {
  if (heroSetIds.includes('all')) {
    return HERO_SETS
  }

  return heroSetIds.map((heroSetId) => {
    const heroSet = HERO_SETS.find((candidate) => candidate.id === heroSetId)
    if (!heroSet) {
      throw new Error(`Unknown hero set "${heroSetId}". Expected one of ${HERO_SETS.map((set) => set.id).join(', ')}, all`)
    }
    return heroSet
  })
}

async function analyzeScreenshot(page, screenshot, crop) {
  const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`

  return page.evaluate(
    async ({ dataUrl: imageUrl, crop: cropRect }) => {
      const image = new Image()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = imageUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)

      const imageData = context.getImageData(cropRect.x, cropRect.y, cropRect.width, cropRect.height)
      const { data, width, height } = imageData
      const lumas = []
      const warmCool = []
      let saturationTotal = 0
      let shadowPixels = 0
      let highlightPixels = 0
      let occupiedPixels = 0
      let localContrastTotal = 0
      let localContrastSamples = 0
      let edgePixels = 0
      const darkMask = new Uint8Array(width * height)

      const lumaAt = (index) =>
        data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4
          const r = data[index]
          const g = data[index + 1]
          const b = data[index + 2]
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const luma = lumaAt(index)

          lumas.push(luma)
          warmCool.push((r - b) / 255)
          saturationTotal += max === 0 ? 0 : (max - min) / max

          if (luma > 28) occupiedPixels += 1
          if (luma >= 22 && luma <= 92) shadowPixels += 1
          if (luma >= 198) highlightPixels += 1
          if (luma <= 36 && max - min <= 24) darkMask[y * width + x] = 1

          if (x + 1 < width && y + 1 < height) {
            const right = lumaAt(index + 4)
            const down = lumaAt(index + width * 4)
            const gradient = Math.abs(luma - right) + Math.abs(luma - down)
            localContrastTotal += gradient
            localContrastSamples += 1
            if (gradient > 42) edgePixels += 1
          }
        }
      }

      lumas.sort((a, b) => a - b)
      const pixelCount = lumas.length
      const mean = lumas.reduce((sum, value) => sum + value, 0) / pixelCount
      const variance = lumas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / pixelCount
      const warmCoolMean = warmCool.reduce((sum, value) => sum + value, 0) / pixelCount
      const warmCoolVariance = warmCool.reduce((sum, value) => sum + (value - warmCoolMean) ** 2, 0) / pixelCount
      const p05 = lumas[Math.floor(pixelCount * 0.05)]
      const p50 = lumas[Math.floor(pixelCount * 0.5)]
      const p95 = lumas[Math.floor(pixelCount * 0.95)]
      const visited = new Uint8Array(pixelCount)
      const stack = new Int32Array(pixelCount)
      let largestInteriorDarkBlob = 0

      for (let start = 0; start < pixelCount; start += 1) {
        if (!darkMask[start] || visited[start]) continue

        let stackLength = 0
        let componentSize = 0
        let touchesBorder = false
        stack[stackLength++] = start
        visited[start] = 1

        while (stackLength > 0) {
          const pixel = stack[--stackLength]
          componentSize += 1
          const x = pixel % width
          const y = Math.floor(pixel / width)
          if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
            touchesBorder = true
          }

          const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width]
          for (const next of neighbors) {
            if (next < 0 || next >= pixelCount || visited[next] || !darkMask[next]) continue
            const nextX = next % width
            if ((next === pixel - 1 && nextX !== x - 1) || (next === pixel + 1 && nextX !== x + 1)) {
              continue
            }
            visited[next] = 1
            stack[stackLength++] = next
          }
        }

        if (!touchesBorder) {
          largestInteriorDarkBlob = Math.max(largestInteriorDarkBlob, componentSize)
        }
      }

      return {
        crop: cropRect,
        meanLuma: Math.round(mean * 100) / 100,
        lumaStdDev: Math.round(Math.sqrt(variance) * 100) / 100,
        lumaP05: Math.round(p05 * 100) / 100,
        lumaP50: Math.round(p50 * 100) / 100,
        lumaP95: Math.round(p95 * 100) / 100,
        lumaRangeP05P95: Math.round((p95 - p05) * 100) / 100,
        localContrast: Math.round((localContrastTotal / localContrastSamples) * 100) / 100,
        edgeDensity: Math.round((edgePixels / localContrastSamples) * 10000) / 10000,
        shadowRatio: Math.round((shadowPixels / pixelCount) * 10000) / 10000,
        highlightRatio: Math.round((highlightPixels / pixelCount) * 10000) / 10000,
        sceneOccupancy: Math.round((occupiedPixels / pixelCount) * 10000) / 10000,
        darkBlobRatio: Math.round((largestInteriorDarkBlob / pixelCount) * 10000) / 10000,
        saturationMean: Math.round((saturationTotal / pixelCount) * 10000) / 10000,
        warmCoolMean: Math.round(warmCoolMean * 10000) / 10000,
        warmCoolStdDev: Math.round(Math.sqrt(warmCoolVariance) * 10000) / 10000,
      }
    },
    { dataUrl, crop },
  )
}

async function setLightingPreset(page, preset) {
  const applied = await page.evaluate((id) => {
    if (!window.__pocketroomDebug?.setLightingPreset) {
      return false
    }

    window.__pocketroomDebug.setLightingPreset(id)
    return true
  }, preset.id)

  if (!applied) {
    await page.getByText(preset.label, { exact: false }).click()
  }
}

async function setCameraViewMode(page, view) {
  const applied = await page.evaluate((id) => {
    if (!window.__pocketroomDebug?.setCameraMode) {
      return false
    }

    window.__pocketroomDebug.setCameraMode(id)
    return true
  }, view.id)

  if (!applied && view.id !== 'isometric') {
    throw new Error('window.__pocketroomDebug.setCameraMode is required for non-isometric render metrics')
  }
}

async function setRenderQuality(page, quality) {
  const applied = await page.evaluate((value) => {
    if (!window.__pocketroomDebug?.setRenderQuality) {
      return false
    }

    window.__pocketroomDebug.setRenderQuality(value)
    return true
  }, quality)

  if (!applied) {
    return
  }

  await page.waitForTimeout(250)
}

async function applyHeroSet(page, initialObjects, heroSet) {
  const objects = initialObjects.map((object) => {
    const patch = heroSet.patches[object.id]
    if (!patch) {
      return object
    }

    return {
      ...object,
      ...patch,
      position: patch.position ? { ...patch.position } : object.position,
      dimensionsM: patch.dimensionsM ? { ...patch.dimensionsM } : object.dimensionsM,
    }
  })

  const applied = await page.evaluate((nextObjects) => {
    if (!window.__pocketroomDebug?.setObjects) {
      return false
    }

    window.__pocketroomDebug.setObjects(nextObjects)
    return true
  }, objects)

  if (!applied) {
    throw new Error('window.__pocketroomDebug.setObjects is required for hero asset candidate metrics')
  }
}

function cropForView(view, canvasBox) {
  if (view.id === 'bird') {
    return {
      x: Math.round(canvasBox.x + canvasBox.width * 0.12),
      y: Math.round(canvasBox.y + canvasBox.height * 0.15),
      width: Math.round(canvasBox.width * 0.76),
      height: Math.round(canvasBox.height * 0.68),
    }
  }

  if (view.id === 'pov') {
    return {
      x: Math.round(canvasBox.x + canvasBox.width * 0.06),
      y: Math.round(canvasBox.y + canvasBox.height * 0.16),
      width: Math.round(canvasBox.width * 0.88),
      height: Math.round(canvasBox.height * 0.6),
    }
  }

  return {
    x: Math.round(canvasBox.x + canvasBox.width * 0.07),
    y: Math.round(canvasBox.y + canvasBox.height * 0.17),
    width: Math.round(canvasBox.width * 0.86),
    height: Math.round(canvasBox.height * 0.39),
  }
}

async function setUiOverlaysHidden(page, hidden) {
  await page.evaluate((shouldHide) => {
    const canvas = document.querySelector('canvas')
    const sceneLayer = canvas?.parentElement?.parentElement
    const sceneHost = sceneLayer?.parentElement

    if (!sceneLayer || !sceneHost) {
      return
    }

    for (const child of Array.from(sceneHost.children)) {
      if (child === sceneLayer || !(child instanceof HTMLElement)) {
        continue
      }

      if (shouldHide) {
        child.dataset.renderQualityPreviousVisibility = child.style.visibility
        child.style.visibility = 'hidden'
      } else {
        child.style.visibility = child.dataset.renderQualityPreviousVisibility ?? ''
        delete child.dataset.renderQualityPreviousVisibility
      }
    }
  }, hidden)
}

async function main() {
  const options = parseArgs()
  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const views = options.views.map((viewId) => {
    const view = VIEWS.find((candidate) => candidate.id === viewId)
    if (!view) {
      throw new Error(`Unknown view "${viewId}". Expected one of ${VIEWS.map((v) => v.id).join(', ')}`)
    }
    return view
  })
  const heroSets = resolveHeroSets(options.heroSets)
  mkdirSync(options.outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })

  await page.goto(options.url, { waitUntil: 'networkidle' })
  await page.waitForSelector('canvas')
  await setRenderQuality(page, options.quality)
  const initialObjects = await page.evaluate(() => window.__pocketroomDebug?.getObjects?.() ?? null)
  if (!initialObjects) {
    throw new Error('window.__pocketroomDebug.getObjects is required for render metrics')
  }

  const presets = []

  for (const heroSet of heroSets) {
    await applyHeroSet(page, initialObjects, heroSet)
    await page.waitForTimeout(900)

    for (const view of views) {
      await setCameraViewMode(page, view)
      await page.waitForTimeout(view.id === 'pov' ? 700 : 550)

      for (const preset of PRESETS) {
        await setLightingPreset(page, preset)
        await page.waitForTimeout(550)

        const screenshotPath = join(options.outDir, `${runId}-${heroSet.label}-${view.label}-${preset.label}.png`)
        const canvas = page.locator('canvas')
        const canvasBox = await canvas.boundingBox()
        if (!canvasBox) {
          throw new Error('Canvas bounding box was not available')
        }
        await setUiOverlaysHidden(page, true)
        const screenshot = await canvas.screenshot({ path: screenshotPath })
        await setUiOverlaysHidden(page, false)
        const crop = cropForView(view, {
          x: 0,
          y: 0,
          width: canvasBox.width,
          height: canvasBox.height,
        })
        const metrics = await analyzeScreenshot(page, screenshot, crop)
        const score = scoreMetrics(metrics, preset.id)

        presets.push({
          id: `${heroSet.id}:${view.id}:${preset.id}`,
          heroSetId: heroSet.id,
          heroSetDescription: heroSet.description,
          viewMode: view.id,
          lightingPreset: preset.id,
          label: `${heroSet.label}-${view.label}-${preset.label}`,
          screenshot: screenshotPath,
          metrics,
          score,
        })
      }
    }
  }

  await browser.close()

  const averageScore =
    presets.reduce((sum, preset) => sum + preset.score.perceptualProxyScore, 0) / presets.length
  const result = {
    runId,
    url: options.url,
    generatedAt: new Date().toISOString(),
    views: views.map((view) => view.id),
    heroSets: heroSets.map((heroSet) => heroSet.id),
    quality: options.quality,
    note:
      'Metrics are perceptual proxies for the room crop, not an absolute truth. Track them with screenshots and human A/B ratings.',
    averagePerceptualProxyScore: Math.round(averageScore * 10) / 10,
    presets,
  }
  result.heroSetSummary = summarizeHeroSets(presets)
  result.winners = summarizeWinners(presets)
  result.baselineComparison = summarizeRuns(result, options.baseline)

  const outputPath = join(options.outDir, `${runId}.json`)
  const latestPath = join(options.outDir, 'latest.json')
  const markdownPath = join('docs', 'render-quality-report.md')
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
  writeFileSync(latestPath, `${JSON.stringify(result, null, 2)}\n`)
  writeMarkdownReport(markdownPath, result)

  console.log(`wrote ${outputPath}`)
  console.log(`averagePerceptualProxyScore=${result.averagePerceptualProxyScore}`)
  console.log('hero set averages:')
  for (const heroSet of result.heroSetSummary) {
    console.log(`${heroSet.id}: average=${heroSet.averageScore}`)
  }
  for (const preset of presets) {
    console.log(
      `${preset.label}: score=${preset.score.perceptualProxyScore} contrast=${preset.metrics.lumaRangeP05P95} local=${preset.metrics.localContrast} shadow=${preset.metrics.shadowRatio} highlight=${preset.metrics.highlightRatio} colorSep=${preset.metrics.warmCoolStdDev} darkBlob=${preset.metrics.darkBlobRatio}`,
    )
  }

  if (result.baselineComparison) {
    console.log('baseline deltas:')
    for (const delta of result.baselineComparison) {
      console.log(
        `${delta.id}: scoreDelta=${delta.scoreDelta} contrastDelta=${delta.contrastDelta} localContrastDelta=${delta.localContrastDelta} shadowRatioDelta=${delta.shadowRatioDelta}`,
      )
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
