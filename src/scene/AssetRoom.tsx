import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js'

import { getRenderMaterialTuning } from '@/constants/renderMaterialOverrides'
import { RUG_BY_ID, type RugCatalogItem } from '@/constants/rugCatalog'
import { modelUrlForRenderContext } from '@/constants/modelVariants'
import { enableKtx2RuntimeTextures, textureUrlWithBestVariant } from '@/constants/textureVariants'
import {
  useCameraViewStore,
  useEditorObjectsStore,
  useLightingPresetStore,
  useRoomSettingsStore,
  useRoomStore,
  useSelectionStore,
} from '@/store'
import type { CameraViewMode, EditorObject, LightingPresetId } from '@/store'

const TEXTURE_REPEAT = {
  floor: [1.55, 1.55] as const,
  wall: [1.15, 0.85] as const,
}
const BAKED_LIGHTING_TEXTURES = {
  floorAo: '/assets/generated/blender/floor-static-ao.png',
  floorLight: '/assets/generated/blender/floor-window-wash.png',
  backWallAo: '/assets/generated/blender/back-wall-static-ao.png',
  backWallLight: '/assets/generated/blender/back-wall-window-glow.png',
  leftWallAo: '/assets/generated/blender/left-wall-static-ao.png',
  rightWallAo: '/assets/generated/blender/right-wall-static-ao.png',
  frontWallAo: '/assets/generated/blender/front-wall-static-ao.png',
}
const BAKED_LIGHTING_VIEW_SETTINGS = {
  isometric: {
    floorAo: 0.26,
    floorLight: 0.18,
    backWallAo: 0.18,
    backWallLight: 0.32,
    leftWallAo: 0.2,
    rightWallAo: 0.16,
    frontWallAo: 0.16,
  },
  bird: {
    floorAo: 0.18,
    floorLight: 0.16,
    backWallAo: 0.11,
    backWallLight: 0.28,
    leftWallAo: 0.11,
    rightWallAo: 0.11,
    frontWallAo: 0.11,
  },
  pov: {
    floorAo: 0.3,
    floorLight: 0.12,
    backWallAo: 0.22,
    backWallLight: 0.2,
    leftWallAo: 0.24,
    rightWallAo: 0.22,
    frontWallAo: 0.22,
  },
} satisfies Record<CameraViewMode, Record<keyof typeof BAKED_LIGHTING_TEXTURES, number>>
const BAKED_LIGHTING_PRESET_MULTIPLIERS = {
  'daylight-window': {
    floorAo: 1,
    floorLight: 1,
    backWallAo: 1,
    backWallLight: 1,
    leftWallAo: 1,
    rightWallAo: 1,
    frontWallAo: 1,
  },
  'warm-evening': {
    floorAo: 1,
    floorLight: 0.92,
    backWallAo: 1,
    backWallLight: 0.88,
    leftWallAo: 1,
    rightWallAo: 1,
    frontWallAo: 1,
  },
  'night-room': {
    floorAo: 1.06,
    floorLight: 0.22,
    backWallAo: 1.08,
    backWallLight: 0.08,
    leftWallAo: 1.08,
    rightWallAo: 1.08,
    frontWallAo: 1.08,
  },
} satisfies Record<LightingPresetId, Record<keyof typeof BAKED_LIGHTING_TEXTURES, number>>
const LAMP_EMISSIVE_COLOR = '#ffd79a'
const MODEL_SHADOW_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#090604',
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
})
const DIMENSION_SYNC_EPSILON_M = 0.015
const RAYCAST_HITBOX_LAYER = 2
const KTX2_TRANSCODER_PATH = '/basis/'
let ktx2Loader: KTX2Loader | null = null
let dracoLoader: DRACOLoader | null = null
const modelResourceCache = new Map<string, THREE.Object3D>()
const modelResourcePromiseCache = new Map<string, Promise<THREE.Object3D>>()
const modelResourceErrorCache = new Map<string, unknown>()

type WallSide = 'back' | 'front' | 'left' | 'right'
type GltfExtendLoader = (loader: GLTFLoader) => void
type TexturePathSet = Record<string, string>
type TextureSet<TPaths extends TexturePathSet> = Record<keyof TPaths, THREE.Texture>

function isKtx2TextureUrl(url: string) {
  return url.split('?', 1)[0].endsWith('.ktx2')
}

function extendGltfLoaderWithKtx2(renderer: THREE.WebGLRenderer): GltfExtendLoader {
  return (loader) => {
    if (!ktx2Loader) {
      ktx2Loader = new KTX2Loader().setTranscoderPath(KTX2_TRANSCODER_PATH)
      ktx2Loader.detectSupport(renderer)
    }

    loader.setKTX2Loader(ktx2Loader as unknown as Parameters<typeof loader.setKTX2Loader>[0])
  }
}

function extendGltfLoaderWithCompression(renderer: THREE.WebGLRenderer): GltfExtendLoader {
  const extendKtx2 = extendGltfLoaderWithKtx2(renderer)

  return (loader) => {
    extendKtx2(loader)

    if (!dracoLoader) {
      dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
    }

    loader.setDRACOLoader(dracoLoader)
    loader.setMeshoptDecoder(MeshoptDecoder)
  }
}

function setRaycastHitboxLayer(object: THREE.Object3D) {
  object.layers.set(RAYCAST_HITBOX_LAYER)
}

function disableRaycast(object: THREE.Object3D) {
  object.raycast = () => {}
}

function stripEmbeddedLights(root: THREE.Object3D) {
  const lights: THREE.Light[] = []
  const targets = new Set<THREE.Object3D>()

  root.traverse((node) => {
    if (!(node instanceof THREE.Light)) {
      return
    }

    lights.push(node)

    if ('target' in node && node.target instanceof THREE.Object3D && node.target.parent) {
      targets.add(node.target)
    }
  })

  lights.forEach((light) => {
    light.parent?.remove(light)
  })

  targets.forEach((target) => {
    target.parent?.remove(target)
  })
}

function renderedDimensionsFromRawSize(rawSize: THREE.Vector3, targetSize: number) {
  const uniformScale = targetSize / Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001)

  return {
    x: rawSize.x * uniformScale,
    y: rawSize.y * uniformScale,
    z: rawSize.z * uniformScale,
  }
}

function dimensionsMismatch(
  current: { x: number; y: number; z: number },
  next: { x: number; y: number; z: number },
) {
  return (
    Math.abs(current.x - next.x) > DIMENSION_SYNC_EPSILON_M ||
    Math.abs(current.y - next.y) > DIMENSION_SYNC_EPSILON_M ||
    Math.abs(current.z - next.z) > DIMENSION_SYNC_EPSILON_M
  )
}

function createRadialGlowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.34, 'rgba(255,216,150,0.42)')
  gradient.addColorStop(1, 'rgba(255,216,150,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function visibleWallSides(cameraPosition: THREE.Vector3) {
  return {
    back: cameraPosition.z >= 0,
    front: cameraPosition.z < 0,
    left: cameraPosition.x >= 0,
    right: cameraPosition.x < 0,
  } satisfies Record<WallSide, boolean>
}

function visibleWallSidesForMode(cameraPosition: THREE.Vector3, mode: CameraViewMode) {
  if (mode !== 'isometric') {
    return {
      back: true,
      front: true,
      left: true,
      right: true,
    } satisfies Record<WallSide, boolean>
  }

  return visibleWallSides(cameraPosition)
}

