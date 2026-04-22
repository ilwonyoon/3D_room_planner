import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { useEditorObjectsStore, useRoomSettingsStore, useRoomStore, useSelectionStore } from '@/store'
import type { EditorObject } from '@/store'

const TEXTURE_REPEAT = {
  floor: [1.55, 1.55] as const,
  wall: [1.15, 0.85] as const,
}
const RAYCAST_HITBOX_LAYER = 2

type WallSide = 'back' | 'front' | 'left' | 'right'

function setRaycastHitboxLayer(object: THREE.Object3D) {
  object.layers.set(RAYCAST_HITBOX_LAYER)
}

function visibleWallSides(cameraPosition: THREE.Vector3) {
  return {
    back: cameraPosition.z >= 0,
    front: cameraPosition.z < 0,
    left: cameraPosition.x >= 0,
    right: cameraPosition.x < 0,
  } satisfies Record<WallSide, boolean>
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

function makePlaneGeometry(width: number, height: number, segments = 96) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments)
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array, 2))
  return geometry
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
        roughness: 0.74,
        metalness: 0,
        normalScale: new THREE.Vector2(0.085, 0.085),
        aoMapIntensity: 0.62,
      }),
      wall: new THREE.MeshStandardMaterial({
        ...wallTextures,
        color: '#f8f8fb',
        roughness: 0.9,
        metalness: 0,
        normalScale: new THREE.Vector2(0.18, 0.18),
        aoMapIntensity: 0.38,
        displacementScale: 0.008,
        displacementBias: -0.003,
      }),
      trim: new THREE.MeshStandardMaterial({ color: '#fafafd', roughness: 0.55 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#edf5fb',
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
  const { widthM: width, depthM: depth, heightM: height } = room
  const backWallRef = useRef<THREE.Group>(null)
  const frontWallRef = useRef<THREE.Group>(null)
  const leftWallRef = useRef<THREE.Group>(null)
  const rightWallRef = useRef<THREE.Group>(null)

  const floorGeometry = useMemo(() => makePlaneGeometry(width, depth, 1), [width, depth])
  const widthWallGeometry = useMemo(() => makePlaneGeometry(width, height, 96), [width, height])
  const depthWallGeometry = useMemo(() => makePlaneGeometry(depth, height, 96), [depth, height])

  useFrame(({ camera }) => {
    const visibleSides = visibleWallSides(camera.position)

    if (backWallRef.current) backWallRef.current.visible = visibleSides.back
    if (frontWallRef.current) frontWallRef.current.visible = visibleSides.front
    if (leftWallRef.current) leftWallRef.current.visible = visibleSides.left
    if (rightWallRef.current) rightWallRef.current.visible = visibleSides.right
  })

  return (
    <group>
      <mesh
        geometry={floorGeometry}
        material={materials.floor}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />

      <group ref={backWallRef}>
        <mesh
          geometry={widthWallGeometry}
          material={materials.wall}
          position={[0, height / 2, -depth / 2]}
          receiveShadow
        />
        <mesh position={[0, 0.045, -depth / 2 + 0.035]} material={materials.trim}>
          <boxGeometry args={[width + 0.08, 0.09, 0.07]} />
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
        <mesh position={[0, 0.045, depth / 2 - 0.035]} material={materials.trim}>
          <boxGeometry args={[width + 0.08, 0.09, 0.07]} />
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
        <mesh position={[-width / 2 + 0.035, 0.045, 0]} material={materials.trim}>
          <boxGeometry args={[0.07, 0.09, depth + 0.08]} />
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
        <mesh position={[width / 2 - 0.035, 0.045, 0]} material={materials.trim}>
          <boxGeometry args={[0.07, 0.09, depth + 0.08]} />
        </mesh>
      </group>

      <mesh position={[0, -0.035, depth / 2]} material={materials.trim}>
        <boxGeometry args={[width, 0.11, 0.12]} />
      </mesh>
      <mesh position={[width / 2, -0.035, 0]} material={materials.trim}>
        <boxGeometry args={[0.12, 0.11, depth]} />
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

function FurnitureModel({
  object,
  selected,
  onSelect,
}: {
  object: EditorObject
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { scene } = useGLTF(object.url, false, true)
  const room = useRoomStore((s) => s.room)
  const groupRef = useRef<THREE.Group>(null)
  const { model, scale } = useMemo(() => {
    const cloned = scene.clone(true)
    const bounds = new THREE.Box3().setFromObject(cloned)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    cloned.position.set(-center.x, -bounds.min.y, -center.z)

    return {
      model: cloned,
      scale: object.targetSize / Math.max(size.x, size.y, size.z, 0.001),
    }
  }, [object.targetSize, scene])

  useLayoutEffect(() => {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
        object.receiveShadow = true

        if (object.material instanceof THREE.MeshStandardMaterial || object.material instanceof THREE.MeshPhysicalMaterial) {
          object.material.envMapIntensity = 1.15
          object.material.needsUpdate = true
        }
      }
    })
  }, [model])

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    if (object.placement !== 'wall') {
      groupRef.current.visible = true
      return
    }

    const side = wallSideFromPosition(object.position, room)
    groupRef.current.visible = visibleWallSides(camera.position)[side]
  })

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
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
      <primitive object={model} />
      {selected && (
        <mesh visible={false}>
          <boxGeometry args={[object.dimensionsM.x, object.dimensionsM.y, object.dimensionsM.z]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
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

function ProceduralObject({
  object,
  onSelect,
  materials,
}: {
  object: EditorObject
  onSelect: (id: string) => void
  materials: ReturnType<typeof usePbrRoomMaterials>
}) {
  const room = useRoomStore((s) => s.room)
  const groupRef = useRef<THREE.Group>(null)
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
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
    groupRef.current.visible = visibleWallSides(camera.position)[side]
  })

  return (
    <group
      ref={groupRef}
      position={[object.position.x, object.elevationM, object.position.z]}
      rotation={[0, object.rotationY, 0]}
      onPointerDown={handlePointerDown}
    >
      {object.renderKind === 'window-curtains' ? <WindowAndCurtains materials={materials} /> : null}
      {object.renderKind === 'floor-lamp' ? <FloorLamp materials={materials} /> : null}
      {object.renderKind === 'plant' ? <Plant materials={materials} /> : null}
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

export function AssetRoom({ onClearSelection }: { onClearSelection?: () => void }) {
  const materials = usePbrRoomMaterials()
  const objects = useEditorObjectsStore((state) => state.objects)
  const setEditMode = useEditorObjectsStore((state) => state.setEditMode)
  const setActiveDragMode = useEditorObjectsStore((state) => state.setActiveDragMode)
  const selectedId = useSelectionStore((state) => state.selectedId)
  const select = useSelectionStore((state) => state.select)

  const handleBackgroundPointerDown = (event: ThreeEvent<PointerEvent>) => {
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
            onSelect={handleObjectSelect}
          />
        ) : (
          <FurnitureModel
            key={object.id}
            object={object}
            selected={selectedId === object.id}
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
