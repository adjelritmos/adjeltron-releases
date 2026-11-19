// Ajudantes dos modelos em MDF cortado a laser (grupo MDF): perfis extrudidos com furos,
// ranhuras e recortes; a face da chapa na cor do material e as arestas queimadas pelo laser
// (mais escuras); parafusos de latão com porca e pilares de nylon pretos.
import { geo, mat, THREE, Box, RBox, Cyl, useLabel } from '../kit.jsx'
import { matOf, matColor } from '@shared/parts/_materials.js'

export const MDF_BURN = '#4a2c16'
export const BRASS = '#c9a227'
export const NYLON = '#151515'

// ---------- texturas da chapa (feitas uma vez) ----------
// MDF: fibras prensadas, um salpicado fino e quase uniforme (sem veio); contraplacado/madeira:
// veio comprido e ondulado. Em tons de cinzento claro: multiplicam a cor do material.
// As UV das ExtrudeGeometry estão em cm: `repeat` dá o tamanho real do ladrilho.
const WOOD_TEX = {}
function woodTexture(kind) {
  if (WOOD_TEX[kind] || typeof document === 'undefined') return WOOD_TEX[kind]
  const N = 256
  const c = document.createElement('canvas')
  c.width = c.height = N
  const x = c.getContext('2d')
  let s = kind === 'mdf' ? 98765 : 4321
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  x.fillStyle = 'rgb(236,236,236)'
  x.fillRect(0, 0, N, N)
  if (kind === 'mdf') {
    // fibras curtas em todas as direções e pontos mais escuros (cola/resina)
    for (let i = 0; i < 2600; i++) {
      const v = 200 + Math.floor(rnd() * 55)
      x.strokeStyle = `rgba(${v},${v},${v},0.55)`
      x.lineWidth = 0.6 + rnd() * 0.8
      const px = rnd() * N
      const py = rnd() * N
      const a = rnd() * Math.PI
      const l = 1.5 + rnd() * 4
      x.beginPath()
      x.moveTo(px, py)
      x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l)
      x.stroke()
    }
    for (let i = 0; i < 420; i++) {
      const v = 165 + Math.floor(rnd() * 40)
      x.fillStyle = `rgba(${v},${v - 6},${v - 14},0.5)`
      x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 1.5, 1 + rnd() * 1.5)
    }
  } else {
    // veio: linhas onduladas ao longo de x com anéis mais escuros
    for (let i = 0; i < 70; i++) {
      const y0 = rnd() * N
      const v = 170 + Math.floor(rnd() * 70)
      x.strokeStyle = `rgba(${v},${v - 8},${v - 20},${0.25 + rnd() * 0.45})`
      x.lineWidth = 0.8 + rnd() * 2.6
      const ph = rnd() * 6.28
      const amp = 1 + rnd() * 3
      x.beginPath()
      for (let px = 0; px <= N; px += 8) {
        const py = y0 + Math.sin(px / 40 + ph) * amp
        if (px === 0) x.moveTo(px, py)
        else x.lineTo(px, py)
      }
      x.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(kind === 'mdf' ? 0.35 : 0.12, kind === 'mdf' ? 0.35 : 0.12)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return (WOOD_TEX[kind] = t)
}
// aresta queimada pelo laser: castanho escuro a quase preto ao meio da espessura (textura em
// faixas segundo v, que nas paredes da extrusão segue a profundidade)
let BURN_TEX
function burnTexture() {
  if (BURN_TEX || typeof document === 'undefined') return BURN_TEX
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 64
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, '#7a5232')
  g.addColorStop(0.5, '#2e1a0c')
  g.addColorStop(1, '#6b4529')
  x.fillStyle = g
  x.fillRect(0, 0, 8, 64)
  BURN_TEX = new THREE.CanvasTexture(c)
  BURN_TEX.colorSpace = THREE.SRGBColorSpace
  // v das paredes = profundidade da extrusão em cm: um gradiente por cada 3 mm (chapa típica)
  BURN_TEX.wrapS = BURN_TEX.wrapT = THREE.RepeatWrapping
  BURN_TEX.repeat.set(1, 1 / 0.3)
  return BURN_TEX
}
const WOOD_MAT = new Map()
function woodFaceMat(color, rough, kind) {
  const k = `${color}|${rough}|${kind}`
  let m = WOOD_MAT.get(k)
  if (!m) {
    const t = woodTexture(kind)
    WOOD_MAT.set(k, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, map: t, bumpMap: t, bumpScale: 0.004, envMapIntensity: 0.6 })))
  }
  return m
}
let BURN_MAT
const burnMat = () => BURN_MAT || (BURN_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', map: burnTexture(), roughness: 0.95, metalness: 0, envMapIntensity: 0.4 }))

// [face, aresta]: as ExtrudeGeometry têm o grupo 0 nas faces e o 1 nas paredes laterais
export function mdfMats(cfg) {
  const key = cfg?.material || 'mdf'
  const m = matOf(cfg, 'mdf')
  const wood = key === 'mdf' || key === 'madeira'
  const face = wood
    ? woodFaceMat(matColor(cfg, 'mdf'), m.rough, key)
    : mat(matColor(cfg, 'mdf'), m.metal, m.rough, m.opacity ? { transparent: true, opacity: m.opacity, depthWrite: false } : undefined)
  const edge = wood ? burnMat() : face
  return [face, edge]
}

// ---------- caminhos 2D ----------
export function rrect(path, x0, y0, x1, y1, r) {
  r = Math.max(0.001, Math.min(r, (x1 - x0) / 2 - 1e-3, (y1 - y0) / 2 - 1e-3))
  path.moveTo(x0 + r, y0)
  path.lineTo(x1 - r, y0)
  path.quadraticCurveTo(x1, y0, x1, y0 + r)
  path.lineTo(x1, y1 - r)
  path.quadraticCurveTo(x1, y1, x1 - r, y1)
  path.lineTo(x0 + r, y1)
  path.quadraticCurveTo(x0, y1, x0, y1 - r)
  path.lineTo(x0, y0 + r)
  path.quadraticCurveTo(x0, y0, x0 + r, y0)
  return path
}
export const holeCircle = (shape, x, y, r) => {
  const h = new THREE.Path()
  h.absarc(x, y, r, 0, Math.PI * 2, true)
  shape.holes.push(h)
}
export const holeRect = (shape, x0, y0, x1, y1, r = 0.05) => shape.holes.push(rrect(new THREE.Path(), x0, y0, x1, y1, r))
// ranhura (pontas redondas) de x0 a x1 (centros das pontas), à altura y, largura w
export function holeSlot(shape, x0, x1, y, w) {
  const r = w / 2
  const h = new THREE.Path()
  h.moveTo(x0, y - r)
  h.lineTo(x1, y - r)
  h.absarc(x1, y, r, -Math.PI / 2, Math.PI / 2, false)
  h.lineTo(x0, y + r)
  h.absarc(x0, y, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  shape.holes.push(h)
}

// perfil no plano XZ (espessura T segundo +y, face de baixo em y = 0): (x, y) da forma → (x, −z)
export function extrudeXZ(key, T, build) {
  return geo(`mdfxz:${key}:${T}`, () => {
    const g = new THREE.ExtrudeGeometry(build(), { depth: T, bevelEnabled: false, curveSegments: 20 })
    g.rotateX(-Math.PI / 2)
    return g
  })
}
// perfil no plano XY (espessura T segundo z, centrada em z = 0)
export function extrudeXY(key, T, build) {
  return geo(`mdfxy:${key}:${T}`, () => {
    const g = new THREE.ExtrudeGeometry(build(), { depth: T, bevelEnabled: false, curveSegments: 20 })
    g.translate(0, 0, -T / 2)
    return g
  })
}

export function Mdf({ geometry, cfg, pos, rot }) {
  return <mesh geometry={geometry} material={mdfMats(cfg)} position={pos} rotation={rot} castShadow receiveShadow />
}

// parafuso M3 de latão: cabeça em `pos` (face da chapa), corpo ao longo de −eixo e porca no fim
// (axis: 'y' | 'z' | '-z' | '-y'); len = espessura total apertada
const AX = { y: [0, 0, 0], '-y': [Math.PI, 0, 0], z: [Math.PI / 2, 0, 0], '-z': [-Math.PI / 2, 0, 0] }
// cabeça de lentilha (perfil de revolução: assento plano, aba e cúpula baixa), como os M3 DIN 7985
const panHeadGeo = () =>
  geo('mdfScrewPan', () => {
    const pts = [[0, 0], [0.27, 0], [0.275, 0.03], [0.26, 0.08], [0.21, 0.13], [0.12, 0.16], [0, 0.17]].map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(pts, 18)
  })
// fenda em cruz (Phillips) rebaixada no topo da cabeça
const crossGeo = () =>
  geo('mdfScrewCross', () => {
    const a = new THREE.BoxGeometry(0.26, 0.05, 0.05).translate(0, 0.155, 0)
    const b = new THREE.BoxGeometry(0.05, 0.05, 0.26).translate(0, 0.155, 0)
    const g = new THREE.BufferGeometry()
    const pa = a.toNonIndexed().attributes.position.array
    const pb = b.toNonIndexed().attributes.position.array
    const p = new Float32Array(pa.length + pb.length)
    p.set(pa)
    p.set(pb, pa.length)
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.computeVertexNormals()
    return g
  })
// porca sextavada M3 (5,5 mm entre faces) com o chanfro das arestas
const nutGeo = () =>
  geo('mdfNutL', () => {
    const pts = [[0.14, 0], [0.29, 0], [0.32, 0.03], [0.32, 0.21], [0.29, 0.24], [0.14, 0.24]].map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(pts, 6).translate(0, -0.24, 0)
  })
export function Screw({ pos, axis = 'y', len = 0.6, nut = true }) {
  const shaft = geo(`mdfScrewShaft${len}`, () => new THREE.CylinderGeometry(0.14, 0.14, len + 0.15, 8).translate(0, -(len + 0.15) / 2, 0))
  return (
    <group position={pos} rotation={AX[axis]}>
      <mesh geometry={panHeadGeo()} material={mat(BRASS, 0.85, 0.32)} castShadow />
      <mesh geometry={crossGeo()} material={mat('#5e4a12', 0.6, 0.6)} />
      <mesh geometry={shaft} material={mat(BRASS, 0.85, 0.35)} />
      {nut && <mesh geometry={nutGeo()} position={[0, -len, 0]} material={mat(BRASS, 0.85, 0.32)} castShadow />}
    </group>
  )
}

// parafuso Phillips de aço inox (cabeça boleada com a cruz)
export function Phillips({ pos, flip = false }) {
  const head = geo('phHead', () => new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1))
  const cross = geo('phCross', () => new THREE.BoxGeometry(0.24, 0.05, 0.05))
  return (
    <group position={pos} rotation={flip ? [Math.PI, 0, 0] : [0, 0, 0]}>
      <mesh geometry={head} material={mat('#d9dcdf', 0.95, 0.28)} castShadow />
      <mesh geometry={cross} position={[0, 0.07, 0]} material={mat('#3a3d40', 0.5, 0.5)} />
      <mesh geometry={cross} position={[0, 0.07, 0]} rotation={[0, Math.PI / 2, 0]} material={mat('#3a3d40', 0.5, 0.5)} />
    </group>
  )
}

// pilar de nylon preto (hexagonal) de y0 a y0 + h
export function Spacer({ x, z, y0 = 0, h, r = 0.25 }) {
  return <mesh geometry={geo(`mdfSpacer${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 6))} material={mat(NYLON, 0, 0.55)} position={[x, y0 + h / 2, z]} castShadow receiveShadow />
}

// micro servo SG90 azul (sem braço nem cabo): base em y = 0, corpo ao longo de x centrado em
// x = 0, eixo em x = hornX; o braço (horn) fica a cargo de quem o usa
export function Sg90Body({ color = '#2a62d8' }) {
  const L = 2.3
  const H = 2.27
  const W = 1.22
  const tabY = 1.6
  // etiqueta lateral (como a do SG90 da Tower Pro)
  const tex = useLabel(
    [
      { text: 'TowerPro', font: 'italic bold 26px Arial', y: 20 },
      { text: 'SG90', font: 'bold 70px Arial', y: 66 },
      { text: 'MICRO SERVO · 9g', font: 'bold 24px Arial', y: 112 },
    ],
    512,
    128,
  )
  const seam = mat('#000000', 0, 0.8, { transparent: true, opacity: 0.35, depthWrite: false })
  return (
    <group>
      {/* caixa em 3 partes (fundo, corpo, tampa) com as juntas marcadas */}
      <RBox size={[L, H, W]} r={0.06} pos={[0, H / 2, 0]} color={color} rough={0.4} />
      {[H * 0.12, tabY + 0.2, H - 0.06].map((y) => (
        <mesh key={y} position={[0, y, 0]} geometry={geo(`sg90Seam${y}`, () => new THREE.BoxGeometry(L + 0.006, 0.018, W + 0.006))} material={seam} />
      ))}
      {/* orelhas com furo e rasgo */}
      <RBox size={[L + 1.0, 0.25, W]} r={0.04} pos={[0, tabY, 0]} color={color} rough={0.4} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (L / 2 + 0.27), tabY, 0]}>
          <Cyl r={0.1} h={0.27} color="#0a0a0a" seg={12} />
          <Box size={[0.2, 0.27, 0.06]} pos={[s * 0.12, 0, 0]} color="#0a0a0a" />
        </group>
      ))}
      <mesh position={[0, H * 0.55, W / 2 + 0.002]}>
        <planeGeometry args={[L * 0.9, L * 0.22]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
      {/* parafusos que fecham a caixa (por baixo) */}
      {[-1, 1].map((s) => (
        <Cyl key={`p${s}`} r={0.07} h={0.02} pos={[s * (L / 2 - 0.15), -0.005, s * (W / 2 - 0.15)]} color="#d3d7db" metal={1} rough={0.35} seg={10} />
      ))}
      {/* tampa das engrenagens e estriado branco */}
      <Cyl r={W * 0.48} h={0.35} pos={[0.55, H + 0.17, 0]} color={color} rough={0.45} seg={28} />
      <Cyl r={W * 0.26} h={0.25} pos={[0.55 - W * 0.5, H + 0.12, 0]} color={color} rough={0.45} seg={20} />
      <Cyl r={0.13} h={0.3} pos={[0.55, H + 0.42, 0]} color="#f0f0f0" rough={0.45} seg={12} />
    </group>
  )
}
