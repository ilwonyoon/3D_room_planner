import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const inboxRoot = join(ROOT, 'raw/inbox/designconnected')
const outputPath = join(inboxRoot, 'metadata-refresh-results.json')
const concurrency = Number.parseInt(process.env.DESIGNCONNECTED_METADATA_CONCURRENCY ?? '6', 10)

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function textFromHtml(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDesignerName(value) {
  const cleaned = cleanBrand(value)
  const personMatch = cleaned.match(/^([^,]+),\s*(.+)$/)

  if (personMatch) {
    return `${personMatch[2]} ${personMatch[1]}`.trim()
  }

  return cleaned
}

function cleanBrand(value) {
  return decodeHtml(value)
    .replace(/^By\s+/i, '')
    .replace(/\s+Designed\s+by\s+.+$/i, '')
    .replace(/\s+Produced\s+by\s+Design\s+Connected\.?$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim()
}

function inferBrandFromProductName(productName) {
  const firstToken = productName.match(/^([A-Z][A-Z0-9&.-]{2,})(?=\s)/)?.[1]

  if (firstToken) {
    return firstToken
  }

  return 'Design Connected'
}

function metadataFromDescription(description) {
  const match = decodeHtml(description).match(/Free\s+3d\s+model\s+of\s+(.+?)\s+Produced\s+by\s+Design\s+Connected/i)

  if (!match) {
    return {}
  }

  const subject = match[1].replace(/\s+/g, ' ').trim()
  const designedMatch = subject.match(/^(.+?)\s+Designed\s+by\s+(.+?)\.?$/i)
  if (designedMatch) {
    return {
      productName: designedMatch[1].trim(),
      brand: normalizeDesignerName(designedMatch[2]),
    }
  }

  const brandMatch = subject.match(/^(.+?)\s+by\s+(.+?)$/i)
  if (brandMatch) {
    return {
      productName: brandMatch[1].trim(),
      brand: cleanBrand(brandMatch[2]),
    }
  }

  return {
    productName: subject,
  }
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `<meta\\s+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    'i',
  )
  return html.match(pattern)?.[1]
}

function extractProductMetadata(html) {
  const description =
    metaContent(html, 'description') ??
    metaContent(html, 'og:description') ??
    metaContent(html, 'twitter:description') ??
    ''
  const descriptionMetadata = metadataFromDescription(description)

  const titleMatch = html.match(/<h2[^>]*class=["'][^"']*dc4_productTitle[^"']*["'][\s\S]*?<\/h2>/i)
  const brandMatch = html.match(/<h3[^>]*class=["'][^"']*dc4_productDesigner[^"']*["'][\s\S]*?<\/h3>/i)
  const twitterTitle = metaContent(html, 'twitter:title')

  const productName =
    (titleMatch ? textFromHtml(titleMatch[0]) : undefined) ??
    (twitterTitle ? decodeHtml(twitterTitle).trim() : undefined) ??
    descriptionMetadata.productName
  const brandFromPage = brandMatch ? cleanBrand(textFromHtml(brandMatch[0])) : undefined
  const brand =
    brandFromPage ||
    descriptionMetadata.brand ||
    (productName ? inferBrandFromProductName(productName) : undefined)

  return {
    productName,
    brand,
  }
}

function candidateDirs() {
  if (!existsSync(inboxRoot)) {
    return []
  }

  return readdirSync(inboxRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(inboxRoot, entry.name))
    .filter((directory) => existsSync(join(directory, 'manifest.json')))
}

async function refreshManifest(directory) {
  const manifestPath = join(directory, 'manifest.json')
  const manifest = readJson(manifestPath)

  if (manifest.source !== 'designconnected') {
    return { assetId: manifest.assetId, status: 'skipped-source' }
  }

  const response = await fetch(manifest.sourceUrl)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${manifest.sourceUrl}`)
  }

  const html = await response.text()
  const metadata = extractProductMetadata(html)
  const nextManifest = {
    ...manifest,
    brand: metadata.brand || manifest.brand,
    productName: metadata.productName || manifest.productName,
  }

  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`)

  return {
    assetId: manifest.assetId,
    status: 'updated',
    brand: nextManifest.brand,
    productName: nextManifest.productName,
  }
}

async function runQueue(items) {
  const results = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const item = items[index]
      index += 1

      try {
        results.push(await refreshManifest(item))
      } catch (error) {
        const manifest = readJson(join(item, 'manifest.json'))
        results.push({
          assetId: manifest.assetId,
          status: 'failed',
          error: error.message,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))
  return results
}

mkdirSync(inboxRoot, { recursive: true })

const results = await runQueue(candidateDirs())
results.sort((a, b) => a.assetId.localeCompare(b.assetId))
writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`)

const updated = results.filter((result) => result.status === 'updated').length
const failed = results.filter((result) => result.status === 'failed').length
console.log(`Refreshed Design Connected metadata for ${updated} asset(s); failed ${failed}.`)
