import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import { useRoomStore } from '@/store'

function makeTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat: [number, number],
) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  paint(ctx, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat[0], repeat[1])
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createWoodTexture() {
  return makeTexture(
    1024,
    (ctx, size) => {
      const gradient = ctx.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, '#d6bc91')
      gradient.addColorStop(0.55, '#c99e70')
      gradient.addColorStop(1, '#a9794f')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      for (let x = 0; x < size; x += 84) {
        ctx.fillStyle = x % 168 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(72,43,24,0.08)'
        ctx.fillRect(x, 0, 2, size)
      }

      for (let y = 0; y < size; y += 256) {
        ctx.fillStyle = 'rgba(52,31,18,0.12)'
        ctx.fillRect(0, y, size, 2)
      }

      for (let i = 0; i < 180; i += 1) {
        const x = Math.random() * size
        const y = Math.random() * size
        const length = 90 + Math.random() * 180
        ctx.strokeStyle = `rgba(82,51,32,${0.05 + Math.random() * 0.08})`
        ctx.lineWidth = 1 + Math.random() * 1.5
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.bezierCurveTo(x + length * 0.3, y - 8, x + length * 0.7, y + 10, x + length, y)
        ctx.stroke()
      }
    },
    [1, 1],
  )
}

function createWallTexture() {
  return makeTexture(
    768,
    (ctx, size) => {
      const gradient = ctx.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, '#fbfbfd')
      gradient.addColorStop(0.65, '#ececf1')
      gradient.addColorStop(1, '#dadbe3')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      for (let x = 0; x < size; x += 28) {
        ctx.strokeStyle = 'rgba(145,146,160,0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, size)
        ctx.stroke()
      }

      for (let i = 0; i < 900; i += 1) {
        const shade = Math.random() > 0.5 ? 255 : 110
        ctx.fillStyle = `rgba(${shade},${shade},${shade},0.018)`
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1)
      }
    },
    [1.6, 1],
  )
}

function createFabricTexture() {
  return makeTexture(
    512,
    (ctx, size) => {
      ctx.fillStyle = '#777b92'
      ctx.fillRect(0, 0, size, size)

      for (let y = 0; y < size; y += 9) {
        ctx.strokeStyle = y % 18 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(24,27,45,0.055)'
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(size, y + Math.sin(y * 0.2) * 2)
        ctx.stroke()
      }

      for (let x = 0; x < size; x += 11) {
        ctx.strokeStyle = 'rgba(255,255,255,0.035)'
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + Math.sin(x) * 2, size)
        ctx.stroke()
      }
    },
    [2, 2],
  )
}

function usePremiumMaterials() {
  return useMemo(() => {
    const wood = createWoodTexture()
    const wall = createWallTexture()
    const fabric = createFabricTexture()

    return {
      wood,
      wall,
      fabric,
      floor: new THREE.MeshStandardMaterial({
        map: wood,
        color: '#f3dfc3',
        roughness: 0.62,
        metalness: 0,
        emissive: '#4a3827',
        emissiveIntensity: 0.08,
      }),
      wallMat: new THREE.MeshStandardMaterial({
        map: wall,
        color: '#f4f4f8',
        roughness: 0.88,
        metalness: 0,
        emissive: '#ffffff',
        emissiveIntensity: 0.16,
      }),
      trim: new THREE.MeshStandardMaterial({ color: '#f7f7fb', roughness: 0.7 }),
      plankLine: new THREE.MeshBasicMaterial({
        color: '#7d6045',
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
      bedBase: new THREE.MeshStandardMaterial({ color: '#f7f4ee', roughness: 0.76 }),
      mattress: new THREE.MeshStandardMaterial({
        map: fabric,
        color: '#85899f',
        roughness: 0.92,
      }),
      headboard: new THREE.MeshStandardMaterial({ color: '#f6f1ea', roughness: 0.86 }),
      gold: new THREE.MeshStandardMaterial({
        color: '#aa7932',
        roughness: 0.38,
        metalness: 0.65,
      }),
      plant: new THREE.MeshStandardMaterial({ color: '#406c3f', roughness: 0.68 }),
      plantDark: new THREE.MeshStandardMaterial({ color: '#23472c', roughness: 0.75 }),
      pot: new THREE.MeshStandardMaterial({ color: '#2f2926', roughness: 0.78 }),
      frame: new THREE.MeshStandardMaterial({ color: '#b29572', roughness: 0.52 }),
      glass: new THREE.MeshStandardMaterial({
        color: '#f4f8fb',
        roughness: 0.2,
        metalness: 0,
        transparent: true,
        opacity: 0.86,
      }),
      curtain: new THREE.MeshStandardMaterial({
        color: '#dedee8',
        roughness: 0.9,
        transparent: true,
        opacity: 0.46,
      }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
    }
  }, [])
}

function FloorShadow({ position, scale }: { position: [number, number, number], scale: [number, number, number] }) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    [],
  )

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale} material={material}>
      <circleGeometry args={[1, 48]} />
    </mesh>
  )
}

