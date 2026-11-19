// Ajudantes dos modelos com material (grupo Materiais): material three.js a partir de
// config.material/config.color e perfis extrudidos (pontas redondas, cantos arredondados) com furos.
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { matOf, matColor } from '@shared/parts/_materials.js'

// material three.js da peça (cor do utilizador ou do material; acrílico transparente)
export function partMat(cfg, fallback) {
  const m = matOf(cfg, fallback)
  return mat(matColor(cfg, fallback), m.metal, m.rough, m.opacity ? { transparent: true, opacity: m.opacity, depthWrite: false } : undefined)
}
export const partColor = (cfg, fallback) => matColor(cfg, fallback)

const circle = (path, x, y, r) => {
  const h = new THREE.Path()
  h.absarc(x, y, r, 0, Math.PI * 2, true)
  path.holes.push(h)
}

// perfil extrudido no plano XZ (espessura T segundo +y, face de baixo em y = 0)
function extrudeXZ(shape, T) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 18 })
  g.rotateX(-Math.PI / 2) // forma (x, y) → (x, −z); profundidade → +y
  return g
}

// barra de pontas redondas, de x = 0 a x = L, largura W, furos de raio hr nos pontos `holes` (x)
export function stadiumGeo(L, W, T, holes = [0, L], hr = 0.2) {
  return geo(`stad${L},${W},${T},${holes.join(':')},${hr}`, () => {
    const r = W / 2
    const s = new THREE.Shape()
    s.moveTo(0, -r)
    s.lineTo(L, -r)
    s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(0, r)
    s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
    for (const x of holes) circle(s, x, 0, Math.min(hr, r * 0.7))
    return extrudeXZ(s, T)
  })
}

// retângulo L × W de cantos arredondados (raio rc) centrado na origem, com furos em `holes` [[x, z]]
export function roundRectGeo(L, W, T, rc, holes = [], hr = 0.2) {
  return geo(`rrect${L},${W},${T},${rc},${holes.length},${holes[0] || ''},${hr}`, () => {
    const r = Math.min(rc, L / 2 - 1e-3, W / 2 - 1e-3)
    const x0 = -L / 2
    const y0 = -W / 2
    const s = new THREE.Shape()
    s.moveTo(x0 + r, y0)
    s.lineTo(x0 + L - r, y0)
    s.quadraticCurveTo(x0 + L, y0, x0 + L, y0 + r)
    s.lineTo(x0 + L, y0 + W - r)
    s.quadraticCurveTo(x0 + L, y0 + W, x0 + L - r, y0 + W)
    s.lineTo(x0 + r, y0 + W)
    s.quadraticCurveTo(x0, y0 + W, x0, y0 + W - r)
    s.lineTo(x0, y0 + r)
    s.quadraticCurveTo(x0, y0, x0 + r, y0)
    for (const [x, z] of holes) circle(s, x, -z, hr)
    return extrudeXZ(s, T)
  })
}

// ---------- ajudantes dos chassis e corpos de robôs ----------
// chapa de perfil (x, y) com chanfro nas arestas, deitada: (x, y) → (x, −z), espessura de y = 0
// a y = T (grupo 0 = faces, grupo 1 = paredes laterais, como nas ExtrudeGeometry)
export function bevelPlateXZ(key, T, build, bevel = 0.03, seg = 12) {
  return geo(`bplxz:${key}:${T}:${bevel}`, () => {
    const b = Math.min(bevel, T / 3)
    const g = new THREE.ExtrudeGeometry(build(), { depth: T - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: seg })
    g.translate(0, 0, b)
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}

// fibra de carbono 3K em sarja 2×2 (as madeixas a 45° que se veem nos quadros de drone), com
// verniz brilhante por cima; as arestas cortadas mostram as camadas (cinzento mate)
let CARBON_TEX
function carbonTexture() {
  if (CARBON_TEX || typeof document === 'undefined') return CARBON_TEX
  const N = 256
  const n = 16 // madeixas por ladrilho
  const p = N / n
  const c = document.createElement('canvas')
  c.width = c.height = N
  const x = c.getContext('2d')
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      // sarja 2×2: a madeixa de cima alterna em degraus diagonais
      const warp = ((i + j) >> 1) % 2 === 0
      const g = warp ? x.createLinearGradient(i * p, 0, (i + 1) * p, 0) : x.createLinearGradient(0, j * p, 0, (j + 1) * p)
      g.addColorStop(0, '#2a2a2c')
      g.addColorStop(0.5, warp ? '#5a5c60' : '#46484c')
      g.addColorStop(1, '#2a2a2c')
      x.fillStyle = g
      x.fillRect(i * p, j * p, p, p)
    }
  CARBON_TEX = new THREE.CanvasTexture(c)
  CARBON_TEX.wrapS = CARBON_TEX.wrapT = THREE.RepeatWrapping
  // madeixas de ~2 mm (UV das extrusões em cm)
  CARBON_TEX.repeat.set(1.5, 1.5)
  CARBON_TEX.rotation = Math.PI / 4
  CARBON_TEX.colorSpace = THREE.SRGBColorSpace
  CARBON_TEX.anisotropy = 8
  return CARBON_TEX
}
let CARBON_M
export function carbonMats() {
  if (!CARBON_M) {
    const face = new THREE.MeshPhysicalMaterial({ color: '#9a9ca0', map: carbonTexture(), metalness: 0.2, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.9 })
    CARBON_M = [face, mat('#2b2b2d', 0.1, 0.75)]
  }
  return CARBON_M
}

// cabeças de parafuso M3 de cabeça boleada (ISO 7380) com sextavado interior, todas numa malha
// (cabeça a sair para +y a partir de cada ponto); `r` = raio da cabeça
export function ScrewHeads({ pts, r = 0.28, color = '#1e1f22', metal = 0.6, rough = 0.4, rot }) {
  const key = `${r}|${pts.map((p) => p.map((v) => +v.toFixed(3)).join(',')).join(';')}`
  const head = mergedGeo(`shd${key}`, () => {
    const g = geo(`btnHead${r}`, () => {
      const pts2 = [[0, 0], [r, 0], [r, r * 0.12], [r * 0.85, r * 0.42], [r * 0.5, r * 0.6], [r * 0.42, r * 0.6], [r * 0.42, r * 0.4], [0, r * 0.4]].map(([a, b]) => new THREE.Vector2(a, b))
      return new THREE.LatheGeometry(pts2, 16)
    })
    return pts.map((p) => [g, p])
  })
  const hex = mergedGeo(`shx${key}`, () => {
    const g = geo(`btnHex${r}`, () => new THREE.CylinderGeometry(r * 0.36, r * 0.36, 0.01, 6).translate(0, r * 0.41, 0))
    return pts.map((p) => [g, p])
  })
  return (
    <group rotation={rot}>
      <mesh geometry={head} material={mat(color, metal, rough)} castShadow />
      <mesh geometry={hex} material={mat('#050505', 0, 0.9)} />
    </group>
  )
}
