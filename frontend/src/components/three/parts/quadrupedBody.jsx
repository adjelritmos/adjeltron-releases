// Corpo do cão robô (tipo "Spot Micro"): placas de acrílico preto de 3 mm cortadas a laser em
// cima e em baixo (cantos chanfrados, furação M3 de 1 cm para a eletrónica, rasgos dos cabos),
// pilares sextavados de latão, berços dos servos das ancas em PLA laranja (com nervuras),
// painéis laterais impressos com aberturas em losango, testa à frente e seta impressa. Parafusos M3 de cabeça boleada pretos.
import { Box, geo, mat, THREE } from '../kit.jsx'
import { QUAD } from '@shared/parts/quadrupedBody.js'
import { extrudeXY, holeCircle, holeSlot, rrect } from './_mdfKit.jsx'
import { bevelPlateXZ, ScrewHeads } from './_matKit.jsx'

const { L, H, W, hipX, hipY } = QUAD
const PLATE = 0.3
const ORANGE = '#ef6c00'
const CH = 1.0 // chanfro dos cantos
const POSTS = [-3, 3].flatMap((x) => [-1, 1].map((sz) => [x, sz * (W / 2 - 0.8)]))

// placa: retângulo L × W com os cantos chanfrados, furos dos pilares, grelha de furação e rasgos
function plateShape(top) {
  const s = new THREE.Shape()
  const x = L / 2
  const z = W / 2
  s.moveTo(-x + CH, -z)
  s.lineTo(x - CH, -z)
  s.lineTo(x, -z + CH)
  s.lineTo(x, z - CH)
  s.lineTo(x - CH, z)
  s.lineTo(-x + CH, z)
  s.lineTo(-x, z - CH)
  s.lineTo(-x, -z + CH)
  s.lineTo(-x + CH, -z)
  for (const [px, pz] of POSTS) holeCircle(s, px, -pz, 0.17)
  // furação de 1 cm ao meio (onde aparafusam o Arduino, o PCA9685 e o regulador)
  for (let i = -4; i <= 4; i++) for (const j of [-2, 2]) holeCircle(s, i, j, 0.16)
  // rasgos de passagem dos cabos dos servos, junto às ancas
  for (const sx of [-1, 1]) holeSlot(s, sx * 5.4 - 0.9, sx * 5.4 + 0.9, 0, top ? 0.6 : 1.2)
  if (!top) holeSlot(s, -1.5, 1.5, 0, 1.4) // janela da bateria por baixo
  return s
}

// painel lateral impresso (plano xy, espessura em z): aberturas em losango de ventilação
function sidePanel() {
  return extrudeXY('quadSide', 0.2, () => {
    const lx = (L - 6) / 2
    const hy = (H - 2 * PLATE) / 2
    const s = rrect(new THREE.Shape(), -lx, -hy, lx, hy, 0.25)
    for (let i = -3; i <= 3; i++) {
      const cx = i * 1.9
      const h = new THREE.Path()
      h.moveTo(cx, -0.8)
      h.lineTo(cx + 0.55, 0)
      h.lineTo(cx, 0.8)
      h.lineTo(cx - 0.55, 0)
      h.lineTo(cx, -0.8)
      s.holes.push(h)
    }
    return s
  })
}

function QuadrupedBodyModel() {
  const acr = mat('#121212', 0, 0.12)
  const acrEdge = mat('#2a2a2a', 0, 0.35)
  const pla = mat(ORANGE, 0, 0.55)
  const botG = bevelPlateXZ('quadBot', PLATE, () => plateShape(false), 0.02, 10)
  const topG = bevelPlateXZ('quadTop', PLATE, () => plateShape(true), 0.02, 10)
  const side = sidePanel()
  return (
    <group>
      {/* placas de acrílico (faces brilhantes, arestas cortadas foscas) */}
      <mesh geometry={botG} material={[acr, acrEdge]} castShadow receiveShadow />
      <mesh geometry={topG} material={[acr, acrEdge]} position={[0, H - PLATE, 0]} castShadow receiveShadow />
      {/* painéis laterais laranja */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={side} material={pla} position={[0, H / 2, sz * (W / 2 - 0.1)]} castShadow receiveShadow />
      ))}
      {/* pilares sextavados de latão M3 entre as placas */}
      {POSTS.map(([x, z], i) => (
        <mesh key={i} position={[x, H / 2, z]} geometry={geo(`quadPost${H}`, () => new THREE.CylinderGeometry(0.25, 0.25, H - 2 * PLATE, 6))} material={mat('#c9a227', 0.9, 0.3)} castShadow />
      ))}
      <ScrewHeads pts={POSTS.map(([x, z]) => [x, H, z])} r={0.27} />
      <ScrewHeads rot={[Math.PI, 0, 0]} pts={POSTS.map(([x, z]) => [x, 0, -z])} r={0.27} />
      {/* berços dos servos das ancas nos cantos: base e duas paredes com nervuras */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz])).map(([sx, sz], i) => (
        <group key={i} position={[sx * hipX - 0.55, hipY, sz * (W / 2 - 1.4)]}>
          <Box size={[3.4, 0.2, 2.8]} pos={[0, -0.75, 0]} color={ORANGE} rough={0.55} />
          <Box size={[0.2, 1.7, 2.8]} pos={[-1.6, 0, 0]} color={ORANGE} rough={0.55} />
          <Box size={[0.2, 1.7, 2.8]} pos={[1.6, 0, 0]} color={ORANGE} rough={0.55} />
          {/* nervuras de reforço entre a base e as paredes */}
          {[-1, 1].map((k) => (
            <Box key={k} size={[0.35, 0.35, 0.15]} pos={[k * 1.38, -0.55, -sz * 1.1]} rot={[0, 0, k * Math.PI / 4]} color={ORANGE} rough={0.55} />
          ))}
        </group>
      ))}
      {/* testa / suporte da cabeça, com os furos do HC-SR04 */}
      <Box size={[0.3, H - 2 * PLATE, W - 3]} pos={[L / 2 - 0.15, H / 2, 0]} color={ORANGE} rough={0.55} />
      <ScrewHeads rot={[0, 0, -Math.PI / 2]} pts={[-2.1, 2.1].flatMap((z) => [[-(H / 2 - 0.7), L / 2, z], [-(H / 2 + 0.7), L / 2, z]])} r={0.2} color="#2a2a2a" />
      {/* seta da frente impressa a branco no acrílico */}
      <Box size={[1.6, 0.01, 0.3]} pos={[L / 2 - 3, H + 0.005, W / 2 - 1]} color="#f5f5f5" rough={0.6} />
      <Box size={[0.7, 0.01, 0.3]} pos={[L / 2 - 2.35, H + 0.005, W / 2 - 1.25]} rot={[0, -Math.PI / 4, 0]} color="#f5f5f5" rough={0.6} />
      <Box size={[0.7, 0.01, 0.3]} pos={[L / 2 - 2.35, H + 0.005, W / 2 - 0.75]} rot={[0, Math.PI / 4, 0]} color="#f5f5f5" rough={0.6} />
    </group>
  )
}

export default { type: 'quadrupedBody', Model: QuadrupedBodyModel }
