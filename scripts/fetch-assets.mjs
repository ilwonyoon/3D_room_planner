import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const POLY_HAVEN_USER_AGENT = 'pocketroom-asset-pipeline/0.1 (local development)'
const SHARE_TEXTURES_BASE_URL = 'https://files.sharetextures.com/file/Share-Textures'

const fetchScope = new Set(
  (process.env.ASSET_FETCH_SCOPE ?? 'all')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean),
)

const shouldFetch = (scope) => fetchScope.has('all') || fetchScope.has(scope)

const wallMaterialIds = [
  'Wallpaper001A',
  'Wallpaper002A',
  'Wallpaper001B',
  'Wallpaper001C',
  'Wallpaper002B',
  'Wallpaper002C',
  'Plaster001',
  'Plaster002',
  'Plaster003',
  'Plaster007',
]

const floorMaterialIds = [
  'WoodFloor051',
  'WoodFloor064',
  'Concrete048',
  'Concrete047A',
  'Carpet016',
  'WoodFloor070',
  'WoodFloor071',
  'WoodFloor069',
  'WoodFloor007',
  'WoodFloor062',
]

const ambientCgMaterials = [
  ...wallMaterialIds.map((id) => ({
    id,
    group: 'walls',
    url: `https://ambientcg.com/get?file=${id}_1K-JPG.zip`,
    archive: `/tmp/${id}_1K-JPG.zip`,
    target: join(ROOT, `raw/assets/textures/walls/${id}`),
    keep: (name) => name.endsWith('.jpg') || name.endsWith('.json'),
  })),
  ...floorMaterialIds.map((id) => ({
    id,
    group: 'floors',
    url: `https://ambientcg.com/get?file=${id}_1K-JPG.zip`,
    archive: `/tmp/${id}_1K-JPG.zip`,
    target: join(ROOT, `raw/assets/textures/floors/${id}`),
    keep: (name) => name.endsWith('.jpg') || name.endsWith('.json'),
  })),
]

const downloads = [
  {
    url: 'https://ambientcg.com/get?file=WoodFloor051_2K-JPG.zip',
    archive: '/tmp/WoodFloor051_2K-JPG.zip',
    target: join(ROOT, 'raw/assets/textures/wood-floor-051'),
    keep: (name) => name.endsWith('.jpg'),
  },
  {
    url: 'https://ambientcg.com/get?file=PaintedPlaster017_2K-JPG.zip',
    archive: '/tmp/PaintedPlaster017_2K-JPG.zip',
    target: join(ROOT, 'raw/assets/textures/painted-plaster-017'),
    keep: (name) => name.endsWith('.jpg'),
  },
  ...ambientCgMaterials,
]

