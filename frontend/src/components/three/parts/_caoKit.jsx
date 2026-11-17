// Ajudantes dos modelos do grupo Cão robô (alumínio): material escovado/anodizado com textura
// procedural, chapas recortadas (THREE.Shape com furos) extrudidas com chanfro, parafusos de
// cabeça de embeber com sextavado interior.
import { geo, mat, THREE } from '../kit.jsx'
import { matOf, matColor } from '@shared/parts/_materials.js'

// ---------- textura de escovado (riscas finas ao longo de x), feita uma vez ----------
let brushTex = null
function brushTexture() {
  if (brushTex || typeof document === 'undefined') return brushTex
  const W = 512
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgb(222,222,222)'
  ctx.fillRect(0, 0, W, H)
  // riscas horizontais de comprimento e brilho aleatórios (semente fixa: sempre igual)
  let s = 1234567
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 2600; i++) {
    const y = rnd() * H
    const x = rnd() * W
    const len = 40 + rnd() * 260
    const v = 175 + Math.floor(rnd() * 80)
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.4})`
    ctx.lineWidth = 0.6 + rnd() * 1.1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (rnd() - 0.5) * 1.5)
    ctx.stroke()
    // continua do outro lado (textura repetível)
    if (x + len > W) {
      ctx.beginPath()
      ctx.moveTo(x - W, y)
      ctx.lineTo(x + len - W, y)
      ctx.stroke()
    }
  }
  brushTex = new THREE.CanvasTexture(c)
  brushTex.wrapS = brushTex.wrapT = THREE.RepeatWrapping
  // as UV das chapas extrudidas estão em cm: um ladrilho a cada ~8 cm
  brushTex.repeat.set(0.12, 0.12)
  brushTex.anisotropy = 8
  brushTex.colorSpace = THREE.SRGBColorSpace
  return brushTex
}

const MATS = new Map()
// alumínio escovado/anodizado (metalness ~0,85) na cor dada
export function aluMat(color = '#d3d8dc', metal = 0.85, rough = 0.34) {
  const key = `${color}|${metal}|${rough}`
  let m = MATS.get(key)
  if (!m) {
    const t = brushTexture()
    m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, map: t, roughnessMap: t, envMapIntensity: 1.1 })
    MATS.set(key, m)
  }
  return m
}
// material da peça (campo "material" do painel): alumínio escovado ou o material escolhido
export function partAluMat(cfg) {
  const m = matOf(cfg, 'alu')
  const color = matColor(cfg, 'alu')
  if (m.opacity) return mat(color, m.metal, m.rough, { transparent: true, opacity: m.opacity, depthWrite: false })
  if (m.metal > 0.5) return aluMat(color === '#cfd8dc' ? '#d3d8dc' : color, m.metal, Math.max(0.3, m.rough))
  return mat(color, m.metal, m.rough)
}

// ---------- perfis ----------
export function circleHole(shape, x, y, r) {
  const h = new THREE.Path()
  h.absarc(x, y, r, 0, Math.PI * 2, true)
  shape.holes.push(h)
}
// rasgo de pontas redondas de (x1, y) a (x2, y), largura 2r
export function slotHole(shape, x1, x2, y, r) {
  const h = new THREE.Path()
  h.moveTo(x1, y - r)
  h.lineTo(x2, y - r)
  h.absarc(x2, y, r, -Math.PI / 2, Math.PI / 2, false)
  h.lineTo(x1, y + r)
  h.absarc(x1, y, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  shape.holes.push(h)
}
export function rectHole(shape, x1, y1, x2, y2, r = 0.15) {
  const h = new THREE.Path()
  roundRectPath(h, x1, y1, x2, y2, r)
  shape.holes.push(h)
}
function roundRectPath(p, x1, y1, x2, y2, r) {
  r = Math.min(r, (x2 - x1) / 2 - 1e-3, (y2 - y1) / 2 - 1e-3)
  p.moveTo(x1 + r, y1)
  p.lineTo(x2 - r, y1)
  p.quadraticCurveTo(x2, y1, x2, y1 + r)
  p.lineTo(x2, y2 - r)
  p.quadraticCurveTo(x2, y2, x2 - r, y2)
  p.lineTo(x1 + r, y2)
  p.quadraticCurveTo(x1, y2, x1, y2 - r)
  p.lineTo(x1, y1 + r)
  p.quadraticCurveTo(x1, y1, x1 + r, y1)
}
export function roundRectShape(x1, y1, x2, y2, r) {
  const s = new THREE.Shape()
  roundRectPath(s, x1, y1, x2, y2, r)
  return s
}

// chapa extrudida com chanfro: perfil no plano XY, espessura T de z = 0 a z = T.
// key identifica a forma (cache de geometria partilhada).
// seg = segmentos por arco (furos pequenos e chapas com muitos furos: poucos; peças à vista: mais)
export function plateGeo(key, makeShape, T, bevel = 0.035, seg = 10) {
  return geo(`caoPlate|${key}|${T}|${bevel}|${seg}`, () => {
    const b = Math.min(bevel, T / 3)
    const g = new THREE.ExtrudeGeometry(makeShape(), { depth: T - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: seg })
    g.translate(0, 0, b)
    g.computeVertexNormals()
    return g
  })
}
// a mesma chapa deitada: perfil (x, y) → (x, −z) e espessura de y = 0 a y = T
export function flatPlateGeo(key, makeShape, T, bevel, seg) {
  return geo(`caoFlat|${key}|${T}|${bevel}|${seg}`, () => {
    const g = plateGeo(key, makeShape, T, bevel, seg).clone()
    g.rotateX(-Math.PI / 2)
    return g
  })
}

export function Plate({ geometry, material, pos, rot }) {
  return <mesh geometry={geometry} material={material} position={pos} rotation={rot} castShadow receiveShadow />
}

// ---------- parafusos ----------
const STEEL_M = () => mat('#8d969c', 0.9, 0.35)
const SOCKET_M = () => mat('#15181a', 0.2, 0.8)
const screwHeadGeo = (r) => geo(`caoScrew${r}`, () => new THREE.CylinderGeometry(r, r * 0.92, 0.05, 20))
const screwHexGeo = (r) => geo(`caoHex${r}`, () => new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.052, 6))
// parafuso de cabeça de embeber (M2/M2.5/M3) com a cabeça no plano local y = 0 (sai para +y)
export function Screw({ pos = [0, 0, 0], rot, r = 0.16, color }) {
  return (
    <group position={pos} rotation={rot}>
      <mesh geometry={screwHeadGeo(r)} material={color ? mat(color, 0.85, 0.35) : STEEL_M()} position={[0, 0.025, 0]} castShadow />
      <mesh geometry={screwHexGeo(r)} material={SOCKET_M()} position={[0, 0.028, 0]} />
    </group>
  )
}
// vários parafusos com a cabeça virada para +y / +z / −z / +x / −x
const AX = { y: undefined, '-y': [Math.PI, 0, 0], z: [Math.PI / 2, 0, 0], '-z': [-Math.PI / 2, 0, 0], x: [0, 0, -Math.PI / 2], '-x': [0, 0, Math.PI / 2] }
export function Screws({ pts, axis = 'y', r, color }) {
  return pts.map((p, i) => <Screw key={i} pos={p} rot={AX[axis]} r={r} color={color} />)
}

// espaçador sextavado entre duas chapas, ao longo de z (de z1 a z2) em (x, y)
const hexGeo = (h) => geo(`caoHexSt${h}`, () => new THREE.CylinderGeometry(0.28, 0.28, h, 6))
export function HexStandoffZ({ x, y, z1, z2, color = '#2b2f33' }) {
  const h = Math.abs(z2 - z1)
  return <mesh geometry={hexGeo(Math.round(h * 1000) / 1000)} material={mat(color, 0.7, 0.35)} position={[x, y, (z1 + z2) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow />
}
