import { bakedFurnitureVariantUrls } from './bakedFurnitureVariants.generated'
import { runtimeModelVariantUrls } from './runtimeModelVariants.generated'

export type ModelVariantUrls = {
  sourceModelUrl: string
  runtimeModelUrl?: string
  heroModelUrl?: string
}

export type ModelVariantRenderContext = {
  selected?: boolean
  quality?: 'low' | 'medium' | 'high'
}

export const enableRuntimeModelVariants =
  import.meta.env.VITE_DISABLE_RUNTIME_VARIANTS !== 'true' &&
  import.meta.env.VITE_ENABLE_RUNTIME_VARIANTS !== 'false'
export const enableBakedFurnitureVariants =
  import.meta.env.VITE_ENABLE_BAKED_FURNITURE_VARIANTS === 'true'
export const preferSourceRoomModels =
  import.meta.env.VITE_PREFER_SOURCE_ROOM_MODELS !== 'false'

const disabledBakedFurnitureSourceUrls = new Set([
  // Current 4K bake has a black atlas artifact that becomes visible on selection.
  '/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb',
])

const disabledRuntimeVariantSourceUrls = new Set([
  // The generated lite shelf collapses part of the mesh into a black block.
  '/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb',
])

const disabledRuntimeVariantUrls = new Set([
  '/assets/generated/runtime-variants/wooden-display-shelves-runtime-lite.glb',
])

const disabledBakedFurnitureFallbackUrls = new Map([
  [
    '/assets/generated/baked-variants/wooden-display-shelves-4k-baked.glb',
    '/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb',
  ],
  [
    '/assets/generated/runtime-variants/wooden-display-shelves-runtime-lite.glb',
    '/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb',
  ],
])

function sourcePathForVariantLookup(sourceModelUrl: string) {
  return sourceModelUrl.split('?', 1)[0]
}

function safeVariantUrl(url: string | undefined) {
  if (!url) {
    return undefined
  }

  const path = sourcePathForVariantLookup(url)
  return disabledBakedFurnitureFallbackUrls.has(path) || disabledRuntimeVariantUrls.has(path) ? undefined : url
}

function sourceFallbackUrlFor(model: { url: string; sourceModelUrl?: string }) {
  const urlPath = sourcePathForVariantLookup(model.url)
  const sourcePath = model.sourceModelUrl ? sourcePathForVariantLookup(model.sourceModelUrl) : undefined

  return disabledBakedFurnitureFallbackUrls.get(urlPath) ?? sourcePath
}

function bakedFurnitureVariantUrlFor(sourceModelUrl: string) {
  const sourcePath = sourcePathForVariantLookup(sourceModelUrl)

  if (!enableBakedFurnitureVariants || disabledBakedFurnitureSourceUrls.has(sourcePath)) {
    return undefined
  }

  return bakedFurnitureVariantUrls.get(sourcePath)
}

const ktx2ModelVariantUrls = new Set([
  '/assets/models/sheen-chair.optimized.glb',
  '/assets/models/polyhaven/CoffeeTable_01.optimized.glb',
  '/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb',
  '/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb',
  '/assets/models/polyhaven/modern_arm_chair_01.optimized.glb',
  '/assets/models/polyhaven/potted_plant_04.optimized.glb',
  '/assets/models/polyhaven/side_table_01.optimized.glb',
])

const assetUrlRevisions = new Map([
  ['/assets/models/architectural/modern-wide-picture-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-triple-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-sliding-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-sliding-door-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-tall-casement-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-upper-transom-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-dynamic-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-casement-slider-window.optimized.glb', '20260424c'],
  ['/assets/models/architectural/modern-pvc-transom-window.optimized.glb', '20260424c'],
  ['/assets/model-thumbnails/modern-wide-picture-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-triple-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-sliding-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-sliding-door-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-tall-casement-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-upper-transom-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-dynamic-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-casement-slider-window.png', '20260424c'],
  ['/assets/model-thumbnails/modern-pvc-transom-window.png', '20260424c'],
])

export function assetUrlWithRevision(assetUrl: string) {
  const [path] = assetUrl.split('?', 1)
  const revision = assetUrlRevisions.get(path)

  if (!revision) {
    return assetUrl
  }

  const separator = assetUrl.includes('?') ? '&' : '?'
  return `${assetUrl}${separator}v=${revision}`
}

export function modelVariantUrlsFor(sourceModelUrl: string): ModelVariantUrls {
  const bakedModelUrl = bakedFurnitureVariantUrlFor(sourceModelUrl)
  const sourcePath = sourcePathForVariantLookup(sourceModelUrl)
  const runtimeModelUrl =
    bakedModelUrl ??
    (disabledRuntimeVariantSourceUrls.has(sourcePath) ? undefined : runtimeModelVariantUrls.get(sourceModelUrl))
  const revisedSourceModelUrl = assetUrlWithRevision(sourceModelUrl)

  return {
    sourceModelUrl: revisedSourceModelUrl,
    runtimeModelUrl: runtimeModelUrl ? assetUrlWithRevision(runtimeModelUrl) : undefined,
    heroModelUrl: bakedModelUrl
      ? assetUrlWithRevision(bakedModelUrl)
      : runtimeModelUrl
        ? revisedSourceModelUrl
        : undefined,
  }
}

export function modelUrlWithBestVariant(modelUrl: string) {
  const sourcePath = sourcePathForVariantLookup(modelUrl)
  const runtimeVariantUrl =
    bakedFurnitureVariantUrlFor(modelUrl) ??
    (disabledRuntimeVariantSourceUrls.has(sourcePath) ? undefined : runtimeModelVariantUrls.get(modelUrl))

  if (enableRuntimeModelVariants && runtimeVariantUrl) {
    return assetUrlWithRevision(runtimeVariantUrl)
  }

  if (import.meta.env.VITE_ENABLE_KTX2_MODELS !== 'true' || !ktx2ModelVariantUrls.has(modelUrl)) {
    return assetUrlWithRevision(modelUrl)
  }

  return assetUrlWithRevision(modelUrl.replace('/assets/models/', '/assets/models-ktx2/'))
}

export function modelUrlForRenderContext(
  model: {
    url: string
    sourceModelUrl?: string
    runtimeModelUrl?: string
    heroModelUrl?: string
  },
  context: ModelVariantRenderContext,
) {
  if (!enableRuntimeModelVariants) {
    return sourceFallbackUrlFor(model) ?? model.url
  }

  if (preferSourceRoomModels && model.sourceModelUrl && (context.quality === 'high' || context.selected)) {
    return sourceFallbackUrlFor(model) ?? safeVariantUrl(model.sourceModelUrl) ?? model.url
  }

  return (
    safeVariantUrl(model.runtimeModelUrl) ??
    safeVariantUrl(model.heroModelUrl) ??
    sourceFallbackUrlFor(model) ??
    safeVariantUrl(
      disabledRuntimeVariantSourceUrls.has(sourcePathForVariantLookup(model.url))
        ? undefined
        : runtimeModelVariantUrls.get(model.url),
    ) ??
    safeVariantUrl(model.url) ??
    model.url
  )
}
