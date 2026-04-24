import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

import { getRenderMaterialTuning } from '@/constants/renderMaterialOverrides'
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
    floorLight: 0.36,
    backWallAo: 0.18,
    backWallLight: 0.32,
    leftWallAo: 0.2,
    rightWallAo: 0.16,
    frontWallAo: 0.16,
  },
  bird: {
    floorAo: 0.18,
    floorLight: 0.34,
    backWallAo: 0.11,
    backWallLight: 0.28,
    leftWallAo: 0.11,
    rightWallAo: 0.11,
    frontWallAo: 0.11,
  },
  pov: {
    floorAo: 0.3,
    floorLight: 0.2,
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

type WallSide = 'back' | 'front' | 'left' | 'right'
type GltfExtendLoader = NonNullable<Parameters<typeof useGLTF>[3]>

function extendGltfLoaderWithKtx2(renderer: THREE.WebGLRenderer): GltfExtendLoader {
  return (loader) => {
    if (!ktx2Loader) {
      ktx2Loader = new KTX2Loader().setTranscoderPath(KTX2_TRANSCODER_PATH)
      ktx2Loader.detectSupport(renderer)
    }

    loader.setKTX2Loader(ktx2Loader as unknown as Parameters<typeof loader.setKTX2Loader>[0])
  }
}

function setRaycastHitboxLayer(object: THREE.Object3D) {
  object.layers.set(RAYCAST_HITBOX_LAYER)
}

function disableRaycast(object: THREE.Object3D) {
  object.raycast = () => {}
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
  const floorMaterial = useRoomSettingsStore((s) => s.floorMaterial)
  const wallMaterial = useRoomSettingsStore((s) => s.wallMaterial)

  const floorTexturePaths = useMemo(
    () => ({
      map: floorMaterial.maps.color,
      normalMap: floorMaterial.maps.normal,
      roughnessMap: floorMaterial.maps.roughness,
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

  const floorTextures = useTexture(floorTexturePaths) as {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    aoMap?: THREE.Texture
  }

  const wallTextures = useTexture(wallTexturePaths) as {
    map: THREE.Texture
    normalMap: THREE.Texture
    roughnessMap: THREE.Texture
    displacementMap: THREE.Texture
    aoMap?: THREE.Texture
  }

  useMemo(() => {
    configureTexture(floorTextures.map, floorMaterial.repeat ?? TEXTURE_REPEAT.floor, true)
    configureTexture(floorTextures.normalMap, floorMaterial.repeat ?? TEXTURE_REPEAT.floor)
    configureTexture(floorTextures.roughnessMap, floorMaterial.repeat ?? TEXTURE_REPEAT.floor)
    if (floorTextures.aoMap) {
      configureTexture(floorTextures.aoMap, floorMaterial.repeat ?? TEXTURE_REPEAT.floor)
    }

    configureTexture(wallTextures.map, wallMaterial.repeat ?? TEXTURE_REPEAT.wall, true)
    configureTexture(wallTextures.normalMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    configureTexture(wallTextures.roughnessMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    configureTexture(wallTextures.displacementMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    if (wallTextures.aoMap) {
      configureTexture(wallTextures.aoMap, wallMaterial.repeat ?? TEXTURE_REPEAT.wall)
    }
  }, [floorMaterial, floorTextures, wallMaterial, wallTextures])

  return useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({
        ...floorTextures,
        roughness: 0.7,
        metalness: 0,
        normalScale: new THREE.Vector2(0.12, 0.12),
        aoMapIntensity: 0.72,
      }),
      wall: new THREE.MeshStandardMaterial({
        ...wallTextures,
        color: '#f8f8fb',
        roughness: 0.88,
        metalness: 0,
        normalScale: new THREE.Vector2(0.14, 0.14),
        aoMapIntensity: 0.46,
        displacementScale: 0.004,
        displacementBias: -0.0015,
      }),
      trim: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.62 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#edf5fb',
        emissive: '#bfe7ff',
        emissiveIntensity: 0.06,
        roughness: 0.08,
        transmission: 0.1,
        transparent: true,
        opacity: 0.62,
      }),
      curtain: new THREE.MeshStandardMaterial({
        color: '#e4e5ec',
        roughness: 0.88,
        transparent: true,
        opacity: 0.48,
      }),
      mattress: new THREE.MeshStandardMaterial({
        color: '#7d8299',
        roughness: 0.86,
        metalness: 0,
      }),
      fabricLight: new THREE.MeshStandardMaterial({
        color: '#f2eee6',
        roughness: 0.92,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: '#b88437',
        roughness: 0.34,
        metalness: 0.72,
      }),
      plant: new THREE.MeshStandardMaterial({ color: '#476e3f', roughness: 0.7 }),
      plantDark: new THREE.MeshStandardMaterial({ color: '#243f2a', roughness: 0.78 }),
      pot: new THREE.MeshStandardMaterial({ color: '#272322', roughness: 0.72 }),
      screen: new THREE.MeshStandardMaterial({
        color: '#14161a',
        emissive: '#1f3448',
        emissiveIntensity: 0.18,
        roughness: 0.42,
        metalness: 0.05,
      }),
      deviceShell: new THREE.MeshStandardMaterial({
        color: '#e7e5df',
        roughness: 0.38,
        metalness: 0.18,
      }),
      deviceDark: new THREE.MeshStandardMaterial({
        color: '#25272b',
        roughness: 0.5,
        metalness: 0.08,
      }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
      }),
    }),
    [floorTextures, wallTextures],
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

  const floorGeometry = useMemo(() => makePlaneGeometry(width, depth, 1), [width, depth])
  const widthWallGeometry = useMemo(() => makePlaneGeometry(width, height, 32), [width, height])
  const depthWallGeometry = useMemo(() => makePlaneGeometry(depth, height, 32), [depth, height])

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
          color="#ffe2ad"
          transparent
          opacity={bakedOpacity('floorLight')}
          alphaMap={bakedLighting.floorLight}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
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
        <mesh position={[0, 0.045, -depth / 2 + 0.035]} material={materials.trim}>
          <boxGeometry args={[width + 0.08, 0.09, 0.07]} />
        </mesh>
        <mesh position={[0, height - 0.035, -depth / 2 + 0.028]} material={materials.trim}>
          <boxGeometry args={[width + 0.08, 0.07, 0.056]} />
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
        <mesh position={[0, 0.045, depth / 2 - 0.035]} material={materials.trim}>
          <boxGeometry args={[width + 0.08, 0.09, 0.07]} />
        </mesh>
        <mesh position={[0, height - 0.035, depth / 2 - 0.028]} material={materials.trim}>
          <boxGeometry args={[width + 0.08, 0.07, 0.056]} />
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
        <mesh position={[-width / 2 + 0.035, 0.045, 0]} material={materials.trim}>
          <boxGeometry args={[0.07, 0.09, depth + 0.08]} />
        </mesh>
        <mesh position={[-width / 2 + 0.028, height - 0.035, 0]} material={materials.trim}>
          <boxGeometry args={[0.056, 0.07, depth + 0.08]} />
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
        <mesh position={[width / 2 - 0.035, 0.045, 0]} material={materials.trim}>
          <boxGeometry args={[0.07, 0.09, depth + 0.08]} />
        </mesh>
        <mesh position={[width / 2 - 0.028, height - 0.035, 0]} material={materials.trim}>
          <boxGeometry args={[0.056, 0.07, depth + 0.08]} />
        </mesh>
      </group>

      {[
        [-width / 2 + 0.03, height / 2, -depth / 2 + 0.03],
        [width / 2 - 0.03, height / 2, -depth / 2 + 0.03],
        [-width / 2 + 0.03, height / 2, depth / 2 - 0.03],
        [width / 2 - 0.03, height / 2, depth / 2 - 0.03],
      ].map((position) => (
        <mesh key={position.join(',')} position={position as [number, number, number]} material={materials.trim}>
          <boxGeometry args={[0.06, height, 0.06]} />
        </mesh>
      ))}

      <mesh
        ref={backOpenEdgeRef}
        position={[0, 0.045, -depth / 2 + 0.035]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[width + 0.08, 0.09, 0.07]} />
      </mesh>
      <mesh
        ref={frontOpenEdgeRef}
        position={[0, 0.045, depth / 2 - 0.035]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[width + 0.08, 0.09, 0.07]} />
      </mesh>
      <mesh
        ref={leftOpenEdgeRef}
        position={[-width / 2 + 0.035, 0.045, 0]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[0.07, 0.09, depth + 0.08]} />
      </mesh>
      <mesh
        ref={rightOpenEdgeRef}
        position={[width / 2 - 0.035, 0.045, 0]}
        material={materials.trim}
        renderOrder={3}
      >
        <boxGeometry args={[0.07, 0.09, depth + 0.08]} />
      </mesh>
    </group>
  )
}

function WindowAndCurtains({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0.012]} material={materials.glass}>
        <planeGeometry args={[1.18, 0.58]} />
      </mesh>
      <mesh position={[0, 0.93, 0.035]} material={materials.trim}>
        <boxGeometry args={[1.28, 0.045, 0.05]} />
      </mesh>
      <mesh position={[0, 0.31, 0.035]} material={materials.trim}>
        <boxGeometry args={[1.28, 0.045, 0.05]} />
      </mesh>
      <mesh position={[0, 0.62, 0.035]} material={materials.trim}>
        <boxGeometry args={[0.04, 0.62, 0.05]} />
      </mesh>
      {[-0.76, 0.76].map((x) => (
        <group key={x} position={[x, 0.57, 0.05]}>
          {[-0.12, 0, 0.12].map((offset) => (
            <mesh key={offset} position={[offset, 0, 0]} material={materials.curtain}>
              <boxGeometry args={[0.048, 1.15, 0.026]} />
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
        color: isNight ? '#3c5265' : '#e9f6fb',
        emissive: isNight ? '#101a24' : '#cbeeff',
        emissiveIntensity: isNight ? 0.015 : 0.12,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: isNight ? 0.38 : 0.48,
      }),
    [isNight],
  )
  const skyMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: isNight ? '#18283a' : '#d3edf8',
        transparent: true,
        opacity: isNight ? 0.68 : 0.92,
        toneMapped: false,
      }),
    [isNight],
  )
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: isNight ? '#5f8db6' : '#dff5ff',
        transparent: true,
        opacity: isNight ? 0.018 : cameraMode === 'pov' ? 0.07 : cameraMode === 'bird' ? 0.12 : 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [cameraMode, isNight],
  )
  const frameMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: isNight ? '#d5d0c8' : '#f4f1e8', roughness: 0.54 }),
    [isNight],
  )
  const railMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#aeb8c2', roughness: 0.58 }),
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
  const rugMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#a99d8e',
        roughness: 0.96,
        metalness: 0,
      }),
    [],
  )
  const borderMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d8d0c5',
        roughness: 0.92,
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