function Bed({ materials }: { materials: ReturnType<typeof usePremiumMaterials> }) {
  const buttonMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5e6177', roughness: 0.95 }),
    [],
  )

  return (
    <group position={[-0.86, 0.02, -0.78]} rotation={[0, 0, 0]}>
      <FloorShadow position={[0.08, 0.012, 0.17]} scale={[1.28, 0.46, 0.82]} />

      <RoundedBox args={[1.72, 0.34, 2.08]} radius={0.035} smoothness={4} position={[0, 0.22, 0.1]} castShadow receiveShadow material={materials.bedBase} />
      <RoundedBox args={[1.78, 0.3, 2.14]} radius={0.075} smoothness={8} position={[0, 0.48, 0.05]} castShadow receiveShadow material={materials.mattress} />

      <mesh position={[0, 0.4, 1.15]} castShadow receiveShadow material={materials.mattress}>
        <boxGeometry args={[1.8, 0.26, 0.16]} />
      </mesh>

      <group position={[0, 0.82, -1.16]}>
        <RoundedBox args={[1.88, 1.0, 0.16]} radius={0.05} smoothness={5} castShadow receiveShadow material={materials.headboard} />
        {[-0.58, 0, 0.58].map((x) =>
          [-0.28, 0.05, 0.38].map((y) => (
            <RoundedBox
              key={`${x}-${y}`}
              args={[0.5, 0.24, 0.035]}
              radius={0.035}
              smoothness={4}
              position={[x, y, 0.086]}
              castShadow
              receiveShadow
              material={materials.headboard}
            />
          )),
        )}
      </group>

      {[-0.54, 0, 0.54].map((x) =>
        [-0.46, 0.05, 0.56].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.637, z]} rotation={[-Math.PI / 2, 0, 0]} material={buttonMaterial}>
            <circleGeometry args={[0.04, 24]} />
          </mesh>
        )),
      )}
    </group>
  )
}

function FloorLamp({ materials }: { materials: ReturnType<typeof usePremiumMaterials> }) {
  return (
    <group position={[-1.78, 0, -0.95]}>
      <FloorShadow position={[0, 0.014, 0]} scale={[0.34, 0.34, 0.34]} />
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow material={materials.gold}>
        <cylinderGeometry args={[0.22, 0.22, 0.045, 48]} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow material={materials.gold}>
        <cylinderGeometry args={[0.018, 0.018, 1.4, 24]} />
      </mesh>
      <mesh position={[0, 1.43, 0]} castShadow material={materials.gold}>
        <cylinderGeometry args={[0.25, 0.33, 0.15, 48]} />
      </mesh>
      <pointLight position={[0, 1.34, 0]} intensity={0.55} distance={2.3} color="#ffe0ad" />
    </group>
  )
}

