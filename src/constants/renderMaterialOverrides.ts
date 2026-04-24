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
    id: 'white-home-office-desk',
    objectIds: ['desk'],
    modelUrlIncludes: ['designconnected-dita-desk-with-drawer'],
    tuning: {
      baseColor: '#f2eee7',
      envMapIntensity: 0.9,
      roughnessMin: 0.58,
      roughnessMax: 0.72,
      metalnessMax: 0,
    },
  },
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
