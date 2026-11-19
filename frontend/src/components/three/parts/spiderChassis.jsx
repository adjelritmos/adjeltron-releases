// Chassi do robô aranha (kit "Spider Robot" em acrílico preto de 3 mm cortado a laser): placas
// de cima e de baixo octogonais com a furação M3 da eletrónica e os rasgos dos cabos, pilares
// de latão, paredes laterais com furos de aligeiramento, as abas que ladeiam os servos das
// ancas nos cantos e a moldura da frente com os dois furos do HC-SR04. Faces brilhantes e
// arestas do corte a laser foscas; parafusos M3 de cabeça boleada.
import { Box, geo, mat, THREE } from '../kit.jsx'
import { SPIDER } from '@shared/parts/spiderChassis.js'
import { extrudeXY, holeCircle, holeSlot, rrect } from './_mdfKit.jsx'
import { bevelPlateXZ, ScrewHeads } from './_matKit.jsx'

const { L, W, H, hipX, hipZ } = SPIDER
const T = 0.3
const CH = 1.5 // chanfro dos cantos (octógono)
const POSTS = [-3.2, 3.2].flatMap((x) => [-1, 1].map((sz) => [x, sz * (W / 2 - 0.7)]))

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
  for (const [px, pz] of POSTS) holeCircle(s, px, -pz, 0.16)
  // furos do Arduino Uno (padrão real, ~5,1 × 4,8) e da caixa da bateria
  if (top) for (const [px, pz] of [[-2.6, -2.4], [2.5, -2.4], [-2.6, 2.4], [2.5, 2.4]]) holeCircle(s, px, pz, 0.16)
  // furos dos parafusos das abas dos servos das ancas (na diagonal de cada canto)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const a = Math.atan2(-sz, sx)
      for (const d of [-1.9, 0.6]) holeCircle(s, sx * hipX + Math.cos(a) * d, -(sz * hipZ - Math.sin(a) * d), 0.1)
    }
  holeSlot(s, -1.2, 1.2, 0, top ? 0.5 : 0.9) // passagem dos cabos
  return s
}

// parede lateral (plano xy, espessura z) com furos de aligeiramento redondos
function sideWall() {
  return extrudeXY('spiderSide', 0.2, () => {
    const lx = (L - 6) / 2
    const hy = (H - 2 * T) / 2
    const s = rrect(new THREE.Shape(), -lx, -hy, lx, hy, 0.15)
    for (let i = -1; i <= 1; i++) holeCircle(s, i * 2.4, 0, 0.55)
    return s
  })
}

// moldura da frente (plano zy, espessura x): dois furos de 16 mm para os transdutores do HC-SR04
function frontFrame() {
  return extrudeXY('spiderFront', 0.25, () => {
    const lz = (W - 4) / 2
    const hy = (H - 2 * T) / 2
    const s = rrect(new THREE.Shape(), -lz, -hy, lz, hy, 0.15)
    for (const z of [-1.3, 1.3]) holeCircle(s, z, 0.1, 0.82)
    return s
  })
}

function SpiderChassisModel() {
  const acr = mat('#111111', 0, 0.1)
  const edge = mat('#262626', 0, 0.4)
  const botG = bevelPlateXZ('spiderBot', T, () => plateShape(false), 0.02, 10)
  const topG = bevelPlateXZ('spiderTop', T, () => plateShape(true), 0.02, 10)
  const post = geo(`spiderPost${H}`, () => new THREE.CylinderGeometry(0.22, 0.22, H - 2 * T, 6))
  return (
    <group>
      <mesh geometry={botG} material={[acr, edge]} castShadow receiveShadow />
      <mesh geometry={topG} material={[acr, edge]} position={[0, H - T, 0]} castShadow receiveShadow />
      {/* pilares sextavados de latão entre as placas, com os parafusos */}
      {POSTS.map(([x, z], i) => (
        <mesh key={i} geometry={post} material={mat('#c9a227', 0.9, 0.3)} position={[x, H / 2, z]} castShadow />
      ))}
      <ScrewHeads pts={POSTS.map(([x, z]) => [x, H, z])} r={0.26} />
      <ScrewHeads rot={[Math.PI, 0, 0]} pts={POSTS.map(([x, z]) => [x, 0, -z])} r={0.26} />
      {/* abas de acrílico dos dois lados de cada servo das ancas */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz])).map(([sx, sz], i) => (
        <group key={i} position={[sx * hipX, H / 2, sz * hipZ]} rotation={[0, Math.atan2(-sz, sx), 0]}>
          {[-1, 1].map((s) => (
            <Box key={s} size={[2.6, H - 2 * T, 0.2]} pos={[-0.6, 0, s * 0.75]} color="#111111" rough={0.15} />
          ))}
        </group>
      ))}
      {/* paredes laterais */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={sideWall()} material={[acr, edge]} position={[0, H / 2, sz * (W / 2 - 0.1)]} castShadow receiveShadow />
      ))}
      {/* moldura da frente (atrás do HC-SR04) */}
      <mesh geometry={frontFrame()} material={[acr, edge]} position={[L / 2 - 0.15, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
      {/* seta da frente gravada (branca) */}
      <Box size={[1.6, 0.01, 0.3]} pos={[L / 2 - 3.2, H + 0.005, W / 2 - 1.2]} color="#f5f5f5" rough={0.6} />
      <Box size={[0.7, 0.01, 0.3]} pos={[L / 2 - 2.55, H + 0.005, W / 2 - 1.45]} rot={[0, -Math.PI / 4, 0]} color="#f5f5f5" rough={0.6} />
      <Box size={[0.7, 0.01, 0.3]} pos={[L / 2 - 2.55, H + 0.005, W / 2 - 0.95]} rot={[0, Math.PI / 4, 0]} color="#f5f5f5" rough={0.6} />
    </group>
  )
}

export default { type: 'spiderChassis', Model: SpiderChassisModel }