function Plant({ materials }: { materials: ReturnType<typeof usePremiumMaterials> }) {
  const leaves = Array.from({ length: 18 }, (_, i) => ({
    angle: (i / 18) * Math.PI * 2,
    tilt: 0.45 + (i % 4) * 0.12,
    height: 0.34 + (i % 5) * 0.04,
  }))

  return (
    <group position={[0.3, 0, -0.85]}>
      <FloorShadow position={[0, 0.012, 0.01]} scale={[0.34, 0.28, 0.34]} />
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow material={materials.pot}>
        <cylinderGeometry args={[0.14, 0.18, 0.26, 32]} />
      </mesh>
      {leaves.map((leaf, index) => (
        <mesh
          key={index}
          position={[Math.cos(leaf.angle) * 0.08, 0.36 + leaf.height * 0.18, Math.sin(leaf.angle) * 0.08]}
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

function WallDecor({ materials, widthM, depthM }: { materials: ReturnType<typeof usePremiumMaterials>, widthM: number, depthM: number }) {
  const z = -depthM / 2 + 0.052

  return (
    <>
      <group position={[-0.24, 1.58, z]}>
        <mesh position={[-0.22, 0, 0]} material={materials.frame}>
          <boxGeometry args={[0.25, 0.42, 0.035]} />
        </mesh>
        <mesh position={[-0.22, 0, 0.021]}>
          <planeGeometry args={[0.19, 0.34]} />
          <meshStandardMaterial color="#d8d1bd" roughness={0.7} />
        </mesh>
        <mesh position={[0.16, 0.02, 0]} material={materials.frame}>
          <boxGeometry args={[0.3, 0.45, 0.035]} />
        </mesh>
        <mesh position={[0.16, 0.02, 0.021]}>
          <planeGeometry args={[0.24, 0.37]} />
          <meshStandardMaterial color="#4a81c5" roughness={0.7} />
        </mesh>
      </group>

      <group position={[widthM / 2 - 0.055, 1.45, -0.3]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0]} material={materials.glass}>
          <planeGeometry args={[1.0, 0.55]} />
        </mesh>
        <mesh position={[0, 0, 0.018]} material={materials.trim}>
          <boxGeometry args={[1.08, 0.04, 0.03]} />
        </mesh>
        <mesh position={[0, 0.275, 0.018]} material={materials.trim}>
          <boxGeometry args={[1.08, 0.035, 0.03]} />
        </mesh>
        <mesh position={[0, -0.275, 0.018]} material={materials.trim}>
          <boxGeometry args={[1.08, 0.035, 0.03]} />
        </mesh>
        <mesh position={[0, 0, 0.018]} material={materials.trim}>
          <boxGeometry args={[0.035, 0.56, 0.03]} />
        </mesh>
        {[-0.68, 0.68].map((x) => (
          <group key={x} position={[x, -0.02, 0.025]}>
            {[-0.1, 0.02, 0.14].map((offset) => (
              <mesh key={offset} position={[offset, 0, 0]} material={materials.curtain}>
                <boxGeometry args={[0.038, 1.05, 0.018]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  )
}

function RoomShell({ materials }: { materials: ReturnType<typeof usePremiumMaterials> }) {
  const room = useRoomStore((s) => s.room)
  const { widthM: width, depthM: depth, heightM: height } = room
  const baseHeight = 0.08
  const plankLines = Array.from({ length: 13 }, (_, index) => -depth / 2 + 0.3 + index * 0.34)

  return (
    <group>
      <mesh position={[0, -baseHeight / 2, 0]} receiveShadow material={materials.floor}>
        <boxGeometry args={[width, baseHeight, depth]} />
      </mesh>

      {plankLines.map((z, index) => (
        <mesh key={index} position={[0, 0.006, z]} material={materials.plankLine}>
          <boxGeometry args={[width - 0.18, 0.006, 0.012]} />
        </mesh>
      ))}
      {[-1.2, 0.15, 1.35].map((x, index) => (
        <mesh key={index} position={[x, 0.007, 0]} material={materials.plankLine}>
          <boxGeometry args={[0.012, 0.006, depth - 0.22]} />
        </mesh>
      ))}

      <mesh position={[0, height / 2, -depth / 2]} castShadow receiveShadow material={materials.wallMat}>
        <boxGeometry args={[width, height, 0.08]} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} castShadow receiveShadow material={materials.wallMat}>
        <boxGeometry args={[0.08, height, depth]} />
      </mesh>

      <mesh position={[0, 0.05, -depth / 2 + 0.06]} material={materials.trim}>
        <boxGeometry args={[width + 0.1, 0.1, 0.08]} />
      </mesh>
      <mesh position={[-width / 2 + 0.06, 0.05, 0]} material={materials.trim}>
        <boxGeometry args={[0.08, 0.1, depth + 0.08]} />
      </mesh>
      <mesh position={[0, -0.005, depth / 2]} material={materials.trim}>
        <boxGeometry args={[width, 0.08, 0.1]} />
      </mesh>
      <mesh position={[width / 2, -0.005, 0]} material={materials.trim}>
        <boxGeometry args={[0.1, 0.08, depth]} />
      </mesh>

      <WallDecor materials={materials} widthM={width} depthM={depth} />
    </group>
  )
}

export function PremiumRoom() {
  const materials = usePremiumMaterials()

  return (
    <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <RoomShell materials={materials} />
      <Bed materials={materials} />
      <FloorLamp materials={materials} />
      <Plant materials={materials} />
    </group>
  )
}