function wallSideFromPosition(
  position: { x: number; z: number },
  room: { widthM: number; depthM: number },
): WallSide {
  const distances: Array<{ side: WallSide; distance: number }> = [
    { side: 'back', distance: Math.abs(position.z + room.depthM / 2) },
    { side: 'front', distance: Math.abs(position.z - room.depthM / 2) },
    { side: 'left', distance: Math.abs(position.x + room.widthM / 2) },
    { side: 'right', distance: Math.abs(position.x - room.widthM / 2) },
  ]

  distances.sort((a, b) => a.distance - b.distance)
  return distances[0].side
}

function configureTexture(
  texture: THREE.Texture,
  repeat: readonly [number, number],
  color = false,
) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.anisotropy = 8
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function useTextureSet<TPaths extends TexturePathSet>(paths: TPaths): TextureSet<TPaths> {
  const gl = useThree((state) => state.gl)
  const entries = useMemo(
    () => {
      const baseEntries = Object.entries(paths)
      const variantEntries = baseEntries.map(
        ([key, path]) => [key, textureUrlWithBestVariant(path)] as const,
      )
      const ktx2VariantCount = variantEntries.filter(([, path]) => isKtx2TextureUrl(path)).length

      if (
        enableKtx2RuntimeTextures &&
        ktx2VariantCount > 0 &&
        ktx2VariantCount < variantEntries.length
      ) {
        return baseEntries
      }

      return variantEntries
    },
    [paths],
  )
  const urls = useMemo(() => entries.map(([, path]) => path), [entries])
  const useKtx2 = enableKtx2RuntimeTextures && urls.every(isKtx2TextureUrl)
  const Loader = useKtx2 ? KTX2Loader : THREE.TextureLoader
  const textures = useLoader(Loader, urls, (loader) => {
    if (loader instanceof KTX2Loader) {
      loader.setTranscoderPath(KTX2_TRANSCODER_PATH)
      loader.detectSupport(gl)
    }
  }) as THREE.Texture[]

  return useMemo(
    () =>
      Object.fromEntries(entries.map(([key], index) => [key, textures[index]])) as TextureSet<TPaths>,
    [entries, textures],
  )
}

function repeatFromSampleSize(
  surfaceSizeM: readonly [number, number],
  sampleSizeM: readonly [number, number],
): readonly [number, number] {
  return [
    Math.max(1, surfaceSizeM[0] / Math.max(sampleSizeM[0], 0.001)),
    Math.max(1, surfaceSizeM[1] / Math.max(sampleSizeM[1], 0.001)),
  ] as const
}

function configureBakedMaskTexture(texture: THREE.Texture) {
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(1, 1)
  texture.anisotropy = 4
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function makePlaneGeometry(width: number, height: number, segments = 96) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array, 2))
  return geometry
}

function useBakedRoomLightingTextures() {
  const textures = useTexture(BAKED_LIGHTING_TEXTURES) as {
    floorAo: THREE.Texture
    floorLight: THREE.Texture
    backWallAo: THREE.Texture
    backWallLight: THREE.Texture
    leftWallAo: THREE.Texture
    rightWallAo: THREE.Texture
    frontWallAo: THREE.Texture
  }

  useMemo(() => {
    configureBakedMaskTexture(textures.floorAo)
    configureBakedMaskTexture(textures.floorLight)
    configureBakedMaskTexture(textures.backWallAo)
    configureBakedMaskTexture(textures.backWallLight)
    configureBakedMaskTexture(textures.leftWallAo)
    configureBakedMaskTexture(textures.rightWallAo)
    configureBakedMaskTexture(textures.frontWallAo)
  }, [textures])

  return textures
}

function usePbrRoomMaterials() {
  const room = useRoomStore((s) => s.room)
  const floorMaterial = useRoomSettingsStore((s) => s.floorMaterial)
  const wallMaterial = useRoomSettingsStore((s) => s.wallMaterial)
  const floorRepeat = useMemo(
    () =>
      floorMaterial.sampleSizeM
        ? repeatFromSampleSize([room.widthM, room.depthM], floorMaterial.sampleSizeM)
        : (floorMaterial.repeat ?? TEXTURE_REPEAT.floor),
    [floorMaterial.repeat, floorMaterial.sampleSizeM, room.depthM, room.widthM],
  )

  const floorTexturePaths = useMemo(
    () => ({
      map: floorMaterial.maps.color,
      normalMap: floorMaterial.maps.normal,
      roughnessMap: floorMaterial.maps.roughness,
      displacementMap: floorMaterial.maps.displacement ?? floorMaterial.maps.roughness,
      ...(floorMaterial.maps.ao ? { aoMap: floorMaterial.maps.ao } : {}),
    }),
    [floorMaterial],
  )

  const wallTexturePaths = useMemo(
    () => ({
      map: wallMaterial.maps.color,
      normalMap: wallMaterial.maps.normal,
      roughnessMap: wallMaterial.maps.roughness,
      displacementMap: wallMaterial.maps.displacement ?? wallMaterial.maps.roughness,
      ...(wallMaterial.maps.ao ? { aoMap: wallMaterial.maps.ao } : {}),
    }),
    [wallMaterial],
  )

  const floorTextures = useTextureSet(floorTexturePaths) as {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    displacementMap: THREE.Texture
    aoMap?: THREE.Texture
  }

  const wallTextures = useTextureSet(wallTexturePaths) as {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    displacementMap: THREE.Texture
    aoMap?: THREE.Texture
  }

  useMemo(() => {
    configureTexture(floorTextures.map, floorRepeat, true)
    configureTexture(floorTextures.normalMap, floorRepeat)
    configureTexture(floorTextures.roughnessMap, floorRepeat)
    configureTexture(floorTextures.displacementMap, floorRepeat)
    if (floorTextures.aoMap) {
      configureTexture(floorTextures.aoMap, floorRepeat)
    }

    configureTexture(wallTextures.map, wallMaterial.repeat ?? TEXTURE_REPEAT.wall, true)
    configureTexture(wallTextures.normalMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    configureTexture(wallTextures.roughnessMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    configureTexture(wallTextures.displacementMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    if (wallTextures.aoMap) {
      configureTexture(wallTextures.aoMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    }
  }, [floorRepeat, floorTextures, wallMaterial, wallTextures])

  return useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({
        ...floorTextures,
        color: '#ece2d4',
        roughness: 0.96,
        metalness: 0,
        envMapIntensity: 0.04,
        normalScale: new THREE.Vector2(
          Math.min(floorMaterial.relief?.normalScale ?? 0.1, 0.055),
          Math.min(floorMaterial.relief?.normalScale ?? 0.1, 0.055),
        ),
        aoMapIntensity: Math.min(floorMaterial.relief?.aoIntensity ?? 0.62, 0.42),
        displacementScale: Math.min(floorMaterial.relief?.displacementScale ?? 0.002, 0.00055),
        displacementBias: Math.max(floorMaterial.relief?.displacementBias ?? -0.0008, -0.00022),
      }),
      wall: new THREE.MeshStandardMaterial({
        ...wallTextures,
        color: '#fdfcf9',
        roughness: 0.98,
        metalness: 0,
        normalScale: new THREE.Vector2(0.012, 0.012),
        aoMapIntensity: 0.06,
        displacementScale: 0.00015,
        displacementBias: -0.00006,
      }),
      trim: new THREE.MeshStandardMaterial({ color: '#fffdfa', roughness: 0.7 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#f2f8fb',
        emissive: '#d7edf7',
        emissiveIntensity: 0.04,
        roughness: 0.06,
        transmission: 0.14,
        transparent: true,
        opacity: 0.5,
      }),
      curtain: new THREE.MeshStandardMaterial({
        color: '#fcfbf7',
        roughness: 0.96,
        transparent: true,
        opacity: 0.86,
      }),
      mattress: new THREE.MeshStandardMaterial({
        color: '#7d8299',
        roughness: 0.86,
        metalness: 0,
      }),
      fabricLight: new THREE.MeshStandardMaterial({
        color: '#f7f3ed',
        roughness: 0.94,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: '#c7b49a',
        roughness: 0.44,
        metalness: 0.58,
      }),
      deviceMetal: new THREE.MeshStandardMaterial({
        color: '#d8d4cc',
        roughness: 0.32,
        metalness: 0.68,
      }),
      deviceDark: new THREE.MeshStandardMaterial({
        color: '#101112',
        roughness: 0.46,
        metalness: 0.08,
      }),
      deviceScreen: new THREE.MeshPhysicalMaterial({
        color: '#14181c',
        emissive: '#17222c',
        emissiveIntensity: 0.05,
        roughness: 0.18,
        metalness: 0,
        clearcoat: 0.5,
        clearcoatRoughness: 0.18,
      }),
      plant: new THREE.MeshStandardMaterial({ color: '#628267', roughness: 0.74 }),
      plantDark: new THREE.MeshStandardMaterial({ color: '#3d5d45', roughness: 0.82 }),
      pot: new THREE.MeshStandardMaterial({ color: '#d8d1c8', roughness: 0.88 }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    }),
    [floorMaterial.relief, floorTextures, wallTextures],
  )
}

function FloorShadow({
  material,
  position,
  scale,
  opacity,
}: {
  material: THREE.MeshBasicMaterial
  position: [number, number, number]
  scale: [number, number, number]
  opacity?: number
}) {
  const localMaterial = useMemo(() => material.clone(), [material])
  localMaterial.opacity = opacity ?? material.opacity

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale} material={localMaterial}>
      <circleGeometry args={[1, 64]} />
    </mesh>
  )
}

