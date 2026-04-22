import { Canvas } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { CameraControls, ContactShadows } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'

import { AssetRoom } from './AssetRoom'
import { Lighting } from './Lighting'
import { SelectionGizmos } from './SelectionGizmos'
import { PlacementHandlers } from '@/ui/PlacementHandlers'
import { color } from '@/constants'
import { useEditorObjectsStore, useSelectionStore } from '@/store'

interface Props {
  className?: string
}

const EDITOR_OVERLAY_LAYER = 1
const RAYCAST_HITBOX_LAYER = 2

function EditorInteractionLayers() {
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    camera.layers.enable(EDITOR_OVERLAY_LAYER)
    raycaster.layers.enable(RAYCAST_HITBOX_LAYER)
    invalidate()

    return () => {
      camera.layers.disable(EDITOR_OVERLAY_LAYER)
      raycaster.layers.disable(RAYCAST_HITBOX_LAYER)
      invalidate()
    }
  }, [camera, invalidate, raycaster])

  return null
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
    const helper = new THREE.GridHelper(18, 48, '#3d3d45', '#28282e')
    helper.position.y = -0.075
    setGridOpacity(helper, 0.24)

    return helper
  }, [])

  useEffect(() => {
    setGridOpacity(grid, active ? 0.56 : 0.24)
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

export function IsometricScene({ className }: Props) {
  const editMode = useEditorObjectsStore((state) => state.editMode)
  const activeDragMode = useEditorObjectsStore((state) => state.activeDragMode)
  const setEditMode = useEditorObjectsStore((state) => state.setEditMode)
  const setActiveDragMode = useEditorObjectsStore((state) => state.setActiveDragMode)
  const select = useSelectionStore((state) => state.select)
  const cameraEnabled = editMode === 'idle' && activeDragMode === null
  const gridActive = editMode !== 'idle' || activeDragMode !== null
  const clearSelection = () => {
    setEditMode('idle')
    setActiveDragMode(null)
    select(null)
  }

  return (
    <Canvas
      className={className}
      shadows
      orthographic
      camera={{
        position: [6.8, 5.9, 6.8],
        zoom: 40,
        near: 0.1,
        far: 100,
      }}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 1.5]}
      frameloop="demand"
      onCreated={({ gl, scene }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
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

      <EditorInteractionLayers />
      <SceneGrid active={gridActive} onClearSelection={clearSelection} />

      <CameraControls
        makeDefault
        enabled={cameraEnabled}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 3}
        minZoom={25}
        maxZoom={80}
        draggingSmoothTime={0.1}
        azimuthRotateSpeed={0.6}
        polarRotateSpeed={0.6}
        truckSpeed={0}
        dollySpeed={1}
      />

      <Lighting />

      <AssetRoom onClearSelection={clearSelection} />
      <SelectionGizmos />
      <PlacementHandlers />

      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={0.28}
        blur={2.2}
        scale={8}
        resolution={512}
        far={2.2}
        color="#000000"
      />

      <EffectComposer multisampling={2} enableNormalPass>
        <N8AO aoRadius={1.6} intensity={1.1} distanceFalloff={0.9} />
        <ToneMapping adaptive />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
