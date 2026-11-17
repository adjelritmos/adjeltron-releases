// Exportar imagens: circuito 2D (SVG / PNG, recortado às peças montadas) e
// montagem 3D (PNG em alta resolução / modelo GLB para Blender, etc.).
import * as THREE from 'three'
import { simRef } from '../contexts/simRef.js'
import { useStore } from '../contexts/store.js'
import { saveFile } from './saveFile.js'
import { t as tr } from '../i18n/index.js'

const BG = '#0d0d0d'
export const fileBase = () =>
  (useStore.getState().projectName || 'adjeltron')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'adjeltron'

// "Guardar como" (ver saveFile.js)
const TYPES = {
  // descrições lidas na hora (idioma atual)
  svg: { get description() { return tr('wb.export.svgImage') }, mime: 'image/svg+xml' },
  png: { get description() { return tr('wb.export.png') }, mime: 'image/png' },
  glb: { get description() { return tr('wb.export.glb') }, mime: 'model/gltf-binary' },
}
export const download = (blob, name) => {
  const ext = name.slice(name.lastIndexOf('.') + 1)
  return saveFile(blob, name, { ext: `.${ext}`, ...TYPES[ext] })
}

// ---------- 2D ----------
// SVG autónomo só com as peças e os fios (sem grelha nem seleção), com margem
function circuitSvgString({ background = true } = {}) {
  const svg = simRef.svg2d
  if (!svg) throw new Error(tr('wb.export.circuitNotReady'))
  const root = svg.querySelector('g[data-export="root"]')
  // caixa das peças e fios (no referencial do grupo, antes do zoom/pan)
  // getBBox() não inclui o transform do próprio elemento (posição/rotação de cada peça):
  // passa os 4 cantos para o referencial do grupo raiz com as matrizes de ecrã
  const toRoot = root.getScreenCTM().inverse()
  let box = null
  const add = (x, y) => {
    box = box ? { x1: Math.min(box.x1, x), y1: Math.min(box.y1, y), x2: Math.max(box.x2, x), y2: Math.max(box.y2, y) } : { x1: x, y1: y, x2: x, y2: y }
  }
  for (const el of root.children) {
    if (el.getAttribute('data-export') === 'skip') continue
    let b
    try {
      b = el.getBBox()
    } catch {
      continue
    }
    if (!b.width && !b.height) continue
    const m = toRoot.multiply(el.getScreenCTM())
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
      const p = new DOMPoint(cx, cy).matrixTransform(m)
      add(p.x, p.y)
    }
  }
  if (!box) throw new Error(tr('wb.export.circuitEmpty'))
  const m = 30
  const x = box.x1 - m
  const y = box.y1 - m
  const w = box.x2 - box.x1 + 2 * m
  const h = box.y2 - box.y1 + 2 * m

  const clone = svg.cloneNode(true)
  clone.removeAttribute('class')
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)
  clone.setAttribute('width', String(Math.round(w)))
  clone.setAttribute('height', String(Math.round(h)))
  clone.querySelectorAll('[data-export="skip"]').forEach((n) => n.remove())
  const g = clone.querySelector('g[data-export="root"]')
  g.removeAttribute('transform')
  // texto com a mesma letra da aplicação
  clone.setAttribute('font-family', getComputedStyle(svg).fontFamily || 'Arial, sans-serif')
  if (background) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    Object.entries({ x, y, width: w, height: h, fill: BG }).forEach(([k, v]) => r.setAttribute(k, String(v)))
    clone.insertBefore(r, clone.firstChild.nextSibling) // depois de <defs>
  }
  return { text: new XMLSerializer().serializeToString(clone), w, h }
}

export function exportCircuitSvg() {
  const { text } = circuitSvgString()
  return download(new Blob([text], { type: 'image/svg+xml' }), `${fileBase()}-circuito.svg`)
}

export async function exportCircuitPng(scale = 3) {
  const { text, w, h } = circuitSvgString()
  const img = new Image()
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error(tr('wb.export.drawFailed')))
    img.src = url
  })
  // limite de ~8000 px no lado maior (limite dos canvas dos browsers)
  const s = Math.min(scale, 8000 / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * s)
  c.height = Math.round(h * s)
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, c.width, c.height)
  URL.revokeObjectURL(url)
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  return download(blob, `${fileBase()}-circuito.png`)
}

// ---------- 3D ----------
export async function export3dPng(scale = 2) {
  const t = simRef.three
  if (!t) throw new Error(tr('wb.export.view3dNotReady'))
  const { gl, scene, camera } = t
  const pr = gl.getPixelRatio()
  const size = gl.getSize(new THREE.Vector2())
  // renderiza a uma resolução maior só para a captura
  const s = Math.min(scale * pr, 8000 / Math.max(size.x, size.y))
  gl.setPixelRatio(s)
  gl.setSize(size.x, size.y, false)
  gl.render(scene, camera)
  const blob = await new Promise((r) => gl.domElement.toBlob(r, 'image/png'))
  gl.setPixelRatio(pr)
  gl.setSize(size.x, size.y, false)
  gl.render(scene, camera)
  return download(blob, `${fileBase()}-3d.png`)
}

export async function export3dGlb() {
  const t = simRef.three
  const world = t?.scene.getObjectByName('robolab-world')
  if (!world) throw new Error(tr('wb.export.view3dNotReady'))
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  // unidades do adjeltron: cm → o glTF usa metros
  const root = new THREE.Group()
  root.name = useStore.getState().projectName || 'adjeltron'
  root.scale.setScalar(0.01)
  const copy = world.clone(true) // partilha geometrias e materiais com a cena: não os alterar
  const drop = []
  const cache = new Map()
  copy.traverse((o) => {
    // halos dos LEDs (sprites) e ajudas de edição (contornos de seleção, pinos, etc.)
    if (o.isSprite) return drop.push(o)
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    if (mats.some((m) => m.wireframe)) return drop.push(o)
    if (o.isMesh || o.isLine || o.isPoints) {
      const pos = o.geometry?.attributes?.position
      const n = Math.min(pos?.count ?? 0, o.geometry?.drawRange?.count ?? Infinity)
      if (!n || (o.isInstancedMesh && !o.count)) return drop.push(o)
      o.material = Array.isArray(o.material) ? mats.map((m) => exportMaterial(m, cache)) : exportMaterial(o.material, cache)
    }
  })
  drop.forEach((o) => o.removeFromParent())
  root.add(copy)
  try {
    const data = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true })
    return download(new Blob([data], { type: 'model/gltf-binary' }), `${fileBase()}-3d.glb`)
  } finally {
    cache.forEach((m) => m.dispose())
  }
}

// Cópia do material só para o GLB. A passagem de realismo (StudioEnvironment.jsx) põe uma
// DataTexture de grão em roughnessMap/bumpMap; o GLTFExporter funde metalness+roughness com
// drawImage(), que não aceita DataTexture, e a exportação falha. O grão é só para o ecrã: sai.
function exportMaterial(m, cache) {
  let c = cache.get(m)
  if (c) return c
  c = m.clone()
  for (const k of ['roughnessMap', 'metalnessMap']) if (c[k] && !drawable(c[k].image)) c[k] = null
  c.bumpMap = null // o glTF não tem bump
  c.userData = {}
  cache.set(m, c)
  return c
}
const drawable = (img) =>
  (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) ||
  (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) ||
  (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) ||
  (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas)
