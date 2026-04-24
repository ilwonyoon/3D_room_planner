import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const ROOT = new URL('..', import.meta.url).pathname
const outputDir = join(ROOT, 'raw/assets/models/architectural')

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }

  async readAsDataURL(blob) {
    const buffer = Buffer.from(await blob.arrayBuffer())
    this.result = `data:${blob.type};base64,${buffer.toString('base64')}`
    this.onloadend?.()
  }
}

const materials = {
  whiteFrame: new THREE.MeshStandardMaterial({
    name: 'warm white powder-coated frame',
    color: '#f2f1ec',
    roughness: 0.55,
    metalness: 0.05,
  }),
  darkFrame: new THREE.MeshStandardMaterial({
    name: 'matte charcoal frame',
    color: '#202428',
    roughness: 0.62,
    metalness: 0.1,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    name: 'soft blue architectural glass',
    color: '#b9d7e3',
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.48,
    transmission: 0.18,
  }),
  whiteDoor: new THREE.MeshStandardMaterial({
    name: 'satin white door slab',
    color: '#f7f6f1',
    roughness: 0.6,
    metalness: 0.02,
  }),
  oak: new THREE.MeshStandardMaterial({
    name: 'light oak veneer',
    color: '#c79563',
    roughness: 0.72,
    metalness: 0,
  }),
  shadowLine: new THREE.MeshStandardMaterial({
    name: 'recess shadow line',
    color: '#4f565b',
    roughness: 0.7,
    metalness: 0,
  }),
  metal: new THREE.MeshStandardMaterial({
    name: 'brushed steel hardware',
    color: '#c7c9c8',
    roughness: 0.34,
    metalness: 0.8,
  }),
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function addBox(group, name, size, position, material, rounded = false) {
  const geometry = rounded
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(size[0], size[1], size[2]) * 0.22)
    : new THREE.BoxGeometry(size[0], size[1], size[2])
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  group.add(mesh)
  return mesh
}

function addCylinder(group, name, radius, depth, position, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material)
  mesh.name = name
  mesh.rotation.x = Math.PI / 2
  mesh.position.set(...position)
  group.add(mesh)
  return mesh
}

function addFrame(group, width, height, depth, rail, material, namePrefix = 'frame') {
  addBox(group, `${namePrefix} top rail`, [width, rail, depth], [0, height - rail / 2, 0], material, true)
  addBox(group, `${namePrefix} bottom rail`, [width, rail, depth], [0, rail / 2, 0], material, true)
  addBox(group, `${namePrefix} left stile`, [rail, height, depth], [-width / 2 + rail / 2, height / 2, 0], material, true)
  addBox(group, `${namePrefix} right stile`, [rail, height, depth], [width / 2 - rail / 2, height / 2, 0], material, true)
}

function addGlass(group, name, width, height, position, depth = 0.018) {
  addBox(group, name, [width, height, depth], position, materials.glass)
}

function createWidePictureWindow() {
  const group = new THREE.Group()
  addFrame(group, 1.82, 1.34, 0.12, 0.1, materials.whiteFrame, 'outer frame')
  addBox(group, 'interior sill apron', [1.9, 0.05, 0.16], [0, 0.08, 0.028], materials.whiteFrame, true)
  addGlass(group, 'insulated fixed glass unit', 1.58, 1.06, [0, 0.67, -0.022], 0.022)
  addFrame(group, 1.66, 1.14, 0.075, 0.035, materials.whiteFrame, 'interior stop')
  addBox(group, 'left gasket', [0.012, 1.04, 0.024], [-0.76, 0.67, 0.006], materials.shadowLine, true)
  addBox(group, 'right gasket', [0.012, 1.04, 0.024], [0.76, 0.67, 0.006], materials.shadowLine, true)
  addBox(group, 'head gasket', [1.54, 0.012, 0.024], [0, 1.19, 0.006], materials.shadowLine, true)
  addBox(group, 'sill gasket', [1.54, 0.012, 0.024], [0, 0.15, 0.006], materials.shadowLine, true)
  return group
}