function RoomShell({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  const room = useRoomStore((s) => s.room)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const lightingPreset = useLightingPresetStore((s) => s.preset)
  const { widthM: width, depthM: depth, heightM: height } = room
  const bakedLighting = useBakedRoomLightingTextures()
  const bakedLightingStrength = BAKED_LIGHTING_VIEW_SETTINGS[cameraMode]
  const bakedLightingMultiplier = BAKED_LIGHTING_PRESET_MULTIPLIERS[lightingPreset]
  const bakedOpacity = (key: keyof typeof BAKED_LIGHTING_TEXTURES) =>
    bakedLightingStrength[key] * bakedLightingMultiplier[key]
  const backWallRef = useRef<THREE.Group>(null)
  const frontWallRef = useRef<THREE.Group>(null)
  const leftWallRef = useRef<THREE.Group>(null)
  const rightWallRef = useRef<THREE.Group>(null)
  const backOpenEdgeRef = useRef<THREE.Mesh>(null)
  const frontOpenEdgeRef = useRef<THREE.Mesh>(null)
  const leftOpenEdgeRef = useRef<THREE.Mesh>(null)
  const rightOpenEdgeRef = useRef<THREE.Mesh>(null)
  const backLeftCornerRef = useRef<THREE.Mesh>(null)
  const backRightCornerRef = useRef<THREE.Mesh>(null)
  const frontLeftCornerRef = useRef<THREE.Mesh>(null)
  const frontRightCornerRef = useRef<THREE.Mesh>(null)

  const floorSegments = useMemo(
    () => Math.min(192, Math.max(96, Math.ceil(Math.max(width, depth) * 24))),
    [depth, width],
  )
  const floorGeometry = useMemo(() => makePlaneGeometry(width, depth, floorSegments), [floorSegments, width, depth])
  const widthWallGeometry = useMemo(() => makePlaneGeometry(width, height, 32), [width, height])
  const depthWallGeometry = useMemo(() => makePlaneGeometry(depth, height, 32), [depth, height])
  const baseboardHeight = 0.065
  const baseboardDepth = 0.048
  const crownHeight = 0.042
  const crownDepth = 0.038
  const cornerPostSize = 0.045

  useFrame(({ camera }) => {
    const visibleSides = visibleWallSidesForMode(camera.position, cameraMode)

    if (backWallRef.current) backWallRef.current.visible = visibleSides.back
    if (frontWallRef.current) frontWallRef.current.visible = visibleSides.front
    if (leftWallRef.current) leftWallRef.current.visible = visibleSides.left
    if (rightWallRef.current) rightWallRef.current.visible = visibleSides.right
    if (backOpenEdgeRef.current) backOpenEdgeRef.current.visible = !visibleSides.back
    if (frontOpenEdgeRef.current) frontOpenEdgeRef.current.visible = !visibleSides.front
    if (leftOpenEdgeRef.current) leftOpenEdgeRef.current.visible = !visibleSides.left
    if (rightOpenEdgeRef.current) rightOpenEdgeRef.current.visible = !visibleSides.right
    if (backLeftCornerRef.current) backLeftCornerRef.current.visible = visibleSides.back && visibleSides.left
    if (backRightCornerRef.current) backRightCornerRef.current.visible = visibleSides.back && visibleSides.right
    if (frontLeftCornerRef.current) frontLeftCornerRef.current.visible = visibleSides.front && visibleSides.left
    if (frontRightCornerRef.current) frontRightCornerRef.current.visible = visibleSides.front && visibleSides.right
  })

  return (
    <group>
      <mesh
        geometry={floorGeometry}
        material={materials.floor}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />
      <mesh
        geometry={floorGeometry}
        position={[0, 0.008, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <meshBasicMaterial
          color="#211812"
          transparent
          opacity={bakedOpacity('floorAo')}
          alphaMap={bakedLighting.floorAo}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        geometry={floorGeometry}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <meshBasicMaterial
          color="#f1d6aa"
          transparent
          opacity={bakedOpacity('floorLight')}
          alphaMap={bakedLighting.floorLight}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>

      <group ref={backWallRef}>
        <mesh
          geometry={widthWallGeometry}
          material={materials.wall}
          position={[0, height / 2, -depth / 2]}
          receiveShadow
        />
        <mesh
          geometry={widthWallGeometry}
          position={[0, height / 2, -depth / 2 + 0.005]}
          renderOrder={1}
        >
          <meshBasicMaterial
            color="#211812"
            transparent
            opacity={bakedOpacity('backWallAo')}
            alphaMap={bakedLighting.backWallAo}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          geometry={widthWallGeometry}
          position={[0, height / 2, -depth / 2 + 0.006]}
          renderOrder={2}
        >
          <meshBasicMaterial
            color="#ffe0b5"
            transparent
            opacity={bakedOpacity('backWallLight')}
            alphaMap={bakedLighting.backWallLight}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, baseboardHeight / 2, -depth / 2 + baseboardDepth / 2]} material={materials.trim}>
          <boxGeometry args={[width + 0.04, baseboardHeight, baseboardDepth]} />
        </mesh>
        <mesh position={[0, height - crownHeight / 2, -depth / 2 + crownDepth / 2]} material={materials.trim}>
          <boxGeometry args={[width + 0.04, crownHeight, crownDepth]} />
        </mesh>
      </group>

      <group ref={frontWallRef} visible={false}>
        <mesh
          geometry={widthWallGeometry}
          material={materials.wall}
          position={[0, height / 2, depth / 2]}
          rotation={[0, Math.PI, 0]}
          receiveShadow
        />
        <mesh
          geometry={widthWallGeometry}
          position={[0, height / 2, depth / 2 - 0.005]}
          rotation={[0, Math.PI, 0]}
          renderOrder={1}
        >
          <meshBasicMaterial
            color="#211812"
            transparent
            opacity={bakedOpacity('frontWallAo')}
            alphaMap={bakedLighting.frontWallAo}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, baseboardHeight / 2, depth / 2 - baseboardDepth / 2]} material={materials.trim}>
          <boxGeometry args={[width + 0.04, baseboardHeight, baseboardDepth]} />
        </mesh>
        <mesh position={[0, height - crownHeight / 2, depth / 2 - crownDepth / 2]} material={materials.trim}>
          <boxGeometry args={[width + 0.04, crownHeight, crownDepth]} />
        </mesh>
      </group>

      <group ref={leftWallRef}>
        <mesh
          geometry={depthWallGeometry}
          material={materials.wall}
          position={[-width / 2, height / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          receiveShadow
        />
        <mesh
          geometry={depthWallGeometry}
          position={[-width / 2 + 0.006, height / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          renderOrder={2}
        >
          <meshBasicMaterial
            color="#211812"
            transparent
            opacity={bakedOpacity('leftWallAo')}
            alphaMap={bakedLighting.leftWallAo}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[-width / 2 + baseboardDepth / 2, baseboardHeight / 2, 0]} material={materials.trim}>
          <boxGeometry args={[baseboardDepth, baseboardHeight, depth + 0.04]} />
        </mesh>
        <mesh position={[-width / 2 + crownDepth / 2, height - crownHeight / 2, 0]} material={materials.trim}>
          <boxGeometry args={[crownDepth, crownHeight, depth + 0.04]} />
        </mesh>
      </group>

      <group ref={rightWallRef} visible={false}>
        <mesh
          geometry={depthWallGeometry}
          material={materials.wall}
          position={[width / 2, height / 2, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          receiveShadow
        />
        <mesh
          geometry={depthWallGeometry}
          position={[width / 2 - 0.006, height / 2, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          renderOrder={2}
        >
          <meshBasicMaterial
            color="#211812"
            transparent
            opacity={bakedOpacity('rightWallAo')}
            alphaMap={bakedLighting.rightWallAo}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[width / 2 - baseboardDepth / 2, baseboardHeight / 2, 0]} material={materials.trim}>
          <boxGeometry args={[baseboardDepth, baseboardHeight, depth + 0.04]} />
        </mesh>
        <mesh position={[width / 2 - crownDepth / 2, height - crownHeight / 2, 0]} material={materials.trim}>
          <boxGeometry args={[crownDepth, crownHeight, depth + 0.04]} />
        </mesh>
      </group>

      <mesh
        ref={backLeftCornerRef}
        position={[-width / 2 + cornerPostSize / 2, height / 2, -depth / 2 + cornerPostSize / 2]}
        material={materials.trim}
      >
        <boxGeometry args={[cornerPostSize, height, cornerPostSize]} />
      </mesh>
      <mesh
        ref={backRightCornerRef}
        position={[width / 2 - cornerPostSize / 2, height / 2, -depth / 2 + cornerPostSize / 2]}
        material={materials.trim}
      >
        <boxGeometry args={[cornerPostSize, height, cornerPostSize]} />
      </mesh>
      <mesh
        ref={frontLeftCornerRef}
        position={[-width / 2 + cornerPostSize / 2, height / 2, depth / 2 - cornerPostSize / 2]}
        material={materials.trim}
      >
        <boxGeometry args={[cornerPostSize, height, cornerPostSize]} />
      </mesh>
      <mesh
        ref={frontRightCornerRef}
        position={[width / 2 - cornerPostSize / 2, height / 2, depth / 2 - cornerPostSize / 2]}
        material={materials.trim}
      >
        <boxGeometry args={[cornerPostSize, height, cornerPostSize]} />
      </mesh>

      <mesh
        ref={backOpenEdgeRef}
        position={[0, baseboardHeight / 2, -depth / 2 + baseboardDepth / 2]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[width + 0.04, baseboardHeight, baseboardDepth]} />
      </mesh>
      <mesh
        ref={frontOpenEdgeRef}
        position={[0, baseboardHeight / 2, depth / 2 - baseboardDepth / 2]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[width + 0.04, baseboardHeight, baseboardDepth]} />
      </mesh>
      <mesh
        ref={leftOpenEdgeRef}
        position={[-width / 2 + baseboardDepth / 2, baseboardHeight / 2, 0]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[baseboardDepth, baseboardHeight, depth + 0.04]} />
      </mesh>
      <mesh
        ref={rightOpenEdgeRef}
        position={[width / 2 - baseboardDepth / 2, baseboardHeight / 2, 0]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[baseboardDepth, baseboardHeight, depth + 0.04]} />
      </mesh>
    </group>
  )
}

function WindowAndCurtains({
  materials,
  object,
}: {
  materials: ReturnType<typeof usePbrRoomMaterials>
  object: EditorObject
}) {
  const width = object.dimensionsM.x
  const height = object.dimensionsM.y
  const rodHeight = 0.036
  const rodDepth = 0.048
  const panelInset = Math.max(0.12, width * 0.08)
  const panelWidth = Math.max(0.12, (width - panelInset * 1.4) / 2)
  const pleatWidth = Math.max(0.036, panelWidth / 4.5)

  return (
    <group>
      <mesh position={[0, height - rodHeight / 2, 0.035]} material={materials.trim}>
        <boxGeometry args={[width, rodHeight, rodDepth]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 - panelInset - panelWidth / 2), height / 2, 0.05]}>
          {[-1.5, -0.5, 0.5, 1.5].map((offset) => (
            <mesh key={offset} position={[offset, 0, 0]} material={materials.curtain}>
              <boxGeometry args={[pleatWidth, height, 0.024]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function WindowOpening({
  object,
}: {
  object: EditorObject
}) {
  const cameraMode = useCameraViewStore((s) => s.mode)
  const lightingPreset = useLightingPresetStore((s) => s.preset)
  const isNight = lightingPreset === 'night-room'
  const width = object.dimensionsM.x
  const height = object.dimensionsM.y
  const frame = Math.min(0.055, width * 0.08, height * 0.1)
  const glassWidth = Math.max(0.08, width - frame * 2.4)
  const glassHeight = Math.max(0.08, height - frame * 2.4)
  const middleRail = width > 0.82
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: isNight ? '#2e3e4f' : '#e9f6fb',
        emissive: isNight ? '#0e1720' : '#cbeeff',
        emissiveIntensity: isNight ? 0.008 : 0.08,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: isNight ? 0.22 : 0.38,
      }),
    [isNight],
  )
  const skyMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: isNight ? '#121c27' : '#d7eef7',
        transparent: true,
        opacity: isNight ? 0.42 : 0.82,
        toneMapped: false,
      }),
    [isNight],
  )
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: isNight ? '#415a72' : '#e7f7ff',
        transparent: true,
        opacity: isNight ? 0.008 : cameraMode === 'pov' ? 0.035 : cameraMode === 'bird' ? 0.065 : 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [cameraMode, isNight],
  )
  const frameMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: isNight ? '#d7d4cf' : '#fffdfa', roughness: 0.62 }),
    [isNight],
  )
  const railMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c6ced6', roughness: 0.62 }),
    [],
  )

  return (
    <group>
      <mesh position={[0, height / 2, 0.006]} material={glowMaterial}>
        <planeGeometry args={[width * 1.18, height * 1.14]} />
      </mesh>
      <mesh position={[0, height / 2, 0.01]} material={skyMaterial}>
        <planeGeometry args={[glassWidth, glassHeight]} />
      </mesh>
      <mesh position={[0, height / 2, 0.018]} material={glassMaterial}>
        <planeGeometry args={[glassWidth, glassHeight]} />
      </mesh>
      <mesh position={[0, height - frame / 2, 0.035]} material={frameMaterial}>
        <boxGeometry args={[width, frame, 0.05]} />
      </mesh>
      <mesh position={[0, frame / 2, 0.035]} material={frameMaterial}>
        <boxGeometry args={[width, frame, 0.05]} />
      </mesh>
      <mesh position={[-width / 2 + frame / 2, height / 2, 0.035]} material={frameMaterial}>
        <boxGeometry args={[frame, height, 0.05]} />
      </mesh>
      <mesh position={[width / 2 - frame / 2, height / 2, 0.035]} material={frameMaterial}>
        <boxGeometry args={[frame, height, 0.05]} />
      </mesh>
      {middleRail ? (
        <mesh position={[0, height / 2, 0.04]} material={railMaterial}>
          <boxGeometry args={[frame * 0.8, glassHeight, 0.045]} />
        </mesh>
      ) : null}
    </group>
  )
}