const basePolyHavenModels = [
  'ArmChair_01',
  'BarberShopChair_01',
  'ClassicConsole_01',
  'ClassicNightstand_01',
  'CoffeeCart_01',
  'CoffeeTable_01',
  'GothicBed_01',
  'GothicCabinet_01',
  'GothicCommode_01',
  'GreenChair_01',
  'Ottoman_01',
  'Rockingchair_01',
  'SchoolChair_01',
  'SchoolDesk_01',
  'Shelf_01',
  'Sofa_01',
  'WoodenChair_01',
  'WoodenTable_01',
  'WoodenTable_02',
  'WoodenTable_03',
  'bar_chair_round_01',
  'chinese_armchair',
  'chinese_cabinet',
  'chinese_commode',
  'chinese_console_table',
  'chinese_screen_panels',
  'chinese_sofa',
  'chinese_stool',
  'chinese_tea_table',
  'coffee_table_round_01',
  'dining_chair_02',
  'drawer_cabinet',
  'folding_wooden_stool',
  'gallinera_chair',
  'gallinera_table',
  'gothic_coffee_table',
  'industrial_coffee_table',
  'metal_office_desk',
  'metal_stool_01',
  'metal_stool_02',
  'mid_century_lounge_chair',
  'modern_arm_chair_01',
  'modern_coffee_table_01',
  'modern_coffee_table_02',
  'modern_wooden_cabinet',
  'ornate_mirror_01',
  'side_table_01',
  'side_table_tall_01',
  'outdoor_table_chair_set_01',
  'painted_wooden_bench',
  'painted_wooden_cabinet',
  'painted_wooden_cabinet_02',
  'painted_wooden_chair_01',
  'painted_wooden_chair_02',
  'painted_wooden_nightstand',
  'painted_wooden_shelves',
  'painted_wooden_sofa',
  'painted_wooden_stool',
  'painted_wooden_table',
  'plastic_monobloc_chair_01',
  'round_wooden_table_01',
  'round_wooden_table_02',
  'small_wooden_table_01',
  'sofa_02',
  'sofa_03',
  'steel_frame_shelves_01',
  'steel_frame_shelves_02',
  'steel_frame_shelves_03',
  'vintage_cabinet_01',
  'vintage_wooden_drawer_01',
  'wooden_bookshelf_worn',
  'wooden_display_shelves_01',
  'wooden_picnic_table',
  'wooden_stool_01',
  'wooden_stool_02',
  'wooden_table_02',
  'caged_hanging_light',
  'desk_lamp_arm_01',
  'hanging_industrial_lamp',
  'industrial_pipe_lamp',
  'industrial_wall_lamp',
  'industrial_wall_sconce',
  'modern_ceiling_lamp_01',
  'potted_plant_01',
  'potted_plant_02',
  'potted_plant_04',
]

const environmentPolyHavenModels = [
  'fancy_picture_frame_01',
  'fancy_picture_frame_02',
  'hanging_picture_frame_01',
  'hanging_picture_frame_02',
  'hanging_picture_frame_03',
  'standing_picture_frame_01',
  'standing_picture_frame_02',
  'vintage_telephone_wall_clock',
  'mantel_clock_01',
  'alarm_clock_01',
  'book_encyclopedia_set_01',
  'ceramic_vase_01',
  'ceramic_vase_02',
  'ceramic_vase_03',
  'ceramic_vase_04',
  'brass_vase_01',
  'brass_vase_02',
  'brass_vase_03',
  'brass_vase_04',
  'planter_box_01',
  'planter_box_02',
  'planter_box_03',
  'planter_pot_clay',
  'pachira_aquatica_01',
  'dartboard',
  'large_castle_door',
  'rollershutter_door',
  'rollershutter_window_01',
  'rollershutter_window_02',
  'rollershutter_window_03',
]

const polyHavenModels = [...new Set([...basePolyHavenModels, ...environmentPolyHavenModels])]

const hdris = [
  {
    id: 'poly_haven_studio',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/poly_haven_studio_1k.hdr',
    target: join(ROOT, 'raw/assets/hdri/poly_haven_studio_1k.hdr'),
  },
]

const khronosModels = [
  {
    id: 'sheen-chair',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF-Binary/SheenChair.glb',
  },
  {
    id: 'sheen-wood-leather-sofa',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenWoodLeatherSofa/glTF-Binary/SheenWoodLeatherSofa.glb',
  },
]

const shareTexturesModels = [
  { id: 'sharetextures-chair-25', slug: 'chair-25', fileStem: 'chair_25' },
  { id: 'sharetextures-chair-26', slug: 'chair-26', fileStem: 'chair_26' },
  { id: 'sharetextures-chair-27', slug: 'chair-27', fileStem: 'chair_27' },
  { id: 'sharetextures-chair-28', slug: 'chair-28', fileStem: 'chair_28' },
  { id: 'sharetextures-chair-29', slug: 'chair-29', fileStem: 'chair_29' },
  { id: 'sharetextures-bench-32', slug: 'bench-32', fileStem: 'bench_32' },
  { id: 'sharetextures-cabinet-3', slug: 'cabinet-3', fileStem: 'cabinet_3' },
  { id: 'sharetextures-stool-5', slug: 'stool-5', fileStem: 'stool_5' },
  { id: 'sharetextures-stool-7', slug: 'stool-7', fileStem: 'stool_7' },
  { id: 'sharetextures-stool-8', slug: 'stool-8', fileStem: 'stool_8' },
]

