// Ajudantes dos modelos em MDF cortado a laser (grupo MDF): perfis extrudidos com furos,
// ranhuras e recortes; a face da chapa na cor do material e as arestas queimadas pelo laser
// (mais escuras); parafusos de latão com porca e pilares de nylon pretos.
import { geo, mat, THREE, Box, RBox, Cyl, useLabel } from '../kit.jsx'
import { matOf, matColor } from '@shared/parts/_materials.js'

export const MDF_BURN = '#4a2c16'
export const BRASS = '#c9a227'
export const NYLON = '#151515'

// [face, aresta]: as ExtrudeGeometry têm o grupo 0 nas faces e o 1 nas paredes laterais
export function mdfMats(cfg) {
  const key = cfg?.material || 'mdf'
  const m = matOf(cfg, 'mdf')
  const face = mat(matColor(cfg, 'mdf'), m.metal, m.rough, m.opacity ? { transparent: true, opacity: m.opacity, depthWrite: false } : undefined)
  const wood = key === 'mdf' || key === 'madeira'
  const edge = wood ? mat(MDF_BURN, 0, 0.95) : face
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
export function Screw({ pos, axis = 'y', len = 0.6, nut = true }) {
  const head = geo('mdfScrewHead', () => new THREE.CylinderGeometry(0.27, 0.27, 0.12, 16).translate(0, 0.06, 0))
  const slot = geo('mdfScrewSlot', () => new THREE.BoxGeometry(0.4, 0.04, 0.06).translate(0, 0.12, 0))
  const shaft = geo(`mdfScrewShaft${len}`, () => new THREE.CylinderGeometry(0.14, 0.14, len + 0.15, 8).translate(0, -(len + 0.15) / 2, 0))
  const nutG = geo('mdfNut', () => new THREE.CylinderGeometry(0.3, 0.3, 0.2, 6).translate(0, -0.1, 0))
  return (
    <group position={pos} rotation={AX[axis]}>
      <mesh geometry={head} material={mat(BRASS, 0.85, 0.32)} castShadow />
      <mesh geometry={slot} material={mat('#6b5414', 0.6, 0.5)} />
      <mesh geometry={shaft} material={mat(BRASS, 0.85, 0.35)} />
      {nut && <mesh geometry={nutG} position={[0, -len, 0]} material={mat(BRASS, 0.85, 0.32)} castShadow />}
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
      { text: 'SG90', font: 'bold 74px Arial', y: 58 },
      { text: 'MICRO SERVO · 9g', font: 'bold 26px Arial', y: 108 },
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
