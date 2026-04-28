import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import {
  CameraControls,
  ContactShadows,
  OrthographicCamera,
  PerformanceMonitor,
  PerspectiveCamera,
} from '@react-three/drei'
import type { CameraControls as CameraControlsImpl } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing'

import { AssetRoom } from './AssetRoom'
import { Lighting } from './Lighting'
import { SelectionGizmos } from './SelectionGizmos'
import { PlacementHandlers } from '@/ui/PlacementHandlers'
import { color } from '@/constants'
import {
  useCameraViewStore,
  useEditorObjectsStore,
  useLightingPresetStore,
  useRenderQualityStore,
  useRoomStore,
  useSelectionStore,
  useUiStore,
} from '@/store'
import type { CameraViewMode, LightingPresetId, RenderQuality } from '@/store'

interface Props {
  className?: string
}

const EDITOR_OVERLAY_LAYER = 1
const RAYCAST_HITBOX_LAYER = 2
const POV_EYE_HEIGHT_M = 1.7
const POV_MOVE_SPEED_MPS = 1.8
const POV_LOOK_SPEED = 0.0042
const CONTACT_SHADOW_RESOLUTION = 256
const webglLifecycleStats = {
  contextLost: 0,
  contextRestored: 0,
}

const renderQualitySettings = {
  low: {
    dpr: [1, 1] as [number, number],
    contactOpacity: 0.18,
    aoIntensity: 0,
    aoRadius: 1.2,
  },
  medium: {
    dpr: [1, 1] as [number, number],
    contactOpacity: 0.3,
    aoIntensity: 0,
    aoRadius: 1.25,
  },
  high: {
    dpr: [1, 1.25] as [number, number],
    contactOpacity: 0.34,
    aoIntensity: 1.02,
    aoRadius: 1.4,
  },
} satisfies Record<
  RenderQuality,
  {
    dpr: [number, number]
    contactOpacity: number
    aoIntensity: number
    aoRadius: number
  }
>

function EditorInteractionLayers() {
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    camera.layers.enable(EDITOR_OVERLAY_LAYER)
    raycaster.layers.set(RAYCAST_HITBOX_LAYER)
    invalidate()

    return () => {
      camera.layers.disable(EDITOR_OVERLAY_LAYER)
      raycaster.layers.set(0)
      invalidate()
    }
  }, [camera, invalidate, raycaster])

  return null
}

function WebglLifecycleGuard() {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const canvas = gl.domElement

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      webglLifecycleStats.contextLost += 1
      console.warn('[IsometricScene] WebGL context lost')
    }

    const handleContextRestored = () => {
      webglLifecycleStats.contextRestored += 1
      console.info('[IsometricScene] WebGL context restored')
      invalidate()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false)
    }
  }, [gl, invalidate])

  return null
}

const contactShadowPresetSettings = {
  'daylight-window': {
    opacityScale: 0.92,
    blur: 2.9,
    far: 2.15,
  },
  'warm-evening': {
    opacityScale: 1.18,
    blur: 2.2,
    far: 1.65,
  },
  'night-room': {
    opacityScale: 1.08,
    blur: 2.45,
    far: 1.8,
  },
} satisfies Record<
  LightingPresetId,
  {
    opacityScale: number
    blur: number
    far: number
  }
>

const SCENE_GRID_SIZE = 18
const SCENE_GRID_INNER_FADE_RADIUS = 3.2
const SCENE_GRID_OUTER_FADE_RADIUS = SCENE_GRID_SIZE / 2

function applyGridFadeMask(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec2 vGridPosition;
    ${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vGridPosition = position.xz;`,
    )
    shader.fragmentShader = `
      varying vec2 vGridPosition;
    ${shader.fragmentShader}`.replace(
      '#include <alphatest_fragment>',
      `float gridDistance = length(vGridPosition);
       float gridFade = 1.0 - smoothstep(${SCENE_GRID_INNER_FADE_RADIUS.toFixed(2)}, ${SCENE_GRID_OUTER_FADE_RADIUS.toFixed(2)}, gridDistance);
       diffuseColor.a *= gridFade;
       if (diffuseColor.a < 0.01) discard;
       #include <alphatest_fragment>`,
    )
  }
  material.needsUpdate = true
}

function setGridOpacity(grid: THREE.GridHelper, opacity: number) {
  const material = grid.material

  if (Array.isArray(material)) {
    material.forEach((m) => {
      m.transparent = true
      m.opacity = opacity
      m.needsUpdate = true
    })
  } else {
    material.transparent = true
    material.opacity = opacity
    material.needsUpdate = true
  }
}