function createSlidingWindow() {
  const group = new THREE.Group()
  addFrame(group, 1.82, 1.36, 0.12, 0.09, materials.whiteFrame, 'outer frame')
  addBox(group, 'interior sill extension', [1.88, 0.05, 0.17], [0, 0.09, 0.03], materials.whiteFrame, true)
  addBox(group, 'rear track', [1.56, 0.024, 0.028], [0, 0.16, -0.018], materials.darkFrame, true)
  addBox(group, 'front track', [1.56, 0.024, 0.028], [0, 0.16, 0.018], materials.darkFrame, true)

  const leftSash = new THREE.Group()
  addFrame(leftSash, 0.83, 1.08, 0.06, 0.05, materials.whiteFrame, 'left sash')
  addGlass(leftSash, 'left sash glass', 0.68, 0.92, [0, 0.54, -0.012], 0.02)
  leftSash.position.set(-0.43, 0.14, -0.016)
  group.add(leftSash)

  const rightSash = new THREE.Group()
  addFrame(rightSash, 0.83, 1.08, 0.06, 0.05, materials.whiteFrame, 'right sash')
  addGlass(rightSash, 'right sash glass', 0.68, 0.92, [0, 0.54, -0.012], 0.02)
  rightSash.position.set(0.33, 0.14, 0.01)
  group.add(rightSash)

  addBox(group, 'meeting rail left', [0.042, 0.98, 0.068], [-0.04, 0.68, 0.004], materials.whiteFrame, true)
  addBox(group, 'meeting rail right', [0.042, 0.98, 0.068], [0.04, 0.68, -0.01], materials.whiteFrame, true)
  addBox(group, 'sliding pull left', [0.028, 0.22, 0.028], [-0.09, 0.66, 0.06], materials.metal, true)
  addBox(group, 'sliding pull right', [0.028, 0.22, 0.028], [0.09, 0.66, 0.032], materials.metal, true)
  return group
}

function createTallCasementWindow() {
  const group = new THREE.Group()
  addFrame(group, 0.92, 1.54, 0.13, 0.09, materials.whiteFrame, 'outer frame')
  addBox(group, 'interior stool', [0.98, 0.05, 0.17], [0, 0.09, 0.028], materials.whiteFrame, true)

  const sash = new THREE.Group()
  addFrame(sash, 0.7, 1.3, 0.065, 0.05, materials.whiteFrame, 'casement sash')
  addGlass(sash, 'casement insulated glass', 0.56, 1.14, [0, 0.65, -0.012], 0.02)
  sash.position.set(-0.02, 0.12, 0.004)
  sash.rotation.y = -0.14
  group.add(sash)

  addBox(group, 'operator cover', [0.08, 0.03, 0.09], [0.16, 0.14, 0.056], materials.whiteFrame, true)
  addBox(group, 'folding crank handle', [0.16, 0.018, 0.024], [0.24, 0.14, 0.082], materials.metal, true)
  addCylinder(group, 'hinge top', 0.012, 0.05, [-0.36, 1.34, 0.058], materials.metal)
  addCylinder(group, 'hinge bottom', 0.012, 0.05, [-0.36, 0.2, 0.058], materials.metal)
  return group
}

