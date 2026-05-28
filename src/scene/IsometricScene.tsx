import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import {
  CameraControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei'
import type { CameraControls as CameraControlsImpl } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing'

import { AssetRoom } from './AssetRoom'
import { PremiumRoom } from './PremiumRoom'
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
import type { CameraViewMode, RenderQuality } from '@/store'

interface Props {
  className?: string
  /** Visual theme for the scene background + fog + exposure. Default
   *  'dark' preserves the original pocketroom look (matte-black void).
   *  'light' uses a near-white bg for the agent demo where the room
   *  needs to read against a bright UI shell. */
  theme?: 'dark' | 'light'
}

const EDITOR_OVERLAY_LAYER = 1
const RAYCAST_HITBOX_LAYER = 2
const POV_EYE_HEIGHT_M = 1.7
const POV_MOVE_SPEED_MPS = 1.8
const POV_LOOK_SPEED = 0.0042
const webglLifecycleStats = {
  contextLost: 0,
  contextRestored: 0,
}

const renderQualitySettings = {
  low: {
    dpr: [1, 1] as [number, number],
    aoIntensity: 0,
    aoRadius: 1.2,
  },
  medium: {
    dpr: [1, 1] as [number, number],
    aoIntensity: 0,
    aoRadius: 1.25,
  },
  high: {
    dpr: [1.5, 2] as [number, number],
    aoIntensity: 0.42,
    aoRadius: 0.92,
  },
} satisfies Record<
  RenderQuality,
  {
    dpr: [number, number]
    aoIntensity: number
    aoRadius: number
  }
>

function EditorInteractionLayers() {
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
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

  useLayoutEffect(() => {
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

const SCENE_GRID_SIZE = 18
const SCENE_GRID_INNER_FADE_RADIUS = 2.6
const SCENE_GRID_OUTER_FADE_RADIUS = 5.8
// Front-elevation 3D-axon view (per docs/bond-demo/19). Target is the room's
// geometric center; the camera shift in the isometric useEffect handles
// any viewport-centering offset analytically.
const ISOMETRIC_CAMERA_POSITION = new THREE.Vector3(0, 2.4, 3.4)
const ISOMETRIC_CAMERA_TARGET = new THREE.Vector3(0, 1.2, 0.0)
const BIRD_CAMERA_POSITION = new THREE.Vector3(0, 9.4, 0.01)
const BIRD_CAMERA_TARGET = new THREE.Vector3(0, 0, 0)
const ROOM_FRAME_MARGIN_M = 0.06
const ROOM_FRAME_MARGIN_PX = 10

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
       float gridFadeRange = ${(
         SCENE_GRID_OUTER_FADE_RADIUS - SCENE_GRID_INNER_FADE_RADIUS
       ).toFixed(2)};
       float gridFadeProgress = clamp((gridDistance - ${SCENE_GRID_INNER_FADE_RADIUS.toFixed(2)}) / gridFadeRange, 0.0, 1.0);
       float gridFade = pow(1.0 - gridFadeProgress, 1.6);
       diffuseColor.rgb *= gridFade;
       diffuseColor.a *= gridFade;
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
    const helper = new THREE.GridHelper(SCENE_GRID_SIZE, 48, '#565963', '#343741')
    const material = helper.material

    if (Array.isArray(material)) {
      material.forEach(applyGridFadeMask)
    } else {
      applyGridFadeMask(material)
    }

    helper.position.y = -0.075
    setGridOpacity(helper, 0.22)

    return helper
  }, [])

  useEffect(() => {
    setGridOpacity(grid, active ? 0.52 : 0.22)
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

function roomFramePoints(room: { widthM: number; depthM: number; heightM: number }) {
  const halfWidth = room.widthM / 2 + ROOM_FRAME_MARGIN_M
  const halfDepth = room.depthM / 2 + ROOM_FRAME_MARGIN_M
  const minY = -0.1
  const maxY = room.heightM + 0.24

  return [
    new THREE.Vector3(-halfWidth, minY, -halfDepth),
    new THREE.Vector3(halfWidth, minY, -halfDepth),
    new THREE.Vector3(-halfWidth, minY, halfDepth),
    new THREE.Vector3(halfWidth, minY, halfDepth),
    new THREE.Vector3(-halfWidth, maxY, -halfDepth),
    new THREE.Vector3(halfWidth, maxY, -halfDepth),
    new THREE.Vector3(-halfWidth, maxY, halfDepth),
    new THREE.Vector3(halfWidth, maxY, halfDepth),
  ]
}

function calculateOrthographicRoomFrame({
  position,
  baseTarget,
  up,
  room,
  canvasWidth,
  canvasHeight,
  maxZoom,
}: {
  position: THREE.Vector3
  baseTarget: THREE.Vector3
  up: THREE.Vector3
  room: { widthM: number; depthM: number; heightM: number }
  canvasWidth: number
  canvasHeight: number
  maxZoom: number
}) {
  const zAxis = position.clone().sub(baseTarget).normalize()
  const xAxis = up.clone().cross(zAxis).normalize()
  const yAxis = zAxis.clone().cross(xAxis).normalize()
  const points = roomFramePoints(room)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  points.forEach((point) => {
    const relative = point.clone().sub(baseTarget)
    const projectedX = relative.dot(xAxis)
    const projectedY = relative.dot(yAxis)

    minX = Math.min(minX, projectedX)
    maxX = Math.max(maxX, projectedX)
    minY = Math.min(minY, projectedY)
    maxY = Math.max(maxY, projectedY)
  })

  const frameWidth = Math.max(maxX - minX, 0.001)
  const frameHeight = Math.max(maxY - minY, 0.001)
  const usableWidth = Math.max(1, canvasWidth - ROOM_FRAME_MARGIN_PX * 2)
  const usableHeight = Math.max(1, canvasHeight - ROOM_FRAME_MARGIN_PX * 2)
  const zoom = Math.min(
    maxZoom,
    usableWidth / frameWidth,
    usableHeight / frameHeight,
  )
  return { zoom, target: baseTarget.clone() }
}

function CameraRig({
  cameraEnabled,
  mode,
}: {
  cameraEnabled: boolean
  mode: CameraViewMode
}) {
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)
  const room = useRoomStore((state) => state.room)
  const controlsRef = useRef<CameraControlsImpl | null>(null)
  const orthographicRef = useRef<THREE.OrthographicCamera | null>(null)

  // ─────────────────────────────────────────────────────────────────────
  // Camera design contract
  // ─────────────────────────────────────────────────────────────────────
  // Source of truth: CameraControls. Nothing else mutates camera position,
  // target, or zoom outside the initial fit below. The fit runs:
  //   - on first mount (after CameraControls' ref is populated), and
  //   - whenever mode or room dimensions change.
  // It does NOT run on canvas resize or any other reactive trigger, so the
  // user can drag/orbit/zoom freely without the camera snapping back.
  // ─────────────────────────────────────────────────────────────────────
  const initialFitDoneRef = useRef(false)

  const fitView = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return false

    const isBird = mode === 'bird'
    const basePosition = isBird ? BIRD_CAMERA_POSITION : ISOMETRIC_CAMERA_POSITION
    const baseTarget = isBird ? BIRD_CAMERA_TARGET : ISOMETRIC_CAMERA_TARGET
    const up = isBird ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)
    const maxZoom = isBird ? 76 : 240

    // Project the room corners into the camera's projection plane so we
    // can (a) fit zoom to the canvas and (b) shift the target so the
    // projected room center lands at the viewport center.
    const zAxis = basePosition.clone().sub(baseTarget).normalize()
    const xAxis = up.clone().cross(zAxis).normalize()
    const yAxis = zAxis.clone().cross(xAxis).normalize()
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const p of roomFramePoints(room)) {
      const rel = p.clone().sub(baseTarget)
      const px = rel.dot(xAxis)
      const py = rel.dot(yAxis)
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
    }
    const frameWidth = Math.max(maxX - minX, 0.001)
    const frameHeight = Math.max(maxY - minY, 0.001)
    const usableWidth = Math.max(1, size.width - ROOM_FRAME_MARGIN_PX * 2)
    const usableHeight = Math.max(1, size.height - ROOM_FRAME_MARGIN_PX * 2)
    const zoom = Math.min(maxZoom, usableWidth / frameWidth, usableHeight / frameHeight)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const offset = xAxis.clone().multiplyScalar(cx).add(yAxis.clone().multiplyScalar(cy))
    const target = baseTarget.clone().add(offset)
    const position = basePosition.clone().add(offset)

    // CameraControls doesn't track up vector — sync the camera ref's up
    // before any orbit math so polar angles are consistent.
    const cam = orthographicRef.current
    if (cam) cam.up.copy(up)

    void controls
      .setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false)
      .then(() => controls.zoomTo(zoom, false))
      .then(() => invalidate())
      .catch(() => {})
    return true
  }, [invalidate, mode, room, size.width, size.height])

  // Initial fit — runs once per mode/room change. Polls via rAF until
  // CameraControls' ref is populated (it mounts after this component's
  // refs commit), then stops.
  useEffect(() => {
    initialFitDoneRef.current = false
    let raf = 0
    const tryFit = () => {
      if (fitView()) {
        initialFitDoneRef.current = true
        return
      }
      raf = requestAnimationFrame(tryFit)
    }
    tryFit()
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [fitView])

  return (
    <>
      <OrthographicCamera
        ref={orthographicRef}
        makeDefault
        near={0.05}
        far={100}
      />
      <CameraControls
        ref={controlsRef}
        makeDefault
        enabled={cameraEnabled}
        minPolarAngle={mode === 'bird' ? 0 : Math.PI / 8}
        maxPolarAngle={mode === 'bird' ? 0.02 : Math.PI / 2.22}
        minZoom={mode === 'bird' ? 34 : 18}
        maxZoom={mode === 'bird' ? 180 : 320}
        minDistance={0.7}
        maxDistance={14}
        draggingSmoothTime={0.08}
        azimuthRotateSpeed={mode === 'bird' ? 0 : 0.72}
        polarRotateSpeed={mode === 'bird' ? 0 : 0.72}
        truckSpeed={mode === 'bird' ? 1.15 : 0.72}
        dollySpeed={1.25}
      />
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

export function IsometricScene({ className, theme = 'dark' }: Props) {
  // Theme-derived scene parameters. Light theme: white bg, pushed-out
  // fog (gear isn't fade-clipped), lower tonemap exposure so PBR mesh
  // doesn't blow out against the bright background.
  const sceneBg = theme === 'light' ? color.scene.bgLight : color.scene.bg
  const fogNear = theme === 'light' ? 20 : 12
  const fogFar = theme === 'light' ? 40 : 20
  const toneExposure = theme === 'light' ? 0.9 : 1.04
  const editMode = useEditorObjectsStore((state) => state.editMode)
  const activeDragMode = useEditorObjectsStore((state) => state.activeDragMode)
  const setEditMode = useEditorObjectsStore((state) => state.setEditMode)
  const setActiveDragMode = useEditorObjectsStore((state) => state.setActiveDragMode)
  const quality = useRenderQualityStore((state) => state.quality)
  const viewMode = useCameraViewStore((state) => state.mode)
  const setCatalog = useUiStore((state) => state.setCatalog)
  const select = useSelectionStore((state) => state.select)
  const cameraEnabled = viewMode !== 'pov' && editMode === 'idle' && activeDragMode === null
  const editControlsEnabled = viewMode !== 'pov'
  const gridActive = editControlsEnabled && (editMode !== 'idle' || activeDragMode !== null)
  const renderSettings = renderQualitySettings[quality]

  useEffect(() => {
    if (viewMode !== 'pov') {
      return
    }

    setEditMode('idle')
    setActiveDragMode(null)
    setCatalog(false)
  }, [setActiveDragMode, setCatalog, setEditMode, viewMode])

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
          gl.toneMappingExposure = toneExposure
          scene.fog = new THREE.Fog(sceneBg, fogNear, fogFar)
        }}
        onPointerMissed={(event) => {
          if (event.button === 0) {
            clearSelection()
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: sceneBg,
          touchAction: 'none',
        }}
      >
        <color attach="background" args={[sceneBg]} />

        <WebglLifecycleGuard />
        <RendererStatsBridge quality={quality} />
        <EditorInteractionLayers />
        {/* SceneGrid disabled for bathroom MVP — the floor-extending grid
            was overflowing the canvas and making the room look biased
            toward the top of the viewport. Background is a flat surface
            color from the Canvas style. */}
        {/* {viewMode !== 'pov' ? <SceneGrid active={gridActive} onClearSelection={clearSelection} /> : null} */}
        <CameraRig mode={viewMode} cameraEnabled={cameraEnabled} />
        <PovMovementController enabled={viewMode === 'pov'} />

        <Lighting quality={quality} />

        {/* Bathroom shell (walls + floor + textures). AssetRoom owns
            object mounting + interaction, but its old living-room shell
            is disabled (see AssetRoom.tsx). */}
        <PremiumRoom />
        <AssetRoom
          interactionEnabled
          onClearSelection={clearSelection}
        />
        <SelectionGizmos />
        {editControlsEnabled ? <PlacementHandlers /> : <PlacementHandlers variant="pov-move" />}

        <ScenePostProcessing quality={quality} />
      </Canvas>
    </>
  )
}
