import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { RUG_CATALOG } from '../src/constants/rugCatalog.ts'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const outputRoot = join(rootDir, 'public/assets/textures-runtime/rugs')
const size = process.env.POLYHAVEN_RUG_SIZE ?? '1k'

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function resolveVariant(entry, preferredFormats) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const sized = entry[size] ?? entry['2k'] ?? entry['1k']
  if (!sized || typeof sized !== 'object') {
    return null
  }

  for (const format of preferredFormats) {
    const match = sized[format]
    if (match?.url) {
      return match.url
    }
  }

  const fallback = Object.values(sized).find((candidate) => candidate?.url)
  return fallback?.url ?? null
}

async function download(url, destinationPath) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Pocketroom/1.0 (+https://github.com/openai)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }

  ensureDir(dirname(destinationPath))
  writeFileSync(destinationPath, Buffer.from(await response.arrayBuffer()))
}

async function main() {
  for (const rug of RUG_CATALOG) {
    const response = await fetch(`https://api.polyhaven.com/files/${rug.sourceAssetId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch Poly Haven manifest for ${rug.sourceAssetId}: ${response.status}`)
    }

    const manifest = await response.json()
    const destinationDir = join(outputRoot, rug.id)
    const downloads = [
      ['color.jpg', resolveVariant(manifest.Diffuse ?? manifest.diffuse ?? manifest.BaseColor, ['jpg', 'png'])],
      ['roughness.jpg', resolveVariant(manifest.Rough ?? manifest.roughness, ['jpg', 'png'])],
      ['normal.png', resolveVariant(manifest.nor_gl ?? manifest.nor_dx ?? manifest.Normal, ['png', 'jpg'])],
      ['displacement.png', resolveVariant(manifest.Displacement ?? manifest.disp ?? manifest.Height, ['png', 'jpg'])],
      ['ao.jpg', resolveVariant(manifest.AO ?? manifest.ao, ['jpg', 'png'])],
    ]

    for (const [fileName, url] of downloads) {
      if (!url) {
        continue
      }

      await download(url, join(destinationDir, fileName))
    }

    console.log(`downloaded rug texture set for ${rug.id}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
