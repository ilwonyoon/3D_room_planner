import { Environment } from '@react-three/drei'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

RectAreaLightUniformsLib.init()

function AreaLight({
  position,
  target,
  color,
  intensity,
  width,
  height,
}: {
  position: [number, number, number]
  target: [number, number, number]
  color: string
  intensity: number
  width: number
  height: number
}) {
  const ref = useRef<THREE.RectAreaLight>(null)

  useLayoutEffect(() => {
    ref.current?.lookAt(...target)
  }, [target])

  return (
    <rectAreaLight
      ref={ref}
      position={position}
      color={color}
      intensity={intensity}
      width={width}
      height={height}
    />
  )
}

/**
 * Lighting lab preset: HDRI image-based light + broad window area light + weak sun.
 * This is the non-Blender path that most affects perceived model/material quality.
 */
export function Lighting() {
  return (
    <>
      <Environment files="/assets/hdri/poly_haven_studio_1k.hdr" environmentIntensity={0.92} />

      <ambientLight intensity={0.18} color="#ffffff" />
      <hemisphereLight args={['#fff4e5', '#656878', 0.52]} />

      <AreaLight
        position={[2.15, 1.62, -0.35]}
        target={[0.1, 0.78, -0.35]}
        color="#fff2df"
        intensity={2.8}
        width={1.55}
        height={1.05}
      />
      <AreaLight
        position={[-1.5, 2.55, 2.1]}
        target={[0, 0.5, 0]}
        color="#dfe8ff"
        intensity={1.05}
        width={3.6}
        height={2.4}
      />

      <directionalLight
        position={[3.8, 5.8, 3.3]}
        intensity={0.36}
        color="#fff0d7"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00035}
      />
    </>
  )
}
