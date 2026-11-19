// Sensor de ângulo AS5600: caixa torneada de alumínio anodizado preto (flange chanfrada e
// 4 parafusos de cabeça cilíndrica com sextavado interior), rolamento de esferas à vista (anéis de
// aço e vedante), eixo de aço com o plano em D (comprimento e diâmetro configuráveis, roda com o
// mount "eixo"), colar com parafuso de aperto e, por baixo, a placa verde (com o AS5600
// escondido) e a ficha JST de 3 vias com os cabos.
import { Box, Cyl, RBox, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { Badge } from './group-c-ui.jsx'
import def, { SA, saDims } from '@shared/parts/sensorAngulo.js'

const ALU = { color: '#1d1f22', metal: 0.75, rough: 0.38 }
const STEEL = { color: '#d5d9dc', metal: 1, rough: 0.22 }
const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))

// corpo torneado: flange de Ø 26 mm chanfrada, corpo de Ø 22 mm e aresta de cima chanfrada
const bodyGeo = () =>
  geo('sa:body', () =>
    new THREE.LatheGeometry(
      v2([[0, 0.16], [SA.R - 0.03, 0.16], [SA.R, 0.19], [SA.R, 0.31], [SA.R - 0.03, 0.34], [SA.R * 0.86, 0.34], [SA.R * 0.86, SA.H - 0.05], [SA.R * 0.86 - 0.05, SA.H], [0, SA.H]]),
      56,
    ),
  )
// parafusos de cabeça cilíndrica (aço preto) e o sextavado interior
const SCREWS = [0, 1, 2, 3].map((k) => {
  const a = (k * Math.PI) / 2 + Math.PI / 4
  return [Math.cos(a) * 1.08, Math.sin(a) * 1.08]
})
const headsGeo = () => mergedGeo('sa:heads', () => SCREWS.map(([x, z]) => [new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), [x, 0.38, z]]))
const socketsGeo = () => mergedGeo('sa:sockets', () => SCREWS.map(([x, z]) => [new THREE.CylinderGeometry(0.055, 0.055, 0.02, 6), [x, 0.415, z]]))
// troço do eixo com o plano em D (plano virado para +x), base em y = 0
function dGeo(r, len) {
  return geo(`sa:dshaft${r},${len.toFixed(3)}`, () => {
    const a0 = Math.acos(0.72)
    const s = new THREE.Shape()
    s.absarc(0, 0, r, a0, Math.PI * 2 - a0, false)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 20 })
    g.rotateX(-Math.PI / 2)
    return g
  })
}

function Model({ part }) {
  const { axle, shaftD, axisY } = saDims(part?.config)
  const r = shaftD / 2
  const collarH = Math.min(0.35, axle * 0.4)
  const cy = SA.H + 0.12 + collarH // topo do colar
  const dLen = Math.max(0.01, axisY - 0.01 - cy)
  return (
    <group>
      {/* placa de circuito (por baixo; o AS5600 fica escondido sob o íman do eixo) e a ficha */}
      <RBox size={[2.5, 0.16, 2.3]} r={0.05} pos={[-0.05, 0.08, 0]} color="#1f6b35" rough={0.42} />
      {/* corpo torneado e a tampa */}
      <mesh geometry={bodyGeo()} material={mat(ALU.color, ALU.metal, ALU.rough)} castShadow receiveShadow />
      <Cyl r={SA.R * 0.72} h={0.02} pos={[0, SA.H + 0.005, 0]} color="#2a2d31" metal={0.6} rough={0.3} seg={48} />
      <mesh geometry={headsGeo()} material={mat('#2b2d30', 0.9, 0.35)} castShadow />
      <mesh geometry={socketsGeo()} material={mat('#0c0c0c', 0, 0.8)} />
      {/* rolamento: anel exterior, vedante e anel interior */}
      <Cyl r={Math.max(r + 0.25, 0.55)} h={0.12} pos={[0, SA.H + 0.04, 0]} seg={36} {...STEEL} />
      <Cyl r={Math.max(r + 0.16, 0.45)} h={0.13} pos={[0, SA.H + 0.045, 0]} color="#3c3f43" metal={0.6} rough={0.4} seg={36} />
      <Cyl r={r + 0.08} h={0.14} pos={[0, SA.H + 0.05, 0]} seg={28} {...STEEL} />
      {/* eixo: troço redondo até ao colar e plano em D até à ponta */}
      <Cyl r={r} h={cy - SA.H + 0.05} pos={[0, (SA.H - 0.05 + cy) / 2, 0]} seg={24} {...STEEL} />
      <mesh position={[0, cy, 0]} geometry={dGeo(r, dLen)} material={mat(STEEL.color, STEEL.metal, STEEL.rough)} castShadow />
      {/* colar com parafuso de aperto junto ao rolamento */}
      <Cyl r={r + 0.22} h={collarH} pos={[0, SA.H + 0.12 + collarH / 2, 0]} seg={28} color="#c7ccd0" metal={1} rough={0.28} />
      <Cyl r={0.06} h={0.12} pos={[r + 0.24, SA.H + 0.12 + collarH / 2, 0]} rot={[0, 0, Math.PI / 2]} color="#222" metal={0.8} rough={0.4} seg={6} />
      {/* ponta chanfrada */}
      <Cyl r={r * 0.85} r2={r} h={0.06} pos={[0, axisY + 0.02, 0]} seg={24} {...STEEL} />
      {/* ficha JST de 3 vias e cabos */}
      <RBox size={[0.42, 0.5, 1.0]} r={0.04} pos={[-1.15, 0.4, 0]} color="#f0ede4" rough={0.5} />
      <Box size={[0.03, 0.3, 0.8]} pos={[-1.37, 0.4, 0]} color="#d8d4c8" />
      {def.pins.map((p, i) => (
        <Box key={p.id} size={[0.14, 0.08, 0.08]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={['#e53935', '#212121', '#fdd835'][i]} />
      ))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return <Badge info={info} text={`θ = ${(live.angle ?? 0).toFixed(1)}°`} color="#f5f5f5" />
}

export default { type: 'sensorAngulo', Model, Overlay2D }
