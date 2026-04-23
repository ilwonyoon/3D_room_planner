const ktx2ModelVariantUrls = new Set([
  '/assets/models/sheen-chair.optimized.glb',
  '/assets/models/polyhaven/CoffeeTable_01.optimized.glb',
  '/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb',
  '/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb',
  '/assets/models/polyhaven/modern_arm_chair_01.optimized.glb',
  '/assets/models/polyhaven/potted_plant_04.optimized.glb',
  '/assets/models/polyhaven/side_table_01.optimized.glb',
])

export function modelUrlWithBestVariant(modelUrl: string) {
  if (import.meta.env.VITE_ENABLE_KTX2_MODELS !== 'true' || !ktx2ModelVariantUrls.has(modelUrl)) {
    return modelUrl
  }

  return modelUrl.replace('/assets/models/', '/assets/models-ktx2/')
}
