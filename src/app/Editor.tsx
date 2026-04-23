import { IsometricScene } from '@/scene/IsometricScene'
import { EditorTopBar } from '@/ui/EditorTopBar'
import { CatalogSheet } from '@/ui/CatalogSheet'
import { useEditorObjectsStore, usePlacementsStore, useRoomStore, useSelectionStore } from '@/store'
import { StoreDebugBridge } from '@/store/debugStoreBridge'
import { color } from '@/constants'

export function Editor() {
  const resetRoom = useRoomStore((s) => s.reset)
  const clearPlacements = usePlacementsStore((s) => s.clear)
  const resetObjects = useEditorObjectsStore((s) => s.resetObjects)
  const select = useSelectionStore((s) => s.select)

  const handleReset = () => {
    clearPlacements()
    resetObjects()
    resetRoom()
    select(null)
  }

  const handleDone = () => {
    // v1: noop, will persist/share later
    console.log('[Editor] Done pressed')
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: color.scene.bg,
        overflow: 'hidden',
      }}
    >
      <StoreDebugBridge />
      <IsometricScene />
      <EditorTopBar onReset={handleReset} onDone={handleDone} />
      <CatalogSheet />
    </div>
  )
}