function createSquareAwningWindow() {
  const group = new THREE.Group()
  addFrame(group, 1.22, 0.82, 0.13, 0.09, materials.whiteFrame, 'outer frame')
  addBox(group, 'interior stool', [1.28, 0.05, 0.17], [0, 0.09, 0.028], materials.whiteFrame, true)

  const sash = new THREE.Group()
  addFrame(sash, 1, 0.56, 0.065, 0.05, materials.whiteFrame, 'awning sash')
  addGlass(sash, 'awning insulated glass', 0.86, 0.42, [0, 0.28, -0.012], 0.02)
  sash.position.set(0, 0.13, 0.006)
  sash.rotation.x = -0.12
  group.add(sash)

  addBox(group, 'top hinge cover', [0.92, 0.026, 0.036], [0, 0.7, 0.044], materials.shadowLine, true)
  addBox(group, 'left friction stay', [0.018, 0.2, 0.018], [-0.42, 0.32, 0.064], materials.metal, true)
  addBox(group, 'right friction stay', [0.018, 0.2, 0.018], [0.42, 0.32, 0.064], materials.metal, true)
  return group
}

function createNarrowTransomWindow() {
  const group = new THREE.Group()
  addFrame(group, 1.52, 1.22, 0.12, 0.09, materials.whiteFrame, 'outer frame')
  addBox(group, 'interior sill apron', [1.58, 0.05, 0.16], [0, 0.08, 0.028], materials.whiteFrame, true)
  addGlass(group, 'upper left lite', 0.58, 0.44, [-0.32, 0.84, -0.02], 0.02)
  addGlass(group, 'upper right lite', 0.58, 0.44, [0.32, 0.84, -0.02], 0.02)
  addGlass(group, 'lower left lite', 0.58, 0.44, [-0.32, 0.38, -0.02], 0.02)
  addGlass(group, 'lower right lite', 0.58, 0.44, [0.32, 0.38, -0.02], 0.02)
  addFrame(group, 1.36, 1.06, 0.075, 0.03, materials.whiteFrame, 'interior stop')
  addBox(group, 'central mullion vertical', [0.05, 0.98, 0.08], [0, 0.61, 0.004], materials.whiteFrame, true)
  addBox(group, 'central mullion horizontal', [1.28, 0.05, 0.08], [0, 0.61, 0.004], materials.whiteFrame, true)
  return group
}

function createFlushWhiteDoor() {
  const group = new THREE.Group()
  addBox(group, 'satin flush white slab', [0.86, 2.02, 0.07], [0, 1.01, 0], materials.whiteDoor, true)
  addFrame(group, 1.02, 2.16, 0.1, 0.07, materials.whiteFrame, 'door casing')
  addBox(group, 'subtle perimeter reveal', [0.74, 0.024, 0.078], [0, 1.85, 0.042], materials.shadowLine, true)
  addCylinder(group, 'round lever rose', 0.045, 0.035, [0.28, 1.03, 0.07], materials.metal)
  addBox(group, 'horizontal lever handle', [0.16, 0.026, 0.035], [0.36, 1.03, 0.09], materials.metal, true)
  return group
}

function createSlimGlassDoor() {
  const group = new THREE.Group()
  addBox(group, 'white slab with narrow glass cutout', [0.86, 2.02, 0.07], [0, 1.01, 0], materials.whiteDoor, true)
  addGlass(group, 'vertical privacy glass insert', 0.28, 1.34, [-0.14, 1.18, 0.048], 0.02)
  addFrame(group, 1.02, 2.16, 0.1, 0.07, materials.whiteFrame, 'door casing')
  addBox(group, 'glass insert trim left', [0.035, 1.44, 0.092], [-0.305, 1.18, 0.058], materials.whiteFrame, true)
  addBox(group, 'glass insert trim right', [0.035, 1.44, 0.092], [0.025, 1.18, 0.058], materials.whiteFrame, true)
  addBox(group, 'glass insert trim top', [0.365, 0.035, 0.092], [-0.14, 1.9, 0.058], materials.whiteFrame, true)
  addBox(group, 'glass insert trim bottom', [0.365, 0.035, 0.092], [-0.14, 0.46, 0.058], materials.whiteFrame, true)
  addCylinder(group, 'minimal lever rose', 0.04, 0.035, [0.31, 1.03, 0.074], materials.metal)
  addBox(group, 'minimal lever handle', [0.15, 0.024, 0.032], [0.38, 1.03, 0.09], materials.metal, true)
  return group
}