const objaverseModels = [
  {
    id: 'objaverse-messy-bed-2',
    uid: 'a2b2645701c94fa49e65661806219c6b',
    objectPath: 'glbs/000-114/a2b2645701c94fa49e65661806219c6b.glb',
    source: 'https://sketchfab.com/3d-models/a2b2645701c94fa49e65661806219c6b',
    title: 'Messy bed 2.0 (with wall mounted backboard)',
    author: 'thethieme',
    authorUrl: 'https://sketchfab.com/thethieme',
  },
  {
    id: 'objaverse-soho-bed',
    uid: '97e361e8beda4112ac5b1b5bcd388cdf',
    objectPath: 'glbs/000-043/97e361e8beda4112ac5b1b5bcd388cdf.glb',
    source: 'https://sketchfab.com/3d-models/97e361e8beda4112ac5b1b5bcd388cdf',
    title: 'Soho bed - 3D Model',
    author: 'BertO',
    authorUrl: 'https://sketchfab.com/bertosalotti',
  },
  {
    id: 'objaverse-chelsea-storage-bed',
    uid: 'cbe6e0dcc10a414a84acc5cc08171b87',
    objectPath: 'glbs/000-115/cbe6e0dcc10a414a84acc5cc08171b87.glb',
    source: 'https://sketchfab.com/3d-models/cbe6e0dcc10a414a84acc5cc08171b87',
    title: 'Chelsea bed with storage - 3D Model',
    author: 'BertO',
    authorUrl: 'https://sketchfab.com/bertosalotti',
  },
  {
    id: 'objaverse-bed-0101',
    uid: '5633ff2f729142bebf6b304118647f6f',
    objectPath: 'glbs/000-113/5633ff2f729142bebf6b304118647f6f.glb',
    source: 'https://sketchfab.com/3d-models/5633ff2f729142bebf6b304118647f6f',
    title: 'bed.0101',
    author: 'Elo.Q..Pereira',
    authorUrl: 'https://sketchfab.com/Elo.Q..Pereira',
  },
  {
    id: 'objaverse-king-floor-bed',
    uid: '6ee7831cc521471384191baea365e211',
    objectPath: 'glbs/000-114/6ee7831cc521471384191baea365e211.glb',
    source: 'https://sketchfab.com/3d-models/6ee7831cc521471384191baea365e211',
    title: 'King Floor Bed',
    author: 'Jakoza',
    authorUrl: 'https://sketchfab.com/Moe.T',
  },
  {
    id: 'objaverse-large-grantham-bed',
    uid: '203cfdb977ef4caab19d3b35fd8b3c42',
    objectPath: 'glbs/000-037/203cfdb977ef4caab19d3b35fd8b3c42.glb',
    source: 'https://sketchfab.com/3d-models/203cfdb977ef4caab19d3b35fd8b3c42',
    title: 'Large Bed - Grantham Dantone Bed',
    author: 'Lahcen.el',
    authorUrl: 'https://sketchfab.com/Lahcen.el',
  },
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

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': POLY_HAVEN_USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.json()
}

function download(url, target) {
  ensureDir(dirname(target))
  run('curl', ['-L', '-A', POLY_HAVEN_USER_AGENT, url, '-o', target])
}

if (shouldFetch('textures')) {
  for (const download of downloads) {
    ensureDir(download.target)
    rmSync(download.target, { recursive: true, force: true })
    ensureDir(download.target)

    run('curl', ['-L', download.url, '-o', download.archive])
    run('unzip', ['-o', download.archive, '-d', download.target])

    for (const name of readdirSync(download.target)) {
      if (!download.keep(name)) {
        rmSync(join(download.target, name), { recursive: true, force: true })
      }
    }
  }
}

