export type RugShape = 'rect' | 'round' | 'oval' | 'runner'

export type RugCatalogItem = {
  id: string
  name: string
  brand: string
  source: 'polyhaven'
  sourceAssetId: string
  modelUrl: string
  thumbnailUrl: string
  dimensionsCm: [number, number, number]
  shape: RugShape
  sampleSizeM: readonly [number, number]
  maps: {
    color: string
    roughness: string
    normal: string
    displacement?: string
    ao?: string
  }
}

function rugAsset(
  id: string,
  name: string,
  sourceAssetId: string,
  dimensionsCm: [number, number, number],
  shape: RugShape,
  sampleSizeM: readonly [number, number],
): RugCatalogItem {
  const base = `/assets/textures-runtime/rugs/${id}`
  return {
    id,
    name,
    brand: 'Poly Haven',
    source: 'polyhaven',
    sourceAssetId,
    modelUrl: `/procedural/area-rug/${id}`,
    thumbnailUrl: `${base}/color.jpg`,
    dimensionsCm,
    shape,
    sampleSizeM,
    maps: {
      color: `${base}/color.jpg`,
      roughness: `${base}/roughness.jpg`,
      normal: `${base}/normal.png`,
      displacement: `${base}/displacement.png`,
      ao: `${base}/ao.jpg`,
    },
  }
}

export const RUG_CATALOG: RugCatalogItem[] = [
  rugAsset('polyhaven-caban-boucle-rug', 'Caban Boucle Rug', 'caban', [240, 160, 2], 'rect', [0.7, 0.7]),
  rugAsset('polyhaven-floral-jacquard-rug', 'Floral Jacquard Rug', 'floral_jacquard', [200, 140, 2], 'rect', [0.9, 0.9]),
  rugAsset('polyhaven-quatrefoil-jacquard-rug', 'Quatrefoil Jacquard Rug', 'quatrefoil_jacquard_fabric', [240, 160, 2], 'rect', [0.85, 0.85]),
  rugAsset('polyhaven-wool-boucle-round-rug', 'Wool Boucle Round Rug', 'wool_boucle', [180, 180, 2], 'round', [0.6, 0.6]),
  rugAsset('polyhaven-rough-linen-runner', 'Rough Linen Runner', 'rough_linen', [80, 240, 2], 'runner', [0.55, 0.75]),
  rugAsset('polyhaven-bi-stretch-runner', 'Bi Stretch Runner', 'bi_stretch', [70, 220, 2], 'runner', [0.5, 0.7]),
  rugAsset('polyhaven-cotton-jersey-rug', 'Cotton Jersey Rug', 'cotton_jersey', [200, 140, 2], 'oval', [0.75, 0.75]),
  rugAsset('polyhaven-gingham-check-round-rug', 'Gingham Check Round Rug', 'gingham_check', [160, 160, 2], 'round', [0.65, 0.65]),
  rugAsset('polyhaven-herringbone-wool-rug', 'Herringbone Wool Rug', 'poly_wool_herringbone', [230, 160, 2], 'rect', [0.7, 0.7]),
  rugAsset('polyhaven-velour-velvet-rug', 'Velour Velvet Rug', 'velour_velvet', [190, 130, 2], 'oval', [0.8, 0.8]),
]

export const RUG_BY_ID = new Map(RUG_CATALOG.map((item) => [item.id, item]))
