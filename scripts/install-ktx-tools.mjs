import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const VERSION = '4.4.2'
const TOOL_ROOT = path.join(ROOT, 'tools/ktx')
const DOWNLOAD_ROOT = path.join(ROOT, 'tools/.downloads')
const EXPANDED_ROOT = path.join(DOWNLOAD_ROOT, 'ktx-pkg-expanded')
const BIN_DIR = path.join(TOOL_ROOT, 'bin')
const LIB_DIR = path.join(TOOL_ROOT, 'lib')
const TOKTX = path.join(BIN_DIR, 'toktx')

function commandEnv() {
  return {
    ...process.env,
    DYLD_LIBRARY_PATH: `${LIB_DIR}:${process.env.DYLD_LIBRARY_PATH ?? ''}`,
    LD_LIBRARY_PATH: `${LIB_DIR}:${process.env.LD_LIBRARY_PATH ?? ''}`,
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: commandEnv(),
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function canRunToktx() {
  if (!existsSync(TOKTX)) {
    return false
  }

  const result = spawnSync(TOKTX, ['--version'], {
    cwd: ROOT,
    env: commandEnv(),
    stdio: 'ignore',
    shell: false,
  })

  return result.status === 0
}

function darwinAssetName() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64'
  return `KTX-Software-${VERSION}-Darwin-${arch}.pkg`
}

function findPackagePayload(expandedRoot, packageSuffix) {
  const packageDirectory = readdirSync(expandedRoot)
    .filter((name) => name.endsWith(packageSuffix))
    .map((name) => path.join(expandedRoot, name))[0]

  if (!packageDirectory) {
    throw new Error(`Could not find ${packageSuffix} in expanded KTX package.`)
  }

  return path.join(packageDirectory, 'Payload', 'usr', 'local')
}

function installDarwinTools() {
  const asset = darwinAssetName()
  const packagePath = path.join(DOWNLOAD_ROOT, asset)
  const url = `https://github.com/KhronosGroup/KTX-Software/releases/download/v${VERSION}/${asset}`

  mkdirSync(DOWNLOAD_ROOT, { recursive: true })
  run('curl', ['-L', '--fail', '-o', packagePath, url])

  rmSync(EXPANDED_ROOT, { recursive: true, force: true })
  run('pkgutil', ['--expand-full', packagePath, EXPANDED_ROOT])

  const toolsPayload = findPackagePayload(EXPANDED_ROOT, '-tools.pkg')
  const libraryPayload = findPackagePayload(EXPANDED_ROOT, '-library.pkg')

  rmSync(TOOL_ROOT, { recursive: true, force: true })
  mkdirSync(BIN_DIR, { recursive: true })
  mkdirSync(LIB_DIR, { recursive: true })

  for (const binary of ['ktx', 'ktx2check', 'ktx2ktx2', 'ktxinfo', 'ktxsc', 'toktx']) {
    copyFileSync(path.join(toolsPayload, 'bin', binary), path.join(BIN_DIR, binary))
    run('chmod', ['+x', path.join(BIN_DIR, binary)])
  }

  copyFileSync(
    path.join(libraryPayload, 'lib', `libktx.${VERSION}.dylib`),
    path.join(LIB_DIR, `libktx.${VERSION}.dylib`),
  )

  const symlinkPath = path.join(LIB_DIR, 'libktx.4.dylib')
  if (existsSync(symlinkPath)) {
    unlinkSync(symlinkPath)
  }
  symlinkSync(`libktx.${VERSION}.dylib`, symlinkPath)
}

if (canRunToktx()) {
  run(TOKTX, ['--version'])
  process.exit(0)
}

if (process.platform !== 'darwin') {
  throw new Error('Local KTX tool installer currently supports macOS. Install KTX-Software manually on this platform.')
}

installDarwinTools()
run(TOKTX, ['--version'])