if (shouldFetch('khronos')) {
  for (const model of khronosModels) {
    const modelTarget = join(ROOT, `raw/assets/models/${model.id}.glb`)
    ensureDir(dirname(modelTarget))

    if (!existsSync(modelTarget)) {
      download(model.url, modelTarget)
    }
  }
}

if (shouldFetch('hdri')) {
  for (const hdri of hdris) {
    download(hdri.url, hdri.target)
  }
}

if (shouldFetch('polyhaven')) {
  for (const assetId of polyHavenModels) {
    const files = await fetchJson(`https://api.polyhaven.com/files/${assetId}`)
    const gltf = files.gltf?.['1k']?.gltf

    if (!gltf) {
      throw new Error(`No 1K glTF package found for ${assetId}`)
    }

    const targetDir = join(ROOT, `raw/assets/models/polyhaven/${assetId}`)
    rmSync(targetDir, { recursive: true, force: true })
    ensureDir(targetDir)

    download(gltf.url, join(targetDir, `${assetId}_1k.gltf`))

    for (const [relativePath, include] of Object.entries(gltf.include)) {
      download(include.url, join(targetDir, relativePath))
    }

    writeFileSync(
      join(targetDir, 'source.json'),
      JSON.stringify(
        {
          assetId,
          source: `https://polyhaven.com/a/${assetId}`,
          license: 'CC0',
          gltf: gltf.url,
        },
        null,
        2,
      ),
    )
  }
}

if (shouldFetch('sharetextures')) {
  for (const model of shareTexturesModels) {
    const targetDir = join(ROOT, `raw/assets/models/sharetextures/${model.id}`)
    const archive = join(targetDir, 'textures-1k.zip')
    const textureDir = join(targetDir, `3D_${model.fileStem}/1K`)

    rmSync(targetDir, { recursive: true, force: true })
    ensureDir(targetDir)

    download(`${SHARE_TEXTURES_BASE_URL}/3D_${model.fileStem}.fbx`, join(targetDir, 'model.fbx'))
    download(`${SHARE_TEXTURES_BASE_URL}/3D_${model.fileStem}-1K.zip`, archive)

    ensureDir(textureDir)
    run('unzip', ['-o', archive, '-d', textureDir])

    writeFileSync(
      join(targetDir, 'source.json'),
      JSON.stringify(
        {
          assetId: model.id,
          source: `https://www.sharetextures.com/models/furniture/${model.slug}`,
          license: 'CC0',
          fbx: `${SHARE_TEXTURES_BASE_URL}/3D_${model.fileStem}.fbx`,
          textures: `${SHARE_TEXTURES_BASE_URL}/3D_${model.fileStem}-1K.zip`,
        },
        null,
        2,
      ),
    )
  }
}

if (shouldFetch('objaverse')) {
  for (const model of objaverseModels) {
    const targetDir = join(ROOT, `raw/assets/models/objaverse/${model.id}`)
    const sourceGlb = join(targetDir, 'source.glb')
    const glbUrl = `https://huggingface.co/datasets/allenai/objaverse/resolve/main/${model.objectPath}`

    rmSync(targetDir, { recursive: true, force: true })
    ensureDir(targetDir)

    download(glbUrl, sourceGlb)

    writeFileSync(
      join(targetDir, 'source.json'),
      JSON.stringify(
        {
          assetId: model.id,
          uid: model.uid,
          title: model.title,
          source: model.source,
          license: 'CC-BY-4.0',
          author: model.author,
          authorUrl: model.authorUrl,
          glb: glbUrl,
          dataset: 'Objaverse 1.0',
          datasetSource: 'https://huggingface.co/datasets/allenai/objaverse',
        },
        null,
        2,
      ),
    )
  }
}

console.log('Fetched raw source assets.')
