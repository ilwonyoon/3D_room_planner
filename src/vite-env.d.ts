/// <reference types="vite/client" />

type PocketRoomRenderStats = {
  cameraMode: string
  lightingPreset: string
  quality: string
  dpr: number
  canvas: { width: number; height: number }
  camera: { type: string; position: number[] }
  memory: { geometries: number; textures: number }
  render: {
    frame: number
    calls: number
    triangles: number
    points: number
    lines: number
  }
  sceneChildren: number
}

interface Window {
  __pocketroomRenderStats?: PocketRoomRenderStats
}
