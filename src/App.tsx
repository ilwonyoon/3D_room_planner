import { Editor } from '@/app/Editor'
import { LiquidGlassCursor } from '@/ui/LiquidGlassCursor'
import { PhoneFrame } from '@/ui/PhoneFrame'

export default function App() {
  return (
    <>
      <PhoneFrame>
        <Editor />
      </PhoneFrame>
      <LiquidGlassCursor />
    </>
  )
}
