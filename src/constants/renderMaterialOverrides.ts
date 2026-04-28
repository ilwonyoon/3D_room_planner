export type RenderMaterialTuning = {
  baseColor?: string
  envMapIntensity?: number
  roughnessMin?: number
  roughnessMax?: number
  metalnessMin?: number
  metalnessMax?: number
  normalScaleMultiplier?: number
  emissiveColor?: string
  emissiveIntensity?: number
  clearColorMap?: boolean
  clearNormalMap?: boolean
  clearRoughnessMap?: boolean
}

type RenderMaterialRule = {
  id: string
  objectIds?: string[]
  objectIdIncludes?: string[]
  modelUrlIncludes?: string[]
  materialNameIncludes?: string[]
  tuning: RenderMaterialTuning
}

const materialRules: RenderMaterialRule[] = [
  {
    id: 'fabric-surfaces',
    materialNameIncludes: ['pillow', 'fabric', 'seat', 'cushion'],
    tuning: {
      envMapIntensity: 0.72,
      roughnessMin: 0.74,
      metalnessMax: 0,
      normalScaleMultiplier: 0.72,
    },
  },
  {
    id: 'wood-surfaces',
    materialNameIncludes: ['wood', 'oak', 'desk', 'shelf'],
    tuning: {
      envMapIntensity: 0.92,
      roughnessMin: 0.54,
      roughnessMax: 0.76,
      metalnessMax: 0,
      normalScaleMultiplier: 0.86,
    },
  },
  {
    id: 'metal-frames',
    materialNameIncludes: ['metal', 'steel', 'frame', 'leg'],
    tuning: {
      envMapIntensity: 1.05,
      roughnessMin: 0.34,
      roughnessMax: 0.58,
      metalnessMin: 0.45,
      normalScaleMultiplier: 0.82,
    },
  },
  {
    id: 'generic-lamp-emitters',
    objectIdIncludes: ['lamp'],
    materialNameIncludes: ['light', 'glass', 'emission'],
    tuning: {
      envMapIntensity: 0.55,
      roughnessMax: 0.42,
      emissiveColor: '#ffd79a',
      emissiveIntensity: 1.25,
    },
  },
  {
    id: 'desk-lamp-emitter',
    objectIds: ['desk-lamp'],
    materialNameIncludes: ['light'],
    tuning: {
      envMapIntensity: 0.5,
      roughnessMax: 0.36,
      emissiveColor: '#ffd79a',
      emissiveIntensity: 1.4,
    },
  },
  {
    id: 'floor-lamp-glass',
    objectIds: ['reading-lamp'],
    materialNameIncludes: ['glass', 'emission'],
    tuning: {
      envMapIntensity: 0.48,
      roughnessMax: 0.32,
      emissiveColor: '#ffd79a',
      emissiveIntensity: 1.85,
    },
  },
  {
    id: 'white-modern-desk',
    objectIds: ['desk'],
    tuning: {
      baseColor: '#f7f4ef',
      envMapIntensity: 0.68,
      roughnessMin: 0.52,
      roughnessMax: 0.66,
      metalnessMax: 0.06,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'white-modern-file-cabinet',
    objectIds: ['storage-right'],
    tuning: {
      baseColor: '#ece5db',
      envMapIntensity: 0.72,
      roughnessMin: 0.48,
      roughnessMax: 0.62,
      metalnessMax: 0.04,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'side-table-light-oak',
    objectIds: ['round-side-table'],
    tuning: {
      baseColor: '#d6c5ae',
      envMapIntensity: 0.76,
      roughnessMin: 0.52,
      roughnessMax: 0.68,
      metalnessMax: 0.02,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'shelves-soft-oak',
    objectIds: ['bookcase-left'],
    materialNameIncludes: ['drawer', 'drawers', 'wood', 'shelf'],
    tuning: {
      baseColor: '#dfcfba',
      envMapIntensity: 0.8,
      roughnessMin: 0.52,
      roughnessMax: 0.7,
      metalnessMax: 0.02,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'chair-upholstery-oat',
    objectIds: ['armchair', 'lounge-chair'],
    materialNameIncludes: ['pillow', 'seat', 'cushion'],
    tuning: {
      baseColor: '#e9e1d6',
      envMapIntensity: 0.58,
      roughnessMin: 0.8,
      roughnessMax: 0.9,
      metalnessMax: 0,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'chair-wood-frame',
    objectIds: ['armchair', 'lounge-chair'],
    materialNameIncludes: ['legs', 'leg', 'arm', 'wood', 'frame'],
    tuning: {
      baseColor: '#c7af91',
      envMapIntensity: 0.78,
      roughnessMin: 0.46,
      roughnessMax: 0.62,
      metalnessMax: 0.12,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'lounge-sofa-warm-fabric',
    objectIds: ['lounge-sofa'],
    tuning: {
      baseColor: '#8e8981',
      envMapIntensity: 0.56,
      roughnessMin: 0.82,
      roughnessMax: 0.92,
      metalnessMax: 0,
      normalScaleMultiplier: 0.56,
      clearColorMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'ceramic-vase-ivory',
    objectIds: ['small-plant'],
    tuning: {
      baseColor: '#f5f1ea',
      envMapIntensity: 0.56,
      roughnessMin: 0.52,
      roughnessMax: 0.68,
      metalnessMax: 0,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'floor-lamp-charcoal',
    objectIds: ['reading-lamp'],
    tuning: {
      baseColor: '#2b2b29',
      envMapIntensity: 0.74,
      roughnessMin: 0.5,
      roughnessMax: 0.66,
      metalnessMax: 0.22,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'desk-lamp-charcoal',
    objectIds: ['desk-lamp'],
    tuning: {
      baseColor: '#2f2e2b',
      envMapIntensity: 0.72,
      roughnessMin: 0.46,
      roughnessMax: 0.62,
      metalnessMax: 0,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
]

function matchesRule(rule: RenderMaterialRule, objectId: string, modelUrl: string, materialName: string) {
  const objectMatched = !rule.objectIds || rule.objectIds.includes(objectId)
  const objectIncludesMatched =
    !rule.objectIdIncludes || rule.objectIdIncludes.some((fragment) => objectId.includes(fragment))
  const modelMatched =
    !rule.modelUrlIncludes || rule.modelUrlIncludes.some((fragment) => modelUrl.includes(fragment))
  const materialMatched =
    !rule.materialNameIncludes ||
    rule.materialNameIncludes.some((fragment) => materialName.includes(fragment))

  return objectMatched && objectIncludesMatched && modelMatched && materialMatched
}

export function getRenderMaterialTuning({
  objectId,
  modelUrl,
  materialName,
}: {
  objectId: string
  modelUrl: string
  materialName: string
}) {
  const normalizedObjectId = objectId.toLowerCase()
  const normalizedModelUrl = modelUrl.toLowerCase()
  const normalizedMaterialName = materialName.toLowerCase()

  return materialRules
    .filter((rule) =>
      matchesRule(rule, normalizedObjectId, normalizedModelUrl, normalizedMaterialName),
    )
    .reduce<RenderMaterialTuning>(
      (merged, rule) => ({
        ...merged,
        ...rule.tuning,
      }),
      {
        envMapIntensity: 0.92,
        normalScaleMultiplier: 0.88,
      },
    )
}
