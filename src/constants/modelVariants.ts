import { bakedFurnitureVariantUrls } from './bakedFurnitureVariants.generated'
import { runtimeModelVariantUrls } from './runtimeModelVariants.generated'

export type ModelVariantUrls = {
  sourceModelUrl: string
  runtimeModelUrl?: string
  heroModelUrl?: string
}

export type ModelVariantRenderContext = {
  selected?: boolean
}

export const enableRuntimeModelVariants =
  import.meta.env.VITE_DISABLE_RUNTIME_VARIANTS !== 'true' &&
  import.meta.env.VITE_ENABLE_RUNTIME_VARIANTS !== 'false'

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
  const bakedModelUrl = bakedFurnitureVariantUrls.get(sourceModelUrl)
  const runtimeModelUrl = bakedModelUrl ?? runtimeModelVariantUrls.get(sourceModelUrl)
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
  const runtimeVariantUrl = bakedFurnitureVariantUrls.get(modelUrl) ?? runtimeModelVariantUrls.get(modelUrl)

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
    runtimeModelUrl?: string
    heroModelUrl?: string
  },
  context: ModelVariantRenderContext,
) {
  const runtimeVariantUrl = bakedFurnitureVariantUrls.get(model.url) ?? runtimeModelVariantUrls.get(model.url)

  if (!enableRuntimeModelVariants) {
    return model.url
  }

  if (context.selected && model.heroModelUrl) {
    return model.heroModelUrl
  }

  return model.runtimeModelUrl ?? runtimeVariantUrl ?? model.url
}