function AreaRug({ object }: { object: EditorObject }) {
  const rugId =
    object.catalogItemId && RUG_BY_ID.has(object.catalogItemId)
      ? object.catalogItemId
      : object.url.startsWith('/procedural/area-rug/')
        ? object.url.replace('/procedural/area-rug/', '')
        : null
  const rugVariant = rugId ? RUG_BY_ID.get(rugId) ?? null : null

  if (rugVariant) {
    return <TexturedAreaRug object={object} variant={rugVariant} />
  }

  return <BasicAreaRug object={object} />
}

function BasicAreaRug({ object }: { object: EditorObject }) {
  const rugMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f4efe7',
        roughness: 0.96,
        metalness: 0,
      }),
    [],
  )
  const borderMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.9,
        metalness: 0,
      }),
    [],
  )
  const width = object.dimensionsM.x
  const depth = object.dimensionsM.z

  return (
    <group>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={rugMaterial} receiveShadow>
        <planeGeometry args={[width, depth]} />
      </mesh>
      <mesh position={[0, 0.007, -depth / 2 + 0.035]} material={borderMaterial}>
        <boxGeometry args={[width, 0.01, 0.07]} />
      </mesh>
      <mesh position={[0, 0.007, depth / 2 - 0.035]} material={borderMaterial}>
        <boxGeometry args={[width, 0.01, 0.07]} />
      </mesh>
      <mesh position={[-width / 2 + 0.035, 0.007, 0]} material={borderMaterial}>
        <boxGeometry args={[0.07, 0.01, depth]} />
      </mesh>
      <mesh position={[width / 2 - 0.035, 0.007, 0]} material={borderMaterial}>
        <boxGeometry args={[0.07, 0.01, depth]} />
      </mesh>
    </group>
  )
}

