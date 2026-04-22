import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const modelDirs = [
  join(ROOT, 'public/assets/models'),
  join(ROOT, 'public/assets/models/polyhaven'),
]

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

for (const dir of modelDirs) {
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.glb')).sort()) {
    run('pnpm', ['exec', 'gltf-transform', 'inspect', join(dir, file)])
  }
}