function FurnitureModel({
  object,
  onSelect,
  interactive = true,
}: {
  object: EditorObject
  onSelect: (id: string) => void
  interactive?: boolean
}) {
  const gl = useThree((state) => state.gl)
  const extendLoader = useMemo(
    () => (object.url.includes('/models-ktx2/') ? extendGltfLoaderWithKtx2(gl) : undefined),
    [gl, object.url],
  )
  const { scene } = useGLTF(object.url, false, true, extendLoader)
  const room = useRoomStore((s) => s.room)
  const cameraMode = useCameraViewStore((s) => s.mode)
  const updateObject = useEditorObjectsStore((s) => s.updateObject)
  const groupRef = useRef<THREE.Group>(null)
  const hitboxRef = useRef<THREE.Mesh>(null)
  const { model, scale, renderedDimensionsM } = useMemo(() => {
    const cloned = scene.clone(true)
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
  }, [object.targetSize, scene])
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
  }, [
    object.dimensionsM,
    object.id,
    renderedDimensionsM,
    updateObject,
  ])

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
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b2926d', roughness: 0.48 }), [])
  const fillColor = variant === 'left' ? '#d9d0ba' : '#4b83c6'

  return (
    <group>
      <mesh position={[0, 0.21, 0]} material={frame}>
        <boxGeometry args={[0.28, 0.42, 0.035]} />
      </mesh>
      <mesh position={[0, 0.21, 0.021]}>
        <planeGeometry args={[0.22, 0.36]} />
        <meshStandardMaterial color={fillColor} roughness={0.72} />
      </mesh>
    </group>
  )
}