function TexturedAreaRug({ object, variant }: { object: EditorObject; variant: RugCatalogItem }) {
  const texturePaths = useMemo(
    () => ({
      map: variant.maps.color,
      normalMap: variant.maps.normal,
      roughnessMap: variant.maps.roughness,
      displacementMap: variant.maps.displacement ?? variant.maps.roughness,
      ...(variant.maps.ao ? { aoMap: variant.maps.ao } : {}),
    }),
    [variant],
  )
  const textures = useTextureSet(texturePaths) as {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    displacementMap: THREE.Texture
    aoMap?: THREE.Texture
  }
  const width = object.dimensionsM.x
  const depth = object.dimensionsM.z
  const repeat = useMemo(
    () => repeatFromSampleSize([width, depth], variant.sampleSizeM),
    [depth, variant.sampleSizeM, width],
  )

  useMemo(() => {
    configureTexture(textures.map, repeat, true)
    configureTexture(textures.normalMap, repeat)
    configureTexture(textures.roughnessMap, repeat)
    configureTexture(textures.displacementMap, repeat)
    if (textures.aoMap) {
      configureTexture(textures.aoMap, repeat)
    }
  }, [repeat, textures])

  const rugMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        ...textures,
        color: '#fbf8f2',
        roughness: 0.94,
        metalness: 0,
        normalScale: new THREE.Vector2(0.22, 0.22),
        displacementScale: 0.0026,
        displacementBias: -0.0012,
        aoMapIntensity: 0.7,
      }),
    [textures],
  )
  const shadowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    [],
  )

  const rugGeometry = useMemo(() => {
    if (variant.shape === 'round' || variant.shape === 'oval') {
      const geometry = new THREE.CircleGeometry(0.5, 96)
      const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
      geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array, 2))
      return geometry
    }

    return makePlaneGeometry(1, 1, 72)
  }, [variant.shape])

  const rugScale: [number, number, number] =
    variant.shape === 'round' || variant.shape === 'oval'
      ? [width, depth, 1]
      : [width, 1, depth]

  return (
    <group>
      {variant.shape === 'round' || variant.shape === 'oval' ? (
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={rugScale} geometry={rugGeometry} material={rugMaterial} receiveShadow />
      ) : (
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={rugScale} geometry={rugGeometry} material={rugMaterial} receiveShadow />
      )}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 1.02, depth * 1.02, 1]} material={shadowMaterial}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  )
}

function isPbrMaterial(material: THREE.Material): material is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial
}

function tunePbrMaterial(material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial, object: EditorObject) {
  const tuning = getRenderMaterialTuning({
    objectId: object.id,
    modelUrl: object.url,
    materialName: material.name,
  })
  const hasNormalScale = 'normalScale' in material && material.normalScale instanceof THREE.Vector2

  if (tuning.envMapIntensity !== undefined) {
    material.envMapIntensity = tuning.envMapIntensity
  }

  if (tuning.baseColor) {
    material.color = new THREE.Color(tuning.baseColor)
  }

  if (tuning.clearColorMap) {
    material.map = null
    material.aoMap = null
  }

  if (tuning.clearNormalMap) {
    material.normalMap = null
  }

  if (tuning.clearRoughnessMap) {
    material.roughnessMap = null
  }

  if (tuning.roughnessMin !== undefined) {
    material.roughness = Math.max(material.roughness, tuning.roughnessMin)
  }

  if (tuning.roughnessMax !== undefined) {
    material.roughness = Math.min(material.roughness, tuning.roughnessMax)
  }

  if (tuning.metalnessMin !== undefined) {
    material.metalness = Math.max(material.metalness, tuning.metalnessMin)
  }

  if (tuning.metalnessMax !== undefined) {
    material.metalness = Math.min(material.metalness, tuning.metalnessMax)
  }

  if (hasNormalScale && tuning.normalScaleMultiplier !== undefined) {
    material.normalScale.multiplyScalar(tuning.normalScaleMultiplier)
  }

  if (tuning.emissiveColor) {
    material.emissive = new THREE.Color(tuning.emissiveColor)
    material.emissiveIntensity = tuning.emissiveIntensity ?? material.emissiveIntensity
  }

  material.needsUpdate = true
  return material
}

function tuneLoadedMaterial(material: THREE.Material, object: EditorObject) {
  const cloned = material.clone()

  if (isPbrMaterial(cloned)) {
    return tunePbrMaterial(cloned, object)
  }

  return cloned
}