function SceneGrid({
  active,
  onClearSelection,
}: {
  active: boolean
  onClearSelection: () => void
}) {
  const invalidate = useThree((state) => state.invalidate)
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(SCENE_GRID_SIZE, 48, '#3d3d45', '#28282e')
    const material = helper.material

    if (Array.isArray(material)) {
      material.forEach(applyGridFadeMask)
    } else {
      applyGridFadeMask(material)
    }

    helper.position.y = -0.075
    setGridOpacity(helper, 0.12)

    return helper
  }, [])

  useEffect(() => {
    setGridOpacity(grid, active ? 0.46 : 0.12)
    invalidate()
  }, [active, grid, invalidate])

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) {
      return
    }

    onClearSelection()
  }

  return <primitive object={grid} onPointerDown={handlePointerDown} />
}

function AdaptiveQuality() {
  const lowerQuality = useRenderQualityStore((state) => state.lowerQuality)

  return (
    <PerformanceMonitor
      bounds={(refreshRate) => (refreshRate > 90 ? [48, 90] : [45, 60])}
      flipflops={3}
      onDecline={lowerQuality}
    />
  )
}

function objectWorldVisible(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object

  while (current) {
    if (!current.visible) {
      return false
    }

    current = current.parent
  }

  return true
}

function geometryTriangleCount(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  const indexCount = geometry.index?.count
  const vertexCount = typeof indexCount === 'number' ? indexCount : position?.count

  if (!vertexCount) {
    return 0
  }

  const drawRangeStart = geometry.drawRange.start
  const drawRangeCount = geometry.drawRange.count
  const drawableCount = Number.isFinite(drawRangeCount)
    ? Math.max(0, Math.min(vertexCount - drawRangeStart, drawRangeCount))
    : vertexCount

  return Math.floor(drawableCount / 3)
}

function materialDrawCallCount(mesh: THREE.Mesh) {
  if (!Array.isArray(mesh.material)) {
    return 1
  }

  return Math.max(1, mesh.geometry.groups.length)
}

function estimateSceneRenderStats(scene: THREE.Scene) {
  const render = {
    frame: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
  }
  const breakdown = new Map<string, { calls: number; triangles: number }>()

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !objectWorldVisible(child)) {
      return
    }

    const instanceCount = child instanceof THREE.InstancedMesh ? child.count : 1
    const calls = materialDrawCallCount(child)
    const triangles = geometryTriangleCount(child.geometry) * instanceCount
    render.calls += calls
    render.triangles += triangles

    const statsOwner = findRenderStatsOwner(child)
    if (statsOwner) {
      const current = breakdown.get(statsOwner) ?? { calls: 0, triangles: 0 }
      current.calls += calls
      current.triangles += triangles
      breakdown.set(statsOwner, current)
    }
  })

  return {
    ...render,
    breakdown: Array.from(breakdown.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.calls - a.calls || b.triangles - a.triangles)
      .slice(0, 20),
  }
}

function findRenderStatsOwner(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object

  while (current) {
    if (typeof current.userData.renderStatsId === 'string') {
      return current.userData.renderStatsId
    }

    current = current.parent
  }

  return null
}

function RendererStatsBridge({ quality }: { quality: RenderQuality }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const viewMode = useCameraViewStore((state) => state.mode)
  const lightingPreset = useLightingPresetStore((state) => state.preset)

  useFrame(() => {
    if (!import.meta.env.DEV) {
      return
    }

    window.__pocketroomRenderStats = {
      cameraMode: viewMode,
      lightingPreset,
      quality,
      dpr: gl.getPixelRatio(),
      webgl: { ...webglLifecycleStats },
      canvas: {
        width: gl.domElement.width,
        height: gl.domElement.height,
      },
      camera: {
        type: camera.type,
        position: [camera.position.x, camera.position.y, camera.position.z],
      },
      memory: { ...gl.info.memory },
      render: estimateSceneRenderStats(scene),
      sceneChildren: scene.children.length,
    }
  })

  return null
}

function ScenePostProcessing({ quality }: { quality: RenderQuality }) {
  const settings = renderQualitySettings[quality]

  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <N8AO
        quality="medium"
        halfRes
        aoSamples={16}
        denoiseSamples={4}
        denoiseRadius={12}
        aoRadius={settings.aoRadius}
        intensity={settings.aoIntensity}
        distanceFalloff={0.9}
      />
      <SMAA />
    </EffectComposer>
  )
}

