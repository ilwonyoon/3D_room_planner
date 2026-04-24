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
  ['/assets/models/architectural/modern-wide-picture-window.optimized.glb', '20260423a'],
  ['/assets/models/architectural/modern-sliding-window.optimized.glb', '20260423a'],
  ['/assets/models/architectural/modern-tall-casement-window.optimized.glb', '20260423a'],
  ['/assets/models/architectural/modern-square-awning-window.optimized.glb', '20260423a'],
  ['/assets/models/architectural/modern-transom-window.optimized.glb', '20260423a'],
  ['/assets/model-thumbnails/modern-wide-picture-window.png', '20260423a'],
  ['/assets/model-thumbnails/modern-sliding-window.png', '20260423a'],
  ['/assets/model-thumbnails/modern-tall-casement-window.png', '20260423a'],
  ['/assets/model-thumbnails/modern-square-awning-window.png', '20260423a'],
  ['/assets/model-thumbnails/modern-transom-window.png', '20260423a'],
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

export function modelUrlWithBestVariant(modelUrl: string) {
  if (import.meta.env.VITE_ENABLE_KTX2_MODELS !== 'true' || !ktx2ModelVariantUrls.has(modelUrl)) {
    return assetUrlWithRevision(modelUrl)
  }

  return assetUrlWithRevision(modelUrl.replace('/assets/models/', '/assets/models-ktx2/'))
}