function DeskMonitor({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <FloorShadow material={materials.shadow} position={[0, 0.012, 0.01]} scale={[0.24, 0.12, 0.24]} opacity={0.08} />
      <mesh position={[0, 0.05, 0.01]} material={materials.deviceShell}>
        <boxGeometry args={[0.2, 0.025, 0.12]} />
      </mesh>
      <mesh position={[0, 0.16, 0.005]} material={materials.deviceShell}>
        <boxGeometry args={[0.035, 0.22, 0.025]} />
      </mesh>
      <mesh position={[0, 0.31, 0]} material={materials.deviceShell}>
        <boxGeometry args={[0.46, 0.3, 0.026]} />
      </mesh>
      <mesh position={[0, 0.31, 0.015]} material={materials.screen}>
        <boxGeometry args={[0.405, 0.235, 0.008]} />
      </mesh>
    </group>
  )
}

function Laptop({ materials }: { materials: ReturnType<typeof usePbrRoomMaterials> }) {
  return (
    <group>
      <FloorShadow material={materials.shadow} position={[0, 0.008, 0.02]} scale={[0.2, 0.14, 0.2]} opacity={0.07} />
      <mesh position={[0, 0.015, 0]} material={materials.deviceShell}>
        <boxGeometry args={[0.32, 0.022, 0.22]} />
      </mesh>
      <mesh position={[0, 0.032, -0.01]} material={materials.deviceDark}>
        <boxGeometry args={[0.25, 0.006, 0.13]} />
      </mesh>
      <mesh position={[0, 0.125, -0.095]} rotation={[Math.PI / 5, 0, 0]} material={materials.deviceShell}>
        <boxGeometry args={[0.31, 0.19, 0.015]} />
      </mesh>
      <mesh position={[0, 0.129, -0.088]} rotation={[Math.PI / 5, 0, 0]} material={materials.screen}>
        <boxGeometry args={[0.27, 0.15, 0.006]} />
      </mesh>
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
      position={[object.position.x, object.elevationM, object.position.z]}
      rotation={[0, object.rotationY, 0]}
      onPointerDown={handlePointerDown}
    >
      {object.renderKind === 'window-curtains' ? <WindowAndCurtains materials={materials} /> : null}
      {object.renderKind === 'window-opening' ? <WindowOpening object={object} /> : null}
      {object.renderKind === 'area-rug' ? <AreaRug object={object} /> : null}
      {object.renderKind === 'floor-lamp' ? <FloorLamp materials={materials} /> : null}
      {object.renderKind === 'plant' ? <Plant materials={materials} /> : null}
      {object.renderKind === 'desk-monitor' ? <DeskMonitor materials={materials} /> : null}
      {object.renderKind === 'laptop' ? <Laptop materials={materials} /> : null}
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