function CameraRig({
  cameraEnabled,
  mode,
}: {
  cameraEnabled: boolean
  mode: CameraViewMode
}) {
  const invalidate = useThree((state) => state.invalidate)
  const controlsRef = useRef<CameraControlsImpl | null>(null)
  const orthographicRef = useRef<THREE.OrthographicCamera | null>(null)
  const perspectiveRef = useRef<THREE.PerspectiveCamera | null>(null)

  useEffect(() => {
    if (mode === 'pov') {
      if (perspectiveRef.current) {
        perspectiveRef.current.position.set(0, POV_EYE_HEIGHT_M, 1.7)
        perspectiveRef.current.lookAt(0, 1.28, -1.4)
        perspectiveRef.current.updateProjectionMatrix()
      }

      invalidate()
      return
    }

    const camera = orthographicRef.current
    const controls = controlsRef.current

    if (!camera || !controls) {
      return
    }

    if (mode === 'bird') {
      camera.up.set(0, 0, -1)
      camera.zoom = 76
      camera.updateProjectionMatrix()
      controls.setLookAt(0, 9.4, 0.01, 0, 0, 0, true).then(() => invalidate())
      return
    }

    camera.up.set(0, 1, 0)
    camera.zoom = 54
    camera.updateProjectionMatrix()
    controls.setLookAt(6.8, 5.9, 6.8, 0, 0.15, 0, true).then(() => invalidate())
  }, [invalidate, mode])

  return (
    <>
      <OrthographicCamera
        ref={orthographicRef}
        makeDefault={mode !== 'pov'}
        position={[6.8, 5.9, 6.8]}
        zoom={54}
        near={0.05}
        far={100}
      />
      <PerspectiveCamera
        ref={perspectiveRef}
        makeDefault={mode === 'pov'}
        position={[0, POV_EYE_HEIGHT_M, 1.7]}
        fov={68}
        near={0.03}
        far={80}
      />
      {mode !== 'pov' ? (
        <CameraControls
          key={mode}
          ref={controlsRef}
          makeDefault
          enabled={cameraEnabled}
          minPolarAngle={mode === 'bird' ? 0 : Math.PI / 8}
          maxPolarAngle={mode === 'bird' ? 0.02 : Math.PI / 2.22}
          minZoom={mode === 'bird' ? 34 : 18}
          maxZoom={mode === 'bird' ? 140 : 180}
          minDistance={0.7}
          maxDistance={14}
          draggingSmoothTime={0.08}
          azimuthRotateSpeed={mode === 'bird' ? 0 : 0.72}
          polarRotateSpeed={mode === 'bird' ? 0 : 0.72}
          truckSpeed={mode === 'bird' ? 1.15 : 0.95}
          dollySpeed={1.25}
        />
      ) : null}
    </>
  )
}

function PovMovementController({ enabled }: { enabled: boolean }) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const room = useRoomStore((state) => state.room)
  const moveRef = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
  })
  const lookRef = useRef({
    dragging: false,
    pointerId: -1,
    yaw: 0,
    pitch: -0.1,
  })

  useEffect(() => {
    if (!enabled) {
      moveRef.current = { forward: false, back: false, left: false, right: false }
      return
    }

    camera.position.set(0, POV_EYE_HEIGHT_M, 1.7)
    lookRef.current.yaw = 0
    lookRef.current.pitch = -0.1
    camera.lookAt(0, 1.45, -1)
    invalidate()
  }, [camera, enabled, invalidate])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const keys = new Map<string, keyof typeof moveRef.current>([
      ['KeyW', 'forward'],
      ['ArrowUp', 'forward'],
      ['KeyS', 'back'],
      ['ArrowDown', 'back'],
      ['KeyA', 'left'],
      ['ArrowLeft', 'left'],
      ['KeyD', 'right'],
      ['ArrowRight', 'right'],
    ])

    const setKey = (event: KeyboardEvent, active: boolean) => {
      const key = keys.get(event.code)
      if (!key) {
        return
      }

      event.preventDefault()
      moveRef.current[key] = active
      invalidate()
    }

    const handleKeyDown = (event: KeyboardEvent) => setKey(event, true)
    const handleKeyUp = (event: KeyboardEvent) => setKey(event, false)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const element = gl.domElement

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.target !== element) {
        return
      }

      lookRef.current.dragging = true
      lookRef.current.pointerId = event.pointerId
      element.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const state = lookRef.current
      if (!state.dragging || state.pointerId !== event.pointerId) {
        return
      }

      state.yaw -= event.movementX * POV_LOOK_SPEED
      state.pitch = Math.max(-0.82, Math.min(0.58, state.pitch - event.movementY * POV_LOOK_SPEED))
      invalidate()
    }

    const finishPointer = (event: PointerEvent) => {
      if (lookRef.current.pointerId === event.pointerId && element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId)
      }

      lookRef.current.dragging = false
      lookRef.current.pointerId = -1
    }

    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerup', finishPointer)
    element.addEventListener('pointercancel', finishPointer)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', finishPointer)
      element.removeEventListener('pointercancel', finishPointer)
    }
  }, [enabled, gl, invalidate])

  useFrame((_, delta) => {
    if (!enabled) {
      return
    }

    const look = lookRef.current
    const move = moveRef.current
    const forward = new THREE.Vector3(Math.sin(look.yaw), 0, -Math.cos(look.yaw))
    const right = new THREE.Vector3(Math.cos(look.yaw), 0, Math.sin(look.yaw))
    const direction = new THREE.Vector3()

    if (move.forward) direction.add(forward)
    if (move.back) direction.sub(forward)
    if (move.right) direction.add(right)
    if (move.left) direction.sub(right)

    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(POV_MOVE_SPEED_MPS * Math.min(delta, 0.05))
      camera.position.add(direction)
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -room.widthM / 2 + 0.28, room.widthM / 2 - 0.28)
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -room.depthM / 2 + 0.28, room.depthM / 2 - 0.28)
      invalidate()
    }

    camera.position.y = POV_EYE_HEIGHT_M
    const cosPitch = Math.cos(look.pitch)
    const target = new THREE.Vector3(
      camera.position.x + Math.sin(look.yaw) * cosPitch,
      camera.position.y + Math.sin(look.pitch),
      camera.position.z - Math.cos(look.yaw) * cosPitch,
    )
    camera.lookAt(target)
  })

  return null
}

