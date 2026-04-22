import { useRoomStore } from '@/store'
import * as THREE from 'three'
import { useMemo } from 'react'

/**
 * Isometric box room (back-left + back-right walls visible, others cutaway).
 * Origin is at floor center. Y = up.
 */
export function Room() {
  const room = useRoomStore((s) => s.room)
  const { widthM: w, depthM: d, heightM: h, floor, wall } = room

  // Simple wood grain procedural material — v1 replaced by texture later
  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: floor.colorHex,
        roughness: 0.75,
        metalness: 0.0,
      }),
    [floor.colorHex],
  )

  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: wall.colorHex,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.FrontSide,
      }),
    [wall.colorHex],
  )

  // Window cutout (decorative, v1): just a lighter rectangle on the back-right wall
  const windowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#E8F3FF',
        emissive: '#BFD9FF',
        emissiveIntensity: 0.4,
        roughness: 0.3,
      }),
    [],
  )

  return (
    <group position={[0, 0, 0]}>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={floorMaterial}
      >
        <planeGeometry args={[w, d]} />
      </mesh>

      {/* Back wall (−Z side, facing camera) */}
      <mesh
        position={[0, h / 2, -d / 2]}
        receiveShadow
        material={wallMaterial}
      >
        <planeGeometry args={[w, h]} />
      </mesh>

      {/* Left wall (−X side) — rotate to face inward */}
      <mesh
        position={[-w / 2, h / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
        material={wallMaterial}
      >
        <planeGeometry args={[d, h]} />
      </mesh>

      {/* Decorative window on back wall (right side) */}
      <mesh position={[w * 0.22, h * 0.55, -d / 2 + 0.005]} material={windowMat}>
        <planeGeometry args={[w * 0.28, h * 0.35]} />
      </mesh>

      {/* Window frame */}
      <mesh position={[w * 0.22, h * 0.55, -d / 2 + 0.006]}>
        <planeGeometry args={[0.02, h * 0.35]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  )
}
