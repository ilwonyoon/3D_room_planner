import { Environment } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { useEditorObjectsStore, useLightingPresetStore, useRoomStore } from '@/store'
import type { EditorObject, LightingPresetId, RenderQuality } from '@/store'

RectAreaLightUniformsLib.init()

type WallSide = 'back' | 'front' | 'left' | 'right'
type LightTuple = [number, number, number]

type LightingPreset = {
  environmentIntensity: number
  ambientIntensity: number
  hemisphere: {
    sky: string
    ground: string
    intensity: number
  }
  window: {
    temperatureK: number
    powerLumens: number
    widthScale: number
    heightScale: number
    insetM: number
  }
  fill: {
    temperatureK: number
    powerLumens: number
    position: LightTuple
    target: LightTuple
    width: number
    height: number
  }
  sun: {
    temperatureK: number
    intensity: number
  }
  practical: {
    temperatureK: number
    deskPowerLumens: number
    floorPowerLumens: number
  }
  bounce: {
    floorPowerLumens: number
    backWallPowerLumens: number
  }
  exposure: number
}

const lightingPresets: Record<LightingPresetId, LightingPreset> = {
  'afternoon-natural': {
    environmentIntensity: 0.24,
    ambientIntensity: 0.008,
    hemisphere: {
      sky: '#fff5e8',
      ground: '#4a443a',
      intensity: 0.082,
    },
    window: {
      temperatureK: 5450,
      powerLumens: 24,
      widthScale: 1.22,
      heightScale: 1.12,
      insetM: 0.36,
    },
    fill: {
      temperatureK: 6800,
      powerLumens: 1.65,
      position: [-1.7, 2.45, 2.05],
      target: [-0.15, 0.58, -0.25],
      width: 3.8,
      height: 2.5,
    },
    sun: {
      temperatureK: 5150,
      intensity: 0.86,
    },
    practical: {
      temperatureK: 2850,
      deskPowerLumens: 0.75,
      floorPowerLumens: 1.25,
    },
    bounce: {
      floorPowerLumens: 1.85,
      backWallPowerLumens: 1.22,
    },
    exposure: 0.94,
  },
}

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value))
}

function kelvinToRgb(temperatureK: number): string {
  const temperature = clamp(temperatureK / 100, 10, 400)
  const red = temperature <= 66
    ? 255
    : 329.698727446 * ((temperature - 60) ** -0.1332047592)
  const green = temperature <= 66
    ? 99.4708025861 * Math.log(temperature) - 161.1195681661
    : 288.1221695283 * ((temperature - 60) ** -0.0755148492)
  const blue = temperature >= 66
    ? 255
    : temperature <= 19
      ? 0
      : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307

  return `rgb(${Math.round(clamp(red))}, ${Math.round(clamp(green))}, ${Math.round(clamp(blue))})`
}

function wallSideForObject(object: EditorObject, room: { widthM: number; depthM: number }): WallSide {
  const distances: Array<{ side: WallSide; distance: number }> = [
    { side: 'back', distance: Math.abs(object.position.z + room.depthM / 2) },
    { side: 'front', distance: Math.abs(object.position.z - room.depthM / 2) },
    { side: 'left', distance: Math.abs(object.position.x + room.widthM / 2) },
    { side: 'right', distance: Math.abs(object.position.x - room.widthM / 2) },
  ]

  distances.sort((a, b) => a.distance - b.distance)
  return distances[0].side
}

function inwardNormal(side: WallSide) {
  return side === 'back'
    ? { x: 0, z: 1 }
    : side === 'front'
      ? { x: 0, z: -1 }
      : side === 'left'
        ? { x: 1, z: 0 }
        : { x: -1, z: 0 }
}

