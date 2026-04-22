import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname

const kenneyEnvironmentModels = {
  windows: [
    'wall-window-wide-round-detailed',
    'wall-window-square-detailed',
    'wall-window-wide-square-detailed',
    'wall-window-square',
    'wall-window-wide-round',
    'wall-window-round-detailed',
    'wall-window-wide-square',
    'wall-window-round',
    'barricade-window-a',
    'barricade-window-b',
    'barricade-window-c',
  ],
  doors: [
    'door-rotate-square-a',
    'door-rotate-square-b',
    'door-rotate-square-c',
    'door-rotate-square-d',
    'door-rotate-round-a',
    'door-rotate-round-b',
    'door-rotate-round-c',
    'door-rotate-round-d',
    'wall-doorway-square',
    'wall-doorway-round',
    'wall-doorway-wide-square',
    'wall-doorway-wide-round',
    'barricade-doorway-a',
    'barricade-doorway-b',
    'barricade-doorway-c',
  ],
  shell: [
    'wall',
    'wall-half',
    'wall-low',
    'wall-corner',
    'wall-corner-round',
    'floor',
    'floor-half',
    'floor-quarter',
    'border',
    'border-high',
    'column',
    'column-thin',
    'column-wide',
    'plating',
    'plating-wide',
    'stairs-open',
  ],
}

