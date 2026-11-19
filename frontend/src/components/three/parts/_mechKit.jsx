// Ajudantes dos modelos 3D do grupo Mecânica: furos instanciados, engrenagens (perfil evolvente
// real) e polias GT2 (gola semicircular), chapas extrudidas com arestas chanfradas, alumínio
// escovado/anodizado, parafusos de cabeça sextavada interior e porcas, cores de materiais.
import { useLayoutEffect, useRef } from 'react'
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'

export const ALU = '#cfd8dc'
export const ALU_DARK = '#90a4ae'
export const STEEL = '#b0bec5'
export const HOLE_C = '#1b1f22'
export const RUBBER = '#1e1e1e'
export const BRASS = '#c9a227'
// óxido negro dos parafusos de aço 12.9 (DIN 912) e zincado dos de classe 8.8
export const BLACK_OXIDE = '#26282b'
export const ZINC = '#c5ccd2'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3(1, 1, 1)
const _p = new THREE.Vector3()

// furos: cilindros escuros instanciados; axis 'y' | 'x' | 'z'
export function Holes({ pts, r = 0.2, h = 0.32, axis = 'y', color = HOLE_C }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const rot = axis === 'x' ? new THREE.Euler(0, 0, Math.PI / 2) : axis === 'z' ? new THREE.Euler(Math.PI / 2, 0, 0) : new THREE.Euler()
    _q.setFromEuler(rot)
    pts.forEach((p, i) => {
      _m.compose(_p.set(p[0], p[1], p[2]), _q, _s)
      m.setMatrixAt(i, _m)
    })
    m.count = pts.length
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  })
  if (!pts.length) return null
  return <instancedMesh key={pts.length} ref={ref} args={[geo(`hcyl${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 14)), mat(color, 0, 0.8), pts.length]} />
}

// ---------- alumínio escovado ----------
// mapa de rugosidade com riscos finos ao longo de x (escovado/maquinado): o reflexo do ambiente
// alonga-se como nas barras e chapas reais. Uma textura partilhada; materiais em cache por cor.
const BRUSH_TEX = {}
// cross = true: riscos ao longo de v (perfis extrudidos: o v das paredes é o comprimento)
function brushTex(cross = false) {
  const k = cross ? 'v' : 'u'
  if (BRUSH_TEX[k]) return BRUSH_TEX[k]
  const c = document.createElement('canvas')
  c.width = cross ? 256 : 32
  c.height = cross ? 32 : 256
  const g = c.getContext('2d')
  // riscos: linhas de tom aleatório (semente fixa: igual em todas as sessões)
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 256; i++) {
    const v = 150 + Math.floor(rnd() * 105)
    g.fillStyle = `rgb(${v},${v},${v})`
    if (cross) g.fillRect(i, 0, 1, 32)
    else g.fillRect(0, i, 32, 1)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  // os UV das chapas extrudidas estão em cm: um ladrilho cobre 5 cm (riscos de ~0,2 mm)
  if (cross) t.repeat.set(0.2, 1)
  else t.repeat.set(1, 0.2)
  BRUSH_TEX[k] = t
  return t
}
const BRUSHED = new Map()
// metal escovado (alumínio anodizado ou aço): rugosidade base `rough` modulada pelos riscos
export function brushedMat(color = ALU, metal = 0.85, rough = 0.36, cross = false) {
  const key = `${color}|${metal}|${rough}|${cross}`
  let m = BRUSHED.get(key)
  if (!m) BRUSHED.set(key, (m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: Math.max(0.2, rough), roughnessMap: brushTex(cross), envMapIntensity: 1 })))
  return m
}

// ---------- chapas extrudidas ----------
// perfil no plano XZ (espessura T segundo +y, face de baixo em y = 0; (x, y) da forma → (x, −z))
// com um chanfro pequeno em todas as arestas, também nas dos furos (as chapas cortadas e
// rebarbadas apanham um fio de luz em cada aresta). O contorno exterior não cresce (bevelOffset).
export function plateGeo(key, T, build, b = 0.02, curveSegments = 16) {
  return geo(`mkPlate:${key}:${T}:${b}`, () => {
    const bb = Math.min(b, T * 0.3)
    const g = new THREE.ExtrudeGeometry(build(), { depth: Math.max(1e-3, T - 2 * bb), bevelEnabled: bb > 0, bevelThickness: bb, bevelSize: bb, bevelOffset: -bb, bevelSegments: 1, curveSegments })
    g.translate(0, 0, bb)
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}
// aba de pé (plano XY, espessura T segundo z centrada): largura W em x (centrada), de y = 0
// (canto vivo, junto à dobra) até H com os cantos de cima boleados e furos em [x, y]
export function wallGeo(key, W, H, T, holes = [], hr = 0.21, b = 0.02) {
  return geo(`mkWall:${key}:${W},${H},${T},${hr}`, () => {
    const r = Math.min(0.3, W / 2 - 1e-3)
    const s = new THREE.Shape()
    s.moveTo(-W / 2, 0)
    s.lineTo(W / 2, 0)
    s.lineTo(W / 2, H - r)
    s.absarc(W / 2 - r, H - r, r, 0, Math.PI / 2, false)
    s.lineTo(-W / 2 + r, H)
    s.absarc(-W / 2 + r, H - r, r, Math.PI / 2, Math.PI, false)
    s.lineTo(-W / 2, 0)
    for (const [x, y] of holes) addHole(s, x, y, hr)
    const bb = Math.min(b, T * 0.3)
    const g = new THREE.ExtrudeGeometry(s, { depth: T - 2 * bb, bevelEnabled: true, bevelThickness: bb, bevelSize: bb, bevelOffset: -bb, bevelSegments: 1, curveSegments: 14 })
    g.translate(0, 0, -T / 2 + bb)
    g.computeVertexNormals()
    return g
  })
}
// forma 2D: retângulo com cantos boleados (x0..x1, y0..y1, raio r)
export function rrectShape(x0, y0, x1, y1, r, path = new THREE.Shape()) {
  r = Math.max(0.001, Math.min(r, (x1 - x0) / 2 - 1e-3, (y1 - y0) / 2 - 1e-3))
  path.moveTo(x0 + r, y0)
  path.lineTo(x1 - r, y0)
  path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x1, y1 - r)
  path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false)
  path.lineTo(x0 + r, y1)
  path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(x0, y0 + r)
  path.absarc(x0 + r, y0 + r, r, Math.PI, (3 * Math.PI) / 2, false)
  return path
}
// furo redondo numa forma (sentido contrário ao contorno)
export function addHole(shape, x, y, r) {
  const h = new THREE.Path()
  h.absarc(x, y, r, 0, Math.PI * 2, true)
  shape.holes.push(h)
}
// rasgo de pontas redondas (de x0 a x1, à altura y, largura w)
export function addSlot(shape, x0, x1, y, w) {
  const r = w / 2
  const h = new THREE.Path()
  h.moveTo(x0, y - r)
  h.lineTo(x1, y - r)
  h.absarc(x1, y, r, -Math.PI / 2, Math.PI / 2, false)
  h.lineTo(x0, y + r)
  h.absarc(x0, y, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  shape.holes.push(h)
}

// ---------- parafusaria (geometrias juntas numa só malha por conjunto) ----------
// parafuso DIN 912 (cabeça cilíndrica com sextavado interior): cabeça de raio rh e altura hh
// com o topo em y = 0 + hh; o sextavado é um prisma escuro rebaixado. pts = [[x, y, z]] da base
// da cabeça (a face onde assenta); axis 'y' (cabeça para +y) | '-y' | 'x' | '-x' | 'z' | '-z'.
const AXR = { y: [0, 0, 0], '-y': [Math.PI, 0, 0], x: [0, 0, -Math.PI / 2], '-x': [0, 0, Math.PI / 2], z: [Math.PI / 2, 0, 0], '-z': [-Math.PI / 2, 0, 0] }
export function SocketScrews({ pts, rh = 0.27, hh = 0.25, axis = 'y', color = BLACK_OXIDE }) {
  const key = `${rh},${hh},${axis},${pts.map((p) => p.map((v) => +v.toFixed(3)).join(',')).join(';')}`
  const head = mergedGeo(`sockH${key}`, () => {
    const g = geo(`sockHead${rh},${hh}`, () => {
      // cilindro com o topo boleado (perfil girado)
      const c = rh * 0.18
      const pts2 = [[0, 0], [rh, 0], [rh, hh - c], [rh - c * 0.3, hh - c * 0.3], [rh - c, hh], [rh * 0.62, hh]].map(([a, b]) => new THREE.Vector2(a, b))
      return new THREE.LatheGeometry(pts2, 18)
    })
    return pts.map((p) => [g, p, AXR[axis]])
  })
  const hex = mergedGeo(`sockX${key}`, () => {
    const g = geo(`sockHex${rh},${hh}`, () => new THREE.CylinderGeometry(rh * 0.5, rh * 0.5, 0.02, 6).translate(0, hh - 0.005, 0))
    const cap = geo(`sockCap${rh},${hh}`, () => new THREE.CircleGeometry(rh * 0.62, 18).rotateX(-Math.PI / 2).translate(0, hh, 0))
    return pts.flatMap((p) => [[g, p, AXR[axis]], [cap, p, AXR[axis]]])
  })
  return (
    <group>
      <mesh geometry={head} material={mat(color, 0.8, 0.38, { side: THREE.DoubleSide })} castShadow />
      <mesh geometry={hex} material={mat('#0b0c0d', 0.3, 0.7)} />
    </group>
  )
}
// porcas sextavadas (M3: 5,5 mm entre faces → raio do círculo circunscrito 0,32 cm)
export function HexNuts({ pts, r = 0.32, h = 0.24, axis = 'y', color = ZINC }) {
  const key = `${r},${h},${axis},${pts.map((p) => p.map((v) => +v.toFixed(3)).join(',')).join(';')}`
  const g = mergedGeo(`nuts${key}`, () => {
    const n = geo(`nut${r},${h}`, () => {
      // prisma de 6 lados com o chanfro de 30° nas duas faces (cone truncado de 12 lados por fora)
      const p = [[r * 0.5, 0], [r * 0.9, 0], [r, h * 0.15], [r, h * 0.85], [r * 0.9, h], [r * 0.5, h], [r * 0.5, 0]].map(([a, b]) => new THREE.Vector2(a, b))
      return new THREE.LatheGeometry(p, 6).rotateY(Math.PI / 6)
    })
    return pts.map((p) => [n, p, AXR[axis]])
  })
  return <mesh geometry={g} material={mat(color, 0.85, 0.34)} castShadow />
}

// ---------- engrenagens ----------
// perfil de engrenagem de dentes retos com flancos em evolvente (ângulo de pressão 20°), raio
// de pé e de cabeça normalizados (1,25·m e 1·m) e furo do veio
const PA = (20 * Math.PI) / 180
const inv = (a) => Math.tan(a) - a
function gearShape(z, m, bore) {
  const rp = (m * z) / 2
  const ra = rp + m
  const rf = Math.max(bore + 0.05, rp - 1.25 * m)
  const rb = rp * Math.cos(PA)
  const sh = new THREE.Shape()
  const step = (2 * Math.PI) / z
  // meia-espessura angular do dente ao raio r (flanco em evolvente acima do círculo de base)
  const half0 = Math.PI / (2 * z) + inv(PA)
  const halfAt = (r) => Math.max(0.012 * step, half0 - inv(Math.acos(Math.min(1, rb / Math.max(r, rb)))))
  const NF = 5
  const flank = []
  const r0 = Math.max(rf, rb)
  for (let k = 0; k <= NF; k++) {
    const r = r0 + ((ra - r0) * k) / NF
    flank.push([r, halfAt(r)])
  }
  // largura do vão no pé (não deixar os flancos cruzarem em engrenagens pequenas)
  const rootHalf = Math.min(halfAt(r0), step * 0.42)
  let first = true
  const P = (r, t) => {
    const x = r * Math.cos(t)
    const y = r * Math.sin(t)
    if (first) {
      sh.moveTo(x, y)
      first = false
    } else sh.lineTo(x, y)
  }
  for (let i = 0; i < z; i++) {
    const a = i * step
    // fundo do vão (arco no raio de pé) até ao início do flanco
    P(rf, a - step / 2 + 0.02 * step)
    P(rf, a - rootHalf - 0.04 * step)
    if (rf < r0) P(r0, a - rootHalf)
    // flanco de subida, cabeça, flanco de descida
    for (let k = rf < r0 ? 1 : 0; k <= NF; k++) P(flank[k][0], a - Math.min(flank[k][1], rootHalf))
    P(ra, a)
    for (let k = NF; k >= (rf < r0 ? 1 : 0); k--) P(flank[k][0], a + Math.min(flank[k][1], rootHalf))
    if (rf < r0) P(r0, a + rootHalf)
    P(rf, a + rootHalf + 0.04 * step)
  }
  sh.closePath()
  if (bore > 0) {
    const h = new THREE.Path()
    h.absarc(0, 0, bore, 0, Math.PI * 2, true)
    sh.holes.push(h)
  }
  return sh
}

// geometria de engrenagem com a espessura segundo +y (de 0 a w); chanfro pequeno nas arestas
// dos dentes quando o módulo o permite
export function gearGeo(z, m, w, bore = 0.25) {
  return geo(`gear2:${z},${m},${w},${bore}`, () => {
    const b = m >= 0.08 ? Math.min(0.012, w * 0.1) : 0
    const g = new THREE.ExtrudeGeometry(gearShape(z, m, bore), { depth: w - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: 12 })
    g.translate(0, 0, b)
    g.rotateX(-Math.PI / 2) // extrusão (z) → +y
    g.computeVertexNormals()
    return g
  })
}

// polia GT2: gola semicircular do perfil 2GT (passo 2 mm, raio da gola 0,555 mm, fundo 0,75 mm);
// o diâmetro exterior é o primitivo menos 2 × 0,254 mm (linha primitiva da correia)
function gt2Shape(z) {
  const rp = (z * 0.2) / (2 * Math.PI)
  const ro = rp - 0.0254
  const rg = 0.0555
  const c = ro - 0.075 + rg // centro da gola
  const sh = new THREE.Shape()
  const step = (2 * Math.PI) / z
  const N = 14
  for (let i = 0; i < z; i++) {
    for (let k = 0; k < N; k++) {
      const d = (k / N - 0.5) * step // ângulo relativo ao centro da gola
      const s = c * Math.sin(d)
      const r = rg * rg >= s * s ? Math.min(ro, c * Math.cos(d) - Math.sqrt(rg * rg - s * s)) : ro
      const t = i * step + d
      if (i === 0 && k === 0) sh.moveTo(r * Math.cos(t), r * Math.sin(t))
      else sh.lineTo(r * Math.cos(t), r * Math.sin(t))
    }
  }
  sh.closePath()
  const h = new THREE.Path()
  h.absarc(0, 0, 0.25, 0, Math.PI * 2, true)
  sh.holes.push(h)
  return sh
}
export function gt2Geo(z, w) {
  return geo(`gt2b:${z},${w}`, () => {
    const g = new THREE.ExtrudeGeometry(gt2Shape(z), { depth: w, bevelEnabled: false, curveSegments: 12 })
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}

export function Gear({ z, m = 0.1, w, y0 = 0, color = '#eceff1', metal = 0, rough = 0.45, bore = 0.25 }) {
  return <mesh position={[0, y0, 0]} geometry={gearGeo(z, m, w, bore)} material={mat(color, metal, rough)} castShadow receiveShadow />
}

// engrenagem de plástico injetado (POM/nylon) como as reais: coroa dentada com a largura toda,
// alma mais fina a meio com furos de alívio passantes e cubo saliente à volta do furo do veio.
// Engrenagens pequenas (sem espaço para a alma) ficam maciças. Mesma origem e eixo de Gear.
function webShape(rIn, bore, nh, rc, hr) {
  const s = new THREE.Shape()
  s.absarc(0, 0, rIn, 0, Math.PI * 2, false)
  for (let k = 0; k < nh; k++) {
    const a = (k / nh) * Math.PI * 2 + Math.PI / nh
    addHole(s, Math.cos(a) * rc, Math.sin(a) * rc, hr)
  }
  addHole(s, 0, 0, bore)
  return s
}
export function GearWeb({ z, m = 0.1, w, y0 = 0, color = '#eceff1', metal = 0, rough = 0.45, bore = 0.25, hubR = 0.5 }) {
  const rp = (m * z) / 2
  const rf = rp - 1.25 * m
  const rimIn = rf - Math.max(0.12, m * 1.5) // raio interior da coroa
  const M = mat(color, metal, rough)
  if (rimIn < hubR + 0.35) return <Gear z={z} m={m} w={w} y0={y0} color={color} metal={metal} rough={rough} bore={bore} />
  const tw = w * 0.45 // espessura da alma
  const nh = rimIn > 2 ? 6 : rimIn > 1.2 ? 5 : 4
  const rc = (hubR + rimIn) / 2
  const hr = Math.min((rimIn - hubR) * 0.38, ((Math.PI * rc) / nh) * 0.42)
  return (
    <group position={[0, y0, 0]}>
      <mesh geometry={gearGeo(z, m, w, rimIn)} material={M} castShadow receiveShadow />
      <mesh geometry={plateGeo(`gearWeb${z},${m},${tw},${bore},${hubR}`, tw, () => webShape(rimIn + 0.01, bore, nh, rc, hr), 0.008, 24)} position={[0, (w - tw) / 2, 0]} material={M} castShadow receiveShadow />
      {/* cubo (anel à volta do furo) com a largura toda da engrenagem */}
      <mesh geometry={geo(`gearHub${hubR},${bore},${w}`, () => {
        const c = 0.02
        const p = [[bore, 0], [hubR - c, 0], [hubR, c], [hubR, w - c], [hubR - c, w], [bore, w], [bore, 0]].map(([a, b]) => new THREE.Vector2(a, b))
        return new THREE.LatheGeometry(p, 24)
      })} material={M} castShadow receiveShadow />
    </group>
  )
}
export { gearShape }

// item de mergedGeo rodado de `a` à volta de +y (peças repetidas em coroa: rolos, raios,
// parafusos): devolve [posição, rotação XYZ] = Ry(a) · (pos, rot)
const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _eu = new THREE.Euler()
const _v = new THREE.Vector3()
const _Y = new THREE.Vector3(0, 1, 0)
export function aroundY(a, pos, rot = [0, 0, 0]) {
  _qa.setFromAxisAngle(_Y, a)
  _v.set(pos[0], pos[1], pos[2]).applyQuaternion(_qa)
  _qb.setFromEuler(_eu.set(rot[0], rot[1], rot[2]))
  _eu.setFromQuaternion(_qa.multiply(_qb))
  return [[_v.x, _v.y, _v.z], [_eu.x, _eu.y, _eu.z]]
}

// cilindro deitado ao longo de x
export const rotX = [0, 0, Math.PI / 2]
export const rotZ = [Math.PI / 2, 0, 0]

// furos de uma grelha retangular no plano xz à altura y
export function gridPts(nx, nz, pitch, y, x0 = -((nx - 1) * pitch) / 2, z0 = -((nz - 1) * pitch) / 2) {
  const out = []
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([x0 + i * pitch, y, z0 + j * pitch])
  return out
}