function AreaLight({
  position,
  target,
  temperatureK,
  intensity = 1,
  powerLumens,
  width,
  height,
}: {
  position: LightTuple
  target: LightTuple
  temperatureK: number
  intensity?: number
  powerLumens?: number
  width: number
  height: number
}) {
  const ref = useRef<THREE.RectAreaLight>(null)
  const color = useMemo(() => kelvinToRgb(temperatureK), [temperatureK])

  useLayoutEffect(() => {
    if (!ref.current) return

    ref.current.lookAt(...target)
    if (powerLumens !== undefined) {
      ref.current.power = powerLumens
    }
  }, [powerLumens, target])

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

function SceneExposure({ exposure }: { exposure: number }) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    gl.toneMappingExposure = exposure
    invalidate()
  }, [exposure, gl, invalidate])

  return null
}

function DirectionalShadowLight({
  position,
  target,
  temperatureK,
  intensity,
  dynamicShadows,
  shadowMapSize,
  room,
}: {
  position: LightTuple
  target: LightTuple
  temperatureK: number
  intensity: number
  dynamicShadows: boolean
  shadowMapSize: number
  room: { widthM: number; depthM: number; heightM: number }
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)
  const color = useMemo(() => kelvinToRgb(temperatureK), [temperatureK])

  useLayoutEffect(() => {
    if (!lightRef.current || !targetRef.current) return

    lightRef.current.target = targetRef.current
    lightRef.current.target.updateMatrixWorld()
  }, [target])

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={position}
        intensity={intensity}
        color={color}
        castShadow={dynamicShadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-(room.widthM / 2 + 0.7)}
        shadow-camera-right={room.widthM / 2 + 0.7}
        shadow-camera-top={room.depthM / 2 + 0.8}
        shadow-camera-bottom={-(room.depthM / 2 + 0.8)}
        shadow-camera-near={0.85}
        shadow-camera-far={9.25}
        shadow-bias={-0.00018}
        shadow-normalBias={0.035}
      />
      <object3D ref={targetRef} position={target} />
    </>
  )
}

function WindowKeyLight({
  windowObject,
  preset,
  dynamicShadows,
  shadowMapSize,
}: {
  windowObject: EditorObject | undefined
  preset: LightingPreset
  dynamicShadows: boolean
  shadowMapSize: number
}) {
  const room = useRoomStore((state) => state.room)
  const side = windowObject ? wallSideForObject(windowObject, room) : 'right'
  const normal = inwardNormal(side)
  const center: LightTuple = windowObject
    ? [
        windowObject.position.x + normal.x * preset.window.insetM,
        windowObject.elevationM + windowObject.dimensionsM.y * 0.58,
        windowObject.position.z + normal.z * preset.window.insetM,
      ]
    : [2.0, 1.62, -0.35]
  const target: LightTuple = [-0.12, 0.62, -0.08]
  const shadowPosition: LightTuple = [
    center[0] - normal.x * 4.35 + 0.35,
    Math.min(room.heightM + 2.6, 5.25),
    center[2] - normal.z * 4.35 + 0.42,
  ]
  const width = (windowObject?.dimensionsM.x ?? 1.55) * preset.window.widthScale
  const height = (windowObject?.dimensionsM.y ?? 1.05) * preset.window.heightScale

  return (
    <>
      <AreaLight
        position={center}
        target={target}
        temperatureK={preset.window.temperatureK}
        powerLumens={preset.window.powerLumens}
        width={width}
        height={height}
      />
      <DirectionalShadowLight
        position={shadowPosition}
        target={target}
        temperatureK={preset.sun.temperatureK}
        intensity={preset.sun.intensity}
        dynamicShadows={dynamicShadows}
        shadowMapSize={shadowMapSize}
        room={room}
      />
    </>
  )
}

function PracticalSpotLight({
  position,
  target,
  temperatureK,
  powerLumens,
  distance,
  angle,
}: {
  position: LightTuple
  target: LightTuple
  temperatureK: number
  powerLumens: number
  distance: number
  angle: number
}) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)
  const color = useMemo(() => kelvinToRgb(temperatureK), [temperatureK])

  useLayoutEffect(() => {
    if (!lightRef.current || !targetRef.current) return

    lightRef.current.target = targetRef.current
    lightRef.current.power = powerLumens
    lightRef.current.target.updateMatrixWorld()
  }, [powerLumens, target])

  return (
    <>
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={1}
        distance={distance}
        angle={angle}
        penumbra={0.82}
        decay={2}
      />
      <object3D ref={targetRef} position={target} />
    </>
  )
}