function ModelContactShadow({
  object,
  scale,
}: {
  object: EditorObject
  scale: number
}) {
  const material = useMemo(() => {
    const cloned = MODEL_SHADOW_MATERIAL.clone()
    const area = object.dimensionsM.x * object.dimensionsM.z
    cloned.opacity = Math.min(0.24, Math.max(0.1, 0.11 + area * 0.035))
    return cloned
  }, [object.dimensionsM.x, object.dimensionsM.z])
  const radiusX = Math.max(object.dimensionsM.x * 0.48, 0.14) / scale
  const radiusZ = Math.max(object.dimensionsM.z * 0.48, 0.14) / scale

  if (object.placement !== 'floor') {
    return null
  }

  return (
    <mesh
      position={[0, 0.014 / scale, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[radiusX, radiusZ, 1]}
      material={material}
      renderOrder={1}
      onUpdate={disableRaycast}
    >
      <circleGeometry args={[1, 72]} />
    </mesh>
  )
}

function LampGlow({
  object,
  scale,
}: {
  object: EditorObject
  scale: number
}) {
  const isLamp = object.id === 'desk-lamp' || object.id === 'reading-lamp'
  const material = useMemo(
    () => {
      const map = createRadialGlowTexture()
      return new THREE.SpriteMaterial({
        map: map ?? undefined,
        color: LAMP_EMISSIVE_COLOR,
        transparent: true,
        opacity: object.id === 'reading-lamp' ? 0.48 : 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    },
    [object.id],
  )

  if (!isLamp) {
    return null
  }

  const height = object.dimensionsM.y * (object.id === 'desk-lamp' ? 0.72 : 0.84)
  const size = (object.id === 'desk-lamp' ? 0.22 : 0.3) / scale

  return (
    <sprite
      position={[0, height / scale, object.id === 'desk-lamp' ? 0.02 / scale : 0.04 / scale]}
      scale={[size, size, 1]}
      material={material}
      renderOrder={4}
      onUpdate={disableRaycast}
    />
  )
}

function isUsdAsset(url: string) {
  const normalized = url.toLowerCase()
  return normalized.endsWith('.usdz') || normalized.endsWith('.usd') || normalized.endsWith('.usda') || normalized.endsWith('.usdc')
}

function loadModelResource(url: string, renderer: THREE.WebGLRenderer) {
  const cached = modelResourceCache.get(url)

  if (cached) {
    return Promise.resolve(cached)
  }

  const pending = modelResourcePromiseCache.get(url)

  if (pending) {
    return pending
  }

  const request = (async () => {
    let scene: THREE.Object3D

    if (isUsdAsset(url)) {
      const loader = new USDLoader()
      scene = await loader.loadAsync(url)
    } else {
      const loader = new GLTFLoader()
      extendGltfLoaderWithCompression(renderer)(loader)

      const gltf = await loader.loadAsync(url)
      scene = gltf.scene
    }

    modelResourceCache.set(url, scene)
    modelResourceErrorCache.delete(url)
    modelResourcePromiseCache.delete(url)
    return scene
  })().catch((error) => {
    modelResourceErrorCache.set(url, error)
    modelResourcePromiseCache.delete(url)
    throw error
  })

  modelResourcePromiseCache.set(url, request)
  return request
}

function ModelFallbackProxy({
  object,
  onSelect,
  interactive = true,
}: {
  object: EditorObject
  onSelect: (id: string) => void
  interactive?: boolean
}) {
  const room = useRoomStore((s) => s.room)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const groupRef = useRef<THREE.Group>(null)
  const hitboxRef = useRef<THREE.Mesh>(null)
  const shellMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: object.placement === 'wall' ? '#d9ddd9' : '#d8d3cb',
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.42,
      }),
    [object.placement],
  )
  const edgeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c8c2b9',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    [],
  )
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) {
      return
    }

    event.stopPropagation()
    onSelect(object.id)
  }

  useLayoutEffect(() => {
    hitboxRef.current?.layers.set(RAYCAST_HITBOX_LAYER)
  }, [])

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    if (object.placement !== 'wall') {
      groupRef.current.visible = true
      return
    }

    const side = wallSideFromPosition(object.position, room)
    groupRef.current.visible = visibleWallSidesForMode(camera.position, cameraMode)[side]
  })

  return (
    <group
      ref={groupRef}
      position={[object.position.x, object.elevationM, object.position.z]}
      rotation={[0, object.rotationY, 0]}
      onPointerDown={handlePointerDown}
    >
      {object.placement === 'floor' ? <ModelContactShadow object={object} scale={1} /> : null}
      <mesh position={[0, object.dimensionsM.y / 2, 0]} material={shellMaterial}>
        <boxGeometry args={[object.dimensionsM.x, object.dimensionsM.y, object.dimensionsM.z]} />
      </mesh>
      <lineSegments position={[0, object.dimensionsM.y / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(object.dimensionsM.x, object.dimensionsM.y, object.dimensionsM.z)]} />
        <primitive object={edgeMaterial} attach="material" />
      </lineSegments>
      <mesh ref={hitboxRef} position={[0, object.dimensionsM.y / 2, 0]}>
        <boxGeometry args={[object.dimensionsM.x, object.dimensionsM.y, object.dimensionsM.z]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function LoadedFurnitureModel({
  object,
  sourceScene,
  onSelect,
  interactive = true,
}: {
  object: EditorObject
  sourceScene: THREE.Object3D
  onSelect: (id: string) => void
  interactive?: boolean
}) {
  const room = useRoomStore((s) => s.room)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const updateObject = useEditorObjectsStore((s) => s.updateObject)
  const groupRef = useRef<THREE.Group>(null)
  const hitboxRef = useRef<THREE.Mesh>(null)
  const { model, scale, renderedDimensionsM } = useMemo(() => {
    const cloned = sourceScene.clone(true)
    stripEmbeddedLights(cloned)
    const bounds = new THREE.Box3().setFromObject(cloned)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    cloned.position.set(-center.x, -bounds.min.y, -center.z)
    const scale = object.targetSize / Math.max(size.x, size.y, size.z, 0.001)

    return {
      model: cloned,
      scale,
      renderedDimensionsM: renderedDimensionsFromRawSize(size, object.targetSize),
    }
  }, [object.targetSize, sourceScene])
  const hitboxArgs = useMemo(
    () => {
      if (object.placement === 'wall' && object.wallSurfacePlane === 'yz') {
        return [
          object.dimensionsM.z / scale,
          object.dimensionsM.y / scale,
          object.dimensionsM.x / scale,
        ] as const
      }

      return [
        object.dimensionsM.x / scale,
        object.dimensionsM.y / scale,
        object.dimensionsM.z / scale,
      ] as const
    },
    [object.dimensionsM.x, object.dimensionsM.y, object.dimensionsM.z, object.placement, object.wallSurfacePlane, scale],
  )
  useLayoutEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.raycast = () => {}

        child.material = Array.isArray(child.material)
          ? child.material.map((material) => tuneLoadedMaterial(material, object))
          : tuneLoadedMaterial(child.material, object)
      }
    })
    hitboxRef.current?.layers.set(RAYCAST_HITBOX_LAYER)
  }, [model, object])

  useEffect(() => {
    if (!dimensionsMismatch(object.dimensionsM, renderedDimensionsM)) {
      return
    }

    updateObject(object.id, { dimensionsM: renderedDimensionsM })
  }, [object.dimensionsM, object.id, renderedDimensionsM, updateObject])

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    if (object.placement !== 'wall') {
      groupRef.current.visible = true
      return
    }

    const side = wallSideFromPosition(object.position, room)
    groupRef.current.visible = visibleWallSidesForMode(camera.position, cameraMode)[side]
  })

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) {
      return
    }

    event.stopPropagation()
    onSelect(object.id)
  }

  return (
    <group
      ref={groupRef}
      userData={{ renderStatsId: object.id }}
      position={[object.position.x, object.elevationM, object.position.z]}
      rotation={[0, object.rotationY, 0]}
      scale={scale}
      onPointerDown={handlePointerDown}
    >
      <ModelContactShadow object={object} scale={scale} />
      <primitive object={model} />
      <LampGlow object={object} scale={scale} />
      <mesh ref={hitboxRef} position={[0, object.dimensionsM.y / scale / 2, 0]}>
        <boxGeometry args={hitboxArgs} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function FurnitureModel(props: {
  object: EditorObject
  selected?: boolean
  onSelect: (id: string) => void
  interactive?: boolean
}) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const requestedObject = useMemo(() => {
    const url = modelUrlForRenderContext(props.object, { selected: props.selected })

    if (url === props.object.url) {
      return props.object
    }

    return {
      ...props.object,
      url,
    }
  }, [props.object, props.selected])
  const [displayUrl, setDisplayUrl] = useState<string | null>(() => (
    modelResourceCache.has(requestedObject.url) ? requestedObject.url : null
  ))
  const [sourceScene, setSourceScene] = useState<THREE.Object3D | null>(() => (
    modelResourceCache.get(requestedObject.url) ?? null
  ))
  const [displayObject, setDisplayObject] = useState(requestedObject)
  const [loadError, setLoadError] = useState<unknown | null>(() => modelResourceErrorCache.get(requestedObject.url) ?? null)

  useEffect(() => {
    const cached = modelResourceCache.get(requestedObject.url)

    if (cached) {
      setSourceScene(cached)
      setDisplayUrl(requestedObject.url)
      setDisplayObject(requestedObject)
      setLoadError(null)
      invalidate()
      return
    }

    if (displayUrl === requestedObject.url && sourceScene) {
      setDisplayObject(requestedObject)
      return
    }

    let cancelled = false

    loadModelResource(requestedObject.url, gl)
      .then((scene) => {
        if (cancelled) {
          return
        }

        setSourceScene(scene)
        setDisplayUrl(requestedObject.url)
        setDisplayObject(requestedObject)
        setLoadError(null)
        invalidate()
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setLoadError(error)
        console.error('[AssetRoom] Failed to load model resource', requestedObject.url, error)
      })

    return () => {
      cancelled = true
    }
  }, [displayUrl, gl, invalidate, requestedObject, sourceScene])

  if (!sourceScene) {
    if (loadError) {
      return <ModelFallbackProxy object={props.object} onSelect={props.onSelect} interactive={props.interactive} />
    }

    return <ModelFallbackProxy object={props.object} onSelect={props.onSelect} interactive={props.interactive} />
  }

  return (
    <LoadedFurnitureModel object={displayObject} sourceScene={sourceScene} onSelect={props.onSelect} interactive={props.interactive} />
  )
}