export function IsometricScene({ className }: Props) {
  const editMode = useEditorObjectsStore((state) => state.editMode)
  const activeDragMode = useEditorObjectsStore((state) => state.activeDragMode)
  const setEditMode = useEditorObjectsStore((state) => state.setEditMode)
  const setActiveDragMode = useEditorObjectsStore((state) => state.setActiveDragMode)
  const quality = useRenderQualityStore((state) => state.quality)
  const lightingPreset = useLightingPresetStore((state) => state.preset)
  const viewMode = useCameraViewStore((state) => state.mode)
  const setCatalog = useUiStore((state) => state.setCatalog)
  const select = useSelectionStore((state) => state.select)
  const cameraEnabled = viewMode !== 'pov' && editMode === 'idle' && activeDragMode === null
  const editControlsEnabled = viewMode !== 'pov'
  const gridActive = editControlsEnabled && (editMode !== 'idle' || activeDragMode !== null)
  const renderSettings = renderQualitySettings[quality]
  const contactSettings = contactShadowPresetSettings[lightingPreset]

  useEffect(() => {
    if (viewMode !== 'pov') {
      return
    }

    setEditMode('idle')
    setActiveDragMode(null)
    setCatalog(false)
    select(null)
  }, [select, setActiveDragMode, setCatalog, setEditMode, viewMode])

  const clearSelection = () => {
    setEditMode('idle')
    setActiveDragMode(null)
    select(null)
  }

  return (
    <>
      <Canvas
        className={className}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        dpr={renderSettings.dpr}
        frameloop="demand"
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.04
          scene.fog = new THREE.Fog(color.scene.bg, 12, 20)
        }}
        onPointerMissed={(event) => {
          if (event.button === 0) {
            clearSelection()
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: color.scene.bg,
          touchAction: 'none',
        }}
      >
        <color attach="background" args={[color.scene.bg]} />

        <AdaptiveQuality />
        <WebglLifecycleGuard />
        <RendererStatsBridge quality={quality} />
        <EditorInteractionLayers />
        {viewMode !== 'pov' ? <SceneGrid active={gridActive} onClearSelection={clearSelection} /> : null}
        <CameraRig mode={viewMode} cameraEnabled={cameraEnabled} />
        <PovMovementController enabled={viewMode === 'pov'} />

        <Lighting quality={quality} />

        <AssetRoom
          interactionEnabled
          onClearSelection={clearSelection}
        />
        <SelectionGizmos />
        {editControlsEnabled ? <PlacementHandlers /> : <PlacementHandlers variant="pov-move" />}

        <ContactShadows
          position={[0, 0.012, 0]}
          opacity={renderSettings.contactOpacity * contactSettings.opacityScale}
          blur={contactSettings.blur}
          scale={8}
          resolution={CONTACT_SHADOW_RESOLUTION}
          far={contactSettings.far}
          color="#000000"
        />

        <ScenePostProcessing quality={quality} />
      </Canvas>
    </>
  )
}