function createSlidingGlassDoor() {
  const group = new THREE.Group()
  addGlass(group, 'left sliding door glass', 0.8, 1.86, [-0.42, 1.05, -0.02])
  addGlass(group, 'right sliding door glass', 0.8, 1.86, [0.42, 1.05, -0.024])
  addFrame(group, 1.86, 2.12, 0.11, 0.075, materials.darkFrame, 'sliding door frame')
  addBox(group, 'center sliding meeting rail', [0.055, 1.95, 0.12], [0, 1.06, 0.012], materials.darkFrame, true)
  addBox(group, 'floor track', [1.72, 0.046, 0.13], [0, 0.12, 0.02], materials.darkFrame, true)
  addBox(group, 'flush pull', [0.034, 0.34, 0.03], [0.28, 1.05, 0.08], materials.metal, true)
  return group
}

function createDoubleGlassDoor() {
  const group = new THREE.Group()
  addGlass(group, 'left full lite glass', 0.58, 1.68, [-0.36, 1.12, -0.018])
  addGlass(group, 'right full lite glass', 0.58, 1.68, [0.36, 1.12, -0.018])
  addFrame(group, 1.5, 2.16, 0.1, 0.07, materials.whiteFrame, 'double door casing')
  addBox(group, 'left inner stile', [0.055, 1.82, 0.112], [-0.72, 1.08, 0.01], materials.whiteFrame, true)
  addBox(group, 'right inner stile', [0.055, 1.82, 0.112], [0.72, 1.08, 0.01], materials.whiteFrame, true)
  addBox(group, 'meeting stile', [0.07, 1.94, 0.12], [0, 1.06, 0.012], materials.whiteFrame, true)
  addBox(group, 'left pull', [0.024, 0.3, 0.035], [-0.08, 1.04, 0.09], materials.metal, true)
  addBox(group, 'right pull', [0.024, 0.3, 0.035], [0.08, 1.04, 0.09], materials.metal, true)
  return group
}

function createRibbedOakDoor() {
  const group = new THREE.Group()
  addBox(group, 'light oak door core', [0.86, 2.02, 0.065], [0, 1.01, 0], materials.oak, true)
  for (let index = 0; index < 7; index += 1) {
    const x = -0.36 + index * 0.12
    addBox(group, `vertical rib ${index + 1}`, [0.035, 1.86, 0.038], [x, 1.02, 0.052], materials.oak, true)
  }
  addFrame(group, 1.02, 2.16, 0.1, 0.07, materials.whiteFrame, 'door casing')
  addBox(group, 'black recessed pull', [0.04, 0.46, 0.035], [0.32, 1.08, 0.087], materials.darkFrame, true)
  return group
}

const assets = [
  ['modern-wide-picture-window', createWidePictureWindow],
  ['modern-sliding-window', createSlidingWindow],
  ['modern-tall-casement-window', createTallCasementWindow],
  ['modern-square-awning-window', createSquareAwningWindow],
  ['modern-transom-window', createNarrowTransomWindow],
  ['modern-flush-white-door', createFlushWhiteDoor],
  ['modern-slim-glass-door', createSlimGlassDoor],
  ['modern-sliding-glass-door', createSlidingGlassDoor],
  ['modern-double-glass-door', createDoubleGlassDoor],
  ['modern-ribbed-oak-door', createRibbedOakDoor],
]

async function writeGlb(id, object) {
  const exporter = new GLTFExporter()
  const scene = new THREE.Scene()
  scene.add(object)
  const arrayBuffer = await exporter.parseAsync(scene, { binary: true })
  const output = join(outputDir, `${id}.glb`)

  ensureDir(dirname(output))
  writeFileSync(output, Buffer.from(arrayBuffer))
  console.log(`[architectural] ${id}.glb`)
}

for (const [id, createAsset] of assets) {
  await writeGlb(id, createAsset())
}