function PracticalLights({
  preset,
}: {
  preset: LightingPreset
}) {
  const objects = useEditorObjectsStore((state) => state.objects)
  const lamps = useMemo(
    () =>
      objects
        .filter((object) => object.id === 'desk-lamp' || object.id === 'reading-lamp')
        .map((object) => ({
          id: object.id,
          position: [
            object.position.x,
            object.elevationM + object.dimensionsM.y * (object.id === 'desk-lamp' ? 0.72 : 0.84),
            object.position.z,
          ] as LightTuple,
          target: [
            object.position.x + (object.id === 'desk-lamp' ? -0.14 : 0.18),
            object.id === 'desk-lamp' ? 0.82 : 0.18,
            object.position.z + (object.id === 'desk-lamp' ? 0.04 : 0.28),
          ] as LightTuple,
          distance: object.id === 'desk-lamp' ? 1.35 : 2.2,
          powerLumens: object.id === 'desk-lamp' ? preset.practical.deskPowerLumens : preset.practical.floorPowerLumens,
          angle: object.id === 'desk-lamp' ? 0.62 : 0.74,
        })),
    [objects, preset.practical.deskPowerLumens, preset.practical.floorPowerLumens],
  )

  return (
    <>
      {lamps.map((lamp) => (
        <PracticalSpotLight
          key={lamp.id}
          position={lamp.position}
          target={lamp.target}
          temperatureK={preset.practical.temperatureK}
          powerLumens={lamp.powerLumens}
          distance={lamp.distance}
          angle={lamp.angle}
        />
      ))}
    </>
  )
}

function IndirectBounceLights({
  preset,
  quality,
}: {
  preset: LightingPreset
  quality: RenderQuality
}) {
  const room = useRoomStore((state) => state.room)

  if (quality === 'low') {
    return null
  }

  return (
    <>
      <AreaLight
        position={[0, 0.065, -0.2]}
        target={[0, 1.15, -0.2]}
        temperatureK={3600}
        powerLumens={preset.bounce.floorPowerLumens}
        width={room.widthM}
        height={room.depthM}
      />
      <AreaLight
        position={[0, 1.22, -room.depthM / 2 + 0.075]}
        target={[0, 0.85, -0.35]}
        temperatureK={preset.window.temperatureK}
        powerLumens={preset.bounce.backWallPowerLumens}
        width={room.widthM}
        height={room.heightM}
      />
    </>
  )
}

/**
 * Current-room natural light rig: one motivated window key, one sun shadow,
 * restrained fill, cheap bounce cards, and very low practical lamp accents.
 */
export function Lighting({ quality }: { quality: RenderQuality }) {
  const presetId = useLightingPresetStore((state) => state.preset)
  const preset = lightingPresets[presetId]
  const dynamicShadows = quality !== 'low'
  const shadowMapSize = quality === 'high' ? 2048 : quality === 'medium' ? 1024 : 512
  const windowObject = useEditorObjectsStore((state) =>
    state.objects.find((object) => object.id === 'window-main' || object.renderKind === 'window-opening'),
  )

  return (
    <>
      <SceneExposure exposure={preset.exposure} />
      <Environment files="/assets/hdri/poly_haven_studio_1k.hdr" environmentIntensity={preset.environmentIntensity} />

      <ambientLight intensity={preset.ambientIntensity} color="#ffffff" />
      <hemisphereLight args={[preset.hemisphere.sky, preset.hemisphere.ground, preset.hemisphere.intensity]} />

      <WindowKeyLight
        windowObject={windowObject}
        preset={preset}
        dynamicShadows={dynamicShadows}
        shadowMapSize={shadowMapSize}
      />
      <AreaLight
        position={preset.fill.position}
        target={preset.fill.target}
        temperatureK={preset.fill.temperatureK}
        powerLumens={preset.fill.powerLumens}
        width={preset.fill.width}
        height={preset.fill.height}
      />
      <IndirectBounceLights preset={preset} quality={quality} />
      <PracticalLights preset={preset} />
    </>
  )
}
