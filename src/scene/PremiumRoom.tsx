import { useMemo } from 'react'
import * as THREE from 'three'

import { useRoomStore } from '@/store'

/**
 * Bathroom room shell — gray porcelain floor, white walls with a penny-round
 * tile accent on the back wall (behind the vanity). All bedroom meshes
 * (bed, plant, floor lamp, framed art, window+curtain) from the old premium
 * room are removed; this is purely the envelope so the bathroom GLBs read
 * clearly. Floor and accent-wall textures come from real Lowe's Tile SKUs
 * downloaded to public/assets/textures/bathroom/ at build prep time.
 */

const FLOOR_TILE_URL = '/assets/textures/bathroom/floor_cloud_gray.jpg'
const ACCENT_TILE_URL = '/assets/textures/bathroom/wall_penny_round.jpg'

function makeRepeatingTexture(url: string, repeatX: number, repeatY: number) {
  const loader = new THREE.TextureLoader()
  const tex = loader.load(url)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function useBathroomMaterials() {
  return useMemo(() => {
    // Floor: large cloud-gray porcelain tile. Repeat tuned so each tile
    // image cell reads as ~60cm of floor — a believable 24" tile.
    const floorTex = makeRepeatingTexture(FLOOR_TILE_URL, 6, 7)
    // Accent wall: glossy white penny-round mosaic. Repeat tuned so each
    // image cell is ~30cm wide — true to a penny-round mosaic sheet.
    const accentTex = makeRepeatingTexture(ACCENT_TILE_URL, 12, 8)

    return {
      floor: new THREE.MeshStandardMaterial({
        map: floorTex,
        color: '#a8a39d',
        side: THREE.FrontSide,
        roughness: 0.72,
        metalness: 0.04,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: '#ede8df',
        roughness: 0.92,
        metalness: 0,
      }),
      accentWall: new THREE.MeshStandardMaterial({
        map: accentTex,
        color: '#ffffff',
        roughness: 0.36,
        metalness: 0.02,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: '#f6f3ec',
        roughness: 0.95,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        roughness: 0.6,
        metalness: 0.1,
      }),
    }
  }, [])
}

function RoomShell({ materials }: { materials: ReturnType<typeof useBathroomMaterials> }) {
  const room = useRoomStore((s) => s.room)
  const { widthM: width, depthM: depth, heightM: height } = room

  // Walls are single-sided planes with normals pointing INWARD (visible to
  // the room camera, invisible from outside). A planeGeometry's default normal
  // is +z; we rotate each wall so its normal points into the room, then keep
  // FrontSide so the back of the wall (facing outside) culls automatically.
  const wallMat = useMemo(() => {
    const m = materials.wall.clone()
    m.side = THREE.FrontSide
    return m
  }, [materials.wall])
  const accentMat = useMemo(() => {
    const m = materials.accentWall.clone()
    m.side = THREE.FrontSide
    return m
  }, [materials.accentWall])

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={materials.floor}>
        <planeGeometry args={[width, depth]} />
      </mesh>

      {/* Back wall — split: left half plain, right half accent (penny-round
          tile behind the vanity). Normal points +z (toward camera). */}
      <mesh
        position={[-width / 4, height / 2, -depth / 2]}
        receiveShadow
        material={wallMat}
      >
        <planeGeometry args={[width / 2, height]} />
      </mesh>
      <mesh
        position={[width / 4, height / 2, -depth / 2]}
        receiveShadow
        material={accentMat}
      >
        <planeGeometry args={[width / 2, height]} />
      </mesh>

      {/* Left wall — rotated so its normal points +x (inward). */}
      <mesh
        position={[-width / 2, height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        material={wallMat}
      >
        <planeGeometry args={[depth, height]} />
      </mesh>

      {/* Right wall — normal points -x (inward). */}
      <mesh
        position={[width / 2, height / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        material={wallMat}
      >
        <planeGeometry args={[depth, height]} />
      </mesh>

      {/* Baseboard trim — thin matte-black line at the floor edge */}
      <mesh position={[0, 0.05, -depth / 2 + 0.02]} material={materials.trim}>
        <boxGeometry args={[width, 0.1, 0.02]} />
      </mesh>
      <mesh position={[-width / 2 + 0.02, 0.05, 0]} material={materials.trim}>
        <boxGeometry args={[0.02, 0.1, depth]} />
      </mesh>
      <mesh position={[width / 2 - 0.02, 0.05, -depth / 4]} material={materials.trim}>
        <boxGeometry args={[0.02, 0.1, depth / 2]} />
      </mesh>
    </group>
  )
}

export function PremiumRoom() {
  const materials = useBathroomMaterials()

  return (
    <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <RoomShell materials={materials} />
    </group>
  )
}
