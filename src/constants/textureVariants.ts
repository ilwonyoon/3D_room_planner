import { ktx2RuntimeTextureVariants } from './textureVariants.generated'

export const enableKtx2RuntimeTextures = import.meta.env.VITE_ENABLE_KTX2_TEXTURES === 'true'

export function textureUrlWithBestVariant(textureUrl: string) {
  if (!enableKtx2RuntimeTextures || !textureUrl.startsWith('/assets/textures-runtime/')) {
    return textureUrl
  }

  const [path, query = ''] = textureUrl.split('?', 2)
  const variantPath = ktx2RuntimeTextureVariants.get(path)

  if (!variantPath) {
    return textureUrl
  }

  return query ? `${variantPath}?${query}` : variantPath
}
