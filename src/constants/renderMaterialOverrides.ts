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
      baseColor: '#f3f1ed',
      envMapIntensity: 0.72,
      roughnessMin: 0.46,
      roughnessMax: 0.58,
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
      baseColor: '#f5f3ef',
      envMapIntensity: 0.66,
      roughnessMin: 0.42,
      roughnessMax: 0.56,
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
      baseColor: '#d9ccb9',
      envMapIntensity: 0.78,
      roughnessMin: 0.48,
      roughnessMax: 0.62,
      metalnessMax: 0.02,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'shelves-soft-oak',
    objectIds: ['bookcase-left'],
    materialNameIncludes: ['drawers'],
    tuning: {
      baseColor: '#ddd0bd',
      envMapIntensity: 0.82,
      roughnessMin: 0.52,
      roughnessMax: 0.66,
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
      baseColor: '#d8d1c8',
      envMapIntensity: 0.64,
      roughnessMin: 0.76,
      roughnessMax: 0.88,
      metalnessMax: 0,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'chair-legs-charcoal',
    objectIds: ['armchair', 'lounge-chair'],
    materialNameIncludes: ['legs'],
    tuning: {
      baseColor: '#3d3935',
      envMapIntensity: 0.82,
      roughnessMin: 0.42,
      roughnessMax: 0.58,
      metalnessMin: 0.16,
      metalnessMax: 0.28,
      clearColorMap: true,
      clearNormalMap: true,
      clearRoughnessMap: true,
    },
  },
  {
    id: 'ceramic-vase-ivory',
    objectIds: ['small-plant'],
    tuning: {
      baseColor: '#f2efe9',
      envMapIntensity: 0.62,
      roughnessMin: 0.48,
      roughnessMax: 0.64,
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