function RoomModelPreloader({ objects }: { objects: EditorObject[] }) {
  const gl = useThree((state) => state.gl)

  const modelUrls = useMemo(
    () =>
      Array.from(
        new Set(
          objects
            .filter((object) => !object.renderKind || object.renderKind === 'model')
            .map((object) => modelUrlForRenderContext(object, { selected: false })),
        ),
      ),
    [objects],
  )

  useEffect(() => {
    modelUrls.forEach((url) => {
      if (modelResourceCache.has(url) || modelResourcePromiseCache.has(url)) {
        return
      }

      loadModelResource(url, gl).catch((error) => {
        console.error('[AssetRoom] Failed to preload model resource', url, error)
      })
    })
  }, [gl, modelUrls])

  return null
}

function FloorLamp({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <FloorShadow material={materials.shadow} position={[0, 0.014, 0]} scale={[0.34, 0.34, 0.34]} opacity={0.1} />
      <mesh position={[0, 0.03, 0]} material={materials.brass}>
        <cylinderGeometry args={[0.22, 0.22, 0.045, 64]} />
      </mesh>
      <mesh position={[0, 0.72, 0]} material={materials.brass}>
        <cylinderGeometry args={[0.017, 0.017, 1.4, 32]} />
      </mesh>
      <mesh position={[0, 1.43, 0]} material={materials.brass}>
        <cylinderGeometry args={[0.25, 0.33, 0.16, 64]} />
      </mesh>
      <pointLight position={[0, 1.34, 0]} intensity={0.75} distance={2.1} color="#ffdca3" />
    </group>
  )
}

function BookStack({ object }: { object: EditorObject }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const bookCount = 6
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.76, metalness: 0, vertexColors: true }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return
    }

    const matrix = new THREE.Matrix4()
    const color = new THREE.Color()
    const colors = ['#785f55', '#d4c2a4', '#3f5661', '#b6a391', '#596755', '#eadfcf']
    const totalWidth = object.dimensionsM.x
    const height = Math.max(object.dimensionsM.y, 0.024)
    const depth = Math.max(object.dimensionsM.z, 0.028)

    for (let index = 0; index < bookCount; index += 1) {
      const width = totalWidth / bookCount
      const x = -totalWidth / 2 + width * (index + 0.5)
      const yJitter = index % 2 === 0 ? 0 : height * 0.08
      const zJitter = index % 3 === 0 ? depth * 0.05 : 0
      matrix.compose(
        new THREE.Vector3(x, height / 2 + yJitter, zJitter),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (index - 2.5) * 0.018)),
        new THREE.Vector3(width * 0.9, height * (index % 2 === 0 ? 1 : 0.86), depth),
      )
      mesh.setMatrixAt(index, matrix)
      mesh.setColorAt(index, color.set(colors[index % colors.length]))
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [object.dimensionsM.x, object.dimensionsM.y, object.dimensionsM.z])

  return (
    <instancedMesh ref={meshRef} args={[undefined, material, bookCount]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

function DesktopComputer({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} material={materials.deviceMetal} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.34, 0.022]} />
      </mesh>
      <mesh position={[0, 0.25, 0.014]} material={materials.deviceScreen}>
        <planeGeometry args={[0.47, 0.275]} />
      </mesh>
      <mesh position={[0, 0.065, -0.002]} material={materials.deviceMetal} castShadow>
        <boxGeometry args={[0.045, 0.13, 0.026]} />
      </mesh>
      <mesh position={[0, 0.006, 0.028]} material={materials.deviceMetal} castShadow receiveShadow>
        <boxGeometry args={[0.19, 0.012, 0.13]} />
      </mesh>
    </group>
  )
}

function Laptop({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.016, 0]} material={materials.deviceMetal} castShadow receiveShadow>
        <boxGeometry args={[0.31, 0.018, 0.21]} />
      </mesh>
      <mesh position={[0, 0.032, -0.018]} material={materials.deviceDark}>
        <boxGeometry args={[0.19, 0.004, 0.105]} />
      </mesh>
      <mesh position={[0, 0.13, -0.102]} rotation={[Math.PI / 5, 0, 0]} material={materials.deviceMetal} castShadow>
        <boxGeometry args={[0.31, 0.19, 0.012]} />
      </mesh>
      <mesh position={[0, 0.13, -0.096]} rotation={[Math.PI / 5, 0, 0]} material={materials.deviceScreen}>
        <planeGeometry args={[0.275, 0.155]} />
      </mesh>
    </group>
  )
}

function SmartSpeaker({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.046, 0]} material={materials.fabricLight} castShadow receiveShadow>
        <cylinderGeometry args={[0.048, 0.052, 0.086, 24]} />
      </mesh>
      <mesh position={[0, 0.091, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.deviceDark}>
        <circleGeometry args={[0.042, 24]} />
      </mesh>
    </group>
  )
}

