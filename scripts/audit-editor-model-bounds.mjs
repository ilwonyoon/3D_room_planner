import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ close() {} })

const ROOT = process.cwd()
const STORE_PATH = path.join(ROOT, 'src/store/editorObjectsStore.ts')
const EPSILON_M = 0.02

const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)

function extractInitialObjectBlocks(source) {
  const start = source.indexOf('const INITIAL_OBJECTS')
  const equalsIndex = source.indexOf('=', start)
  const arrayStart = source.indexOf('[', equalsIndex)
  let depth = 0
  let arrayEnd = -1

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index]

    if (char === '[') {
      depth += 1
    } else if (char === ']') {
      depth -= 1
      if (depth === 0) {
        arrayEnd = index
        break
      }
    }
  }

  if (arrayStart < 0 || arrayEnd < 0) {
    throw new Error('Unable to find INITIAL_OBJECTS array.')
  }

  const arrayBody = source.slice(arrayStart + 1, arrayEnd)
  const blocks = []

  for (let index = 0; index < arrayBody.length; index += 1) {
    if (arrayBody[index] !== '{') {
      continue
    }

    let objectDepth = 0
    const blockStart = index

    for (; index < arrayBody.length; index += 1) {
      if (arrayBody[index] === '{') {
        objectDepth += 1
      } else if (arrayBody[index] === '}') {
        objectDepth -= 1
        if (objectDepth === 0) {
          blocks.push(arrayBody.slice(blockStart, index + 1))
          break
        }
      }
    }
  }

  return blocks
}

function parseObjectBlock(block) {
  const id = block.match(/id:\s*'([^']+)'/)?.[1]
  const url = block.match(/url:\s*(?:modelUrlWithBestVariant\()?['"]([^'"]+)['"]/)?.[1]
  const targetSize = Number(block.match(/targetSize:\s*([0-9.]+)/)?.[1])
  const dimensions = block.match(/dimensionsM:\s*\{\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*z:\s*([0-9.]+)/)

  if (!id || !url || !targetSize || !dimensions) {
    return null
  }

  return {
    id,
    url,
    targetSize,
    dimensionsM: {
      x: Number(dimensions[1]),
      y: Number(dimensions[2]),
      z: Number(dimensions[3]),
    },
  }
}

async function loadRawModelSize(modelUrl) {
  const filePath = path.join(ROOT, 'public', modelUrl)
  const buffer = await fs.readFile(filePath)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const gltf = await new Promise((resolve, reject) => loader.parse(arrayBuffer, '', resolve, reject))
  const bounds = new THREE.Box3().setFromObject(gltf.scene)
  return bounds.getSize(new THREE.Vector3())
}

function renderedDimensions(rawSize, targetSize) {
  const scale = targetSize / Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001)
  return {
    x: rawSize.x * scale,
    y: rawSize.y * scale,
    z: rawSize.z * scale,
  }
}

function maxDimensionDelta(a, b) {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.z - b.z),
  )
}

function formatDimensions(dimensions) {
  return `${dimensions.x.toFixed(3)} x ${dimensions.y.toFixed(3)} x ${dimensions.z.toFixed(3)}`
}

const source = await fs.readFile(STORE_PATH, 'utf8')
const objects = extractInitialObjectBlocks(source)
  .map(parseObjectBlock)
  .filter(Boolean)
  .filter((object) => !object.url.startsWith('/procedural/'))

const failures = []
let skippedCount = 0

for (const object of objects) {
  if (!object.url.endsWith('.glb')) {
    skippedCount += 1
    continue
  }

  const rawSize = await loadRawModelSize(object.url)
  const expected = renderedDimensions(rawSize, object.targetSize)
  const delta = maxDimensionDelta(object.dimensionsM, expected)

  if (delta > EPSILON_M) {
    failures.push({ object, expected, delta })
  }
}

if (failures.length > 0) {
  console.error(`Model bounds audit failed for ${failures.length}/${objects.length} editor objects.`)
  for (const failure of failures) {
    console.error(
      [
        failure.object.id,
        `stored=${formatDimensions(failure.object.dimensionsM)}`,
        `rendered=${formatDimensions(failure.expected)}`,
        `maxDelta=${failure.delta.toFixed(3)}m`,
      ].join(' | '),
    )
  }
  process.exit(1)
}

console.log(`Model bounds audit passed for ${objects.length - skippedCount} GLB editor objects. Skipped ${skippedCount} non-GLB assets.`)