const kenneyFurnitureModels = [
  'bedBunk',
  'bedDouble',
  'bedSingle',
  'benchCushion',
  'benchCushionLow',
  'bookcaseClosed',
  'bookcaseClosedDoors',
  'bookcaseClosedWide',
  'bookcaseOpen',
  'bookcaseOpenLow',
  'cabinetTelevision',
  'cabinetTelevisionDoors',
  'chairCushion',
  'chairDesk',
  'chairModernCushion',
  'chairModernFrameCushion',
  'chairRounded',
  'coatRackStanding',
  'computerScreen',
  'desk',
  'deskCorner',
  'dryer',
  'hoodModern',
  'kitchenCabinet',
  'kitchenCabinetDrawer',
  'kitchenCabinetUpper',
  'kitchenCabinetUpperDouble',
  'kitchenCabinetUpperLow',
  'kitchenFridge',
  'kitchenFridgeLarge',
  'kitchenMicrowave',
  'kitchenStoveElectric',
  'lampRoundFloor',
  'lampRoundTable',
  'lampSquareCeiling',
  'lampSquareFloor',
  'lampSquareTable',
  'lampWall',
  'laptop',
  'loungeChair',
  'loungeDesignChair',
  'loungeDesignSofa',
  'loungeSofa',
  'loungeSofaLong',
  'loungeSofaOttoman',
  'pillow',
  'pillowLong',
  'plantSmall1',
  'plantSmall2',
  'plantSmall3',
  'pottedPlant',
  'radio',
  'rugRectangle',
  'rugRound',
  'sideTable',
  'sideTableDrawers',
  'speaker',
  'speakerSmall',
  'stoolBar',
  'stoolBarSquare',
  'tableCoffee',
  'tableCoffeeGlass',
  'tableCoffeeGlassSquare',
  'tableCoffeeSquare',
  'tableGlass',
  'tableRound',
  'televisionModern',
  'washer',
  'washerDryerStacked',
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

function hasCommand(command) {
  const result = spawnSync('which', [command], { stdio: 'ignore' })
  return result.status === 0
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function prepareTextureDirectory(source, target, maxSize) {
  if (!existsSync(source)) {
    throw new Error(`Missing texture source: ${source}`)
  }

  rmSync(target, { recursive: true, force: true })
  ensureDir(target)

  for (const file of readdirSync(source).filter((name) => name.endsWith('.jpg'))) {
    const src = join(source, file)
    const dest = join(target, file)

    if (hasCommand('sips')) {
      run('sips', ['-Z', String(maxSize), src, '--out', dest])
    } else {
      cpSync(src, dest)
    }
  }
}

function prepareTextureGroup(sourceRoot, targetRoot, maxSize) {
  if (!existsSync(sourceRoot)) {
    return
  }

  for (const directory of readdirSync(sourceRoot)) {
    const source = join(sourceRoot, directory)
    const target = join(targetRoot, directory)
    prepareTextureDirectory(source, target, maxSize)
  }
}

function prepareTextures() {
  const jobs = [
    {
      source: join(ROOT, 'raw/assets/textures/wood-floor-051'),
      target: join(ROOT, 'public/assets/textures-runtime/wood-floor-051'),
      maxSize: 1024,
    },
    {
      source: join(ROOT, 'raw/assets/textures/painted-plaster-017'),
      target: join(ROOT, 'public/assets/textures-runtime/painted-plaster-017'),
      maxSize: 1024,
    },
  ]

  for (const job of jobs) {
    prepareTextureDirectory(job.source, job.target, job.maxSize)
  }

  prepareTextureGroup(
    join(ROOT, 'raw/assets/textures/walls'),
    join(ROOT, 'public/assets/textures-runtime/walls'),
    1024,
  )
  prepareTextureGroup(
    join(ROOT, 'raw/assets/textures/floors'),
    join(ROOT, 'public/assets/textures-runtime/floors'),
    1024,
  )
}

function optimizeModel(input, output) {
  if (!existsSync(input)) {
    throw new Error(`Missing model source: ${input}`)
  }

  ensureDir(dirname(output))

  run('pnpm', [
    'exec',
    'gltf-transform',
    'optimize',
    input,
    output,
    '--compress',
    'meshopt',
    '--texture-compress',
    'webp',
    '--texture-size',
    '1024',
  ])
}

function prepareModels() {
  const standaloneModels = ['sheen-chair', 'sheen-wood-leather-sofa']

  for (const modelId of standaloneModels) {
    const input = join(ROOT, `raw/assets/models/${modelId}.glb`)
    const output = join(ROOT, `public/assets/models/${modelId}.optimized.glb`)
    optimizeModel(input, output)
  }

  const polyHavenSourceDir = join(ROOT, 'raw/assets/models/polyhaven')
  const polyHavenOutputDir = join(ROOT, 'public/assets/models/polyhaven')

  if (!existsSync(polyHavenSourceDir)) {
    return
  }

  ensureDir(polyHavenOutputDir)

  for (const assetId of readdirSync(polyHavenSourceDir)) {
    const source = join(polyHavenSourceDir, assetId, `${assetId}_1k.gltf`)
    const target = join(polyHavenOutputDir, `${assetId}.optimized.glb`)

    if (!existsSync(source)) {
      continue
    }

    optimizeModel(source, target)
  }

  const kenneySourceDir = join(ROOT, 'raw/assets/kenney/building-kit/Models/GLB format')

  if (!existsSync(kenneySourceDir)) {
    return
  }

  for (const [category, modelIds] of Object.entries(kenneyEnvironmentModels)) {
    for (const modelId of modelIds) {
      const source = join(kenneySourceDir, `${modelId}.glb`)
      const target = join(ROOT, `public/assets/models/environment/${category}/${modelId}.optimized.glb`)
      optimizeModel(source, target)
    }
  }

  const kenneyFurnitureSourceDir = join(ROOT, 'raw/assets/kenney/furniture-kit/Models/GLTF format')

  if (!existsSync(kenneyFurnitureSourceDir)) {
    return
  }

  for (const modelId of kenneyFurnitureModels) {
    const source = join(kenneyFurnitureSourceDir, `${modelId}.glb`)
    const target = join(ROOT, `public/assets/models/kenney/furniture/${modelId}.optimized.glb`)
    optimizeModel(source, target)
  }
}

function prepareHdri() {
  const input = join(ROOT, 'raw/assets/hdri/poly_haven_studio_1k.hdr')
  const output = join(ROOT, 'public/assets/hdri/poly_haven_studio_1k.hdr')

  if (!existsSync(input)) {
    return
  }

  ensureDir(dirname(output))
  cpSync(input, output)
}

prepareTextures()
prepareModels()
prepareHdri()

console.log(`Prepared runtime assets from ${basename(join(ROOT, 'raw'))}/`)