function Plant({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  const leaves = Array.from({ length: 22 }, (_, index) => ({
    angle: (index / 22) * Math.PI * 2,
    tilt: 0.42 + (index % 5) * 0.1,
    height: 0.36 + (index % 6) * 0.04,
  }))

  return (
    <group>
      <FloorShadow material={materials.shadow} position={[0, 0.014, 0.02]} scale={[0.32, 0.28, 0.32]} opacity={0.12} />
      <mesh position={[0, 0.14, 0]} material={materials.pot}>
        <cylinderGeometry args={[0.13, 0.18, 0.26, 32]} />
      </mesh>
      {leaves.map((leaf, index) => (
        <mesh
          key={index}
          position={[Math.cos(leaf.angle) * 0.075, 0.36 + leaf.height * 0.16, Math.sin(leaf.angle) * 0.075]}
          rotation={[leaf.tilt, leaf.angle, 0.24]}
          castShadow
          material={index % 2 === 0 ? materials.plant : materials.plantDark}
        >
          <coneGeometry args={[0.045, leaf.height, 5]} />
        </mesh>
      ))}
    </group>
  )
}

function WallArt({ variant }: { variant: 'left' | 'right' }) {
  const frameMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f2ece4', roughness: 0.62 }),
    [],
  )
  const matMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#fdfbf7', roughness: 0.78 }),
    [],
  )
  const accentPrimary = variant === 'left' ? '#ddd5ca' : '#d8ddd7'
  const accentSecondary = variant === 'left' ? '#b7aa99' : '#c7beb2'
  const accentDark = '#59544d'

  return (
    <group>
      <mesh position={[0, 0.29, 0]} material={frameMaterial}>
        <boxGeometry args={[0.34, 0.48, 0.035]} />
      </mesh>
      <mesh position={[0, 0.29, 0.02]} material={matMaterial}>
        <planeGeometry args={[0.27, 0.41]} />
      </mesh>
      {variant === 'left' ? (
        <>
          <mesh position={[-0.038, 0.32, 0.023]}>
            <planeGeometry args={[0.14, 0.22]} />
            <meshStandardMaterial color={accentPrimary} roughness={0.84} />
          </mesh>
          <mesh position={[0.042, 0.235, 0.024]} rotation={[0, 0, Math.PI / 7]}>
            <planeGeometry args={[0.12, 0.12]} />
            <meshStandardMaterial color={accentSecondary} roughness={0.7} />
          </mesh>
          <mesh position={[0.018, 0.39, 0.025]} rotation={[0, 0, -Math.PI / 10]}>
            <planeGeometry args={[0.02, 0.16]} />
            <meshStandardMaterial color={accentDark} roughness={0.5} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.33, 0.023]}>
            <circleGeometry args={[0.07, 32]} />
            <meshStandardMaterial color={accentPrimary} roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.24, 0.024]}>
            <planeGeometry args={[0.16, 0.14]} />
            <meshStandardMaterial color={accentSecondary} roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.18, 0.025]}>
            <planeGeometry args={[0.1, 0.016]} />
            <meshStandardMaterial color={accentDark} roughness={0.56} />
          </mesh>
        </>
      )}
    </group>
  )
}

function ProceduralObject({
  object,
  onSelect,
  materials,
  interactive = true,
}: {
  object: EditorObject
  onSelect: (id: string) => void
  materials: ReturnType<typeof usePbrRoomMaterials>
  interactive?: boolean
}) {
  const room = useRoomStore((s) => s.room)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const groupRef = useRef<THREE.Group>(null)
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) {
      return
    }

    event.stopPropagation()
    onSelect(object.id)
  }
  const hitboxSize = {
    x: object.placement === 'wall' ? Math.max(object.dimensionsM.x, 0.46) : object.dimensionsM.x,
    y: object.placement === 'wall' ? Math.max(object.dimensionsM.y, 0.56) : object.dimensionsM.y,
    z: object.placement === 'wall' ? Math.max(object.dimensionsM.z, 0.12) : object.dimensionsM.z,
  }
  const hitboxRef = useRef<THREE.Mesh>(null)

  useLayoutEffect(() => {
    hitboxRef.current?.layers.set(RAYCAST_HITBOX_LAYER)
  }, [])

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    if (object.placement !== 'wall') {
      groupRef.current.visible = true
      return
    }

    const side = wallSideFromPosition(object.position, room)
    groupRef.current.visible = visibleWallSidesForMode(camera.position, cameraMode)[side]
  })

  return (
    <group
      ref={groupRef}
      userData={{ renderStatsId: object.id }}
      position={[object.position.x, object.elevationM, object.position.z]}
      rotation={[0, object.rotationY, 0]}
      onPointerDown={handlePointerDown}
    >
      {object.renderKind === 'window-curtains' ? <WindowAndCurtains materials={materials} object={object} /> : null}
      {object.renderKind === 'window-opening' ? <WindowOpening object={object} /> : null}
      {object.renderKind === 'area-rug' ? <AreaRug object={object} /> : null}
      {object.renderKind === 'book-stack' ? <BookStack object={object} /> : null}
      {object.renderKind === 'desktop-computer' ? <DesktopComputer materials={materials} /> : null}
      {object.renderKind === 'floor-lamp' ? <FloorLamp materials={materials} /> : null}
      {object.renderKind === 'laptop' ? <Laptop materials={materials} /> : null}
      {object.renderKind === 'plant' ? <Plant materials={materials} /> : null}
      {object.renderKind === 'smart-speaker' ? <SmartSpeaker materials={materials} /> : null}
      {object.renderKind === 'wall-art' ? (
        <WallArt variant={object.id === 'wall-art-left' ? 'left' : 'right'} />
      ) : null}
      <mesh
        ref={hitboxRef}
        position={[0, object.dimensionsM.y / 2, 0]}
        onUpdate={setRaycastHitboxLayer}
      >
        <boxGeometry args={[hitboxSize.x, hitboxSize.y, hitboxSize.z]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function AssetRoom({
  interactionEnabled = true,
  onClearSelection,
}: {
  interactionEnabled?: boolean
  onClearSelection?: () => void
}) {
  const materials = usePbrRoomMaterials()
  const objects = useEditorObjectsStore((state) => state.objects)
  const setEditMode = useEditorObjectsStore((state) => state.setEditMode)
  const setActiveDragMode = useEditorObjectsStore((state) => state.setActiveDragMode)
  const selectedId = useSelectionStore((state) => state.selectedId)
  const select = useSelectionStore((state) => state.select)

  const handleBackgroundPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactionEnabled) {
      return
    }

    if (event.button !== 0) {
      return
    }

    onClearSelection?.()
  }

  const handleObjectSelect = (id: string) => {
    setEditMode('idle')
    setActiveDragMode(null)

    select(id)
  }

  return (
    <group onPointerDown={handleBackgroundPointerDown}>
      <RoomModelPreloader objects={objects} />
      <RoomShell materials={materials} />
      {objects.map((object) => (
        object.renderKind && object.renderKind !== 'model' ? (
          <ProceduralObject
            key={object.id}
            object={object}
            materials={materials}
            interactive={interactionEnabled}
            onSelect={handleObjectSelect}
          />
        ) : (
          <FurnitureModel
            key={object.id}
            object={object}
            selected={object.id === selectedId}
            interactive={interactionEnabled}
            onSelect={handleObjectSelect}
          />
        )
      ))}
    </group>
  )
}

useGLTF.preload('/assets/models/sheen-wood-leather-sofa.optimized.glb', false, true)
useGLTF.preload('/assets/models/polyhaven/modern_arm_chair_01.optimized.glb', false, true)
useGLTF.preload('/assets/models/polyhaven/CoffeeTable_01.optimized.glb', false, true)
useGLTF.preload('/assets/models/polyhaven/side_table_01.optimized.glb', false, true)
useGLTF.preload('/assets/models/polyhaven/hanging_picture_frame_01.optimized.glb', false, true)
useGLTF.preload('/assets/models/polyhaven/hanging_picture_frame_02.optimized.glb', false, true)
useGLTF.preload('/assets/models/polyhaven/potted_plant_04.optimized.glb', false, true)
