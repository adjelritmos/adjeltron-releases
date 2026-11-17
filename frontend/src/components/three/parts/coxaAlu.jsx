// Coxa de alumínio: chapa ligeiramente arqueada, ponta larga no braço do servo da anca (furo
// do eixo + 4 parafusos), furo grande na ponta do joelho para o braço do servo passar, rasgo de
// aligeiramento e 2 postes que seguram as abas do servo do joelho.
import { COXA, coxaLen } from '@shared/parts/coxaAlu.js'
import { servoDims } from '@shared/parts/_servoDims.js'
import { THREE } from '../kit.jsx'
import { partAluMat, flatPlateGeo, circleHole, slotHole, Screws, HexStandoffZ } from './_caoKit.jsx'

const BOW = 0.35 // arqueamento (controlo da curva das bordas)

export function legShape(Lc, r0, r1, bow, holes) {
  const s = new THREE.Shape()
  s.moveTo(0, -r0)
  s.quadraticCurveTo(Lc / 2, -(r0 + r1) / 2 + bow, Lc, -r1)
  s.absarc(Lc, 0, r1, -Math.PI / 2, Math.PI / 2, false)
  s.quadraticCurveTo(Lc / 2, (r0 + r1) / 2 + bow, 0, r0)
  s.absarc(0, 0, r0, Math.PI / 2, (3 * Math.PI) / 2, false)
  holes(s)
  return s
}
// 4 furos do braço do servo à volta do eixo (raio 0,55, a 45°)
export const hornPts = (x = 0, y = 0, R = 0.55) => [0, 1, 2, 3].map((k) => [x + R * Math.cos(Math.PI / 4 + (k * Math.PI) / 2), y + R * Math.sin(Math.PI / 4 + (k * Math.PI) / 2)])

function Model({ part }) {
  const c = part.config || {}
  const Lc = coxaLen(c)
  const s = servoDims(c)
  const { T, r0, r1 } = COXA
  const M = partAluMat(c)
  const g = flatPlateGeo(`coxa${Lc}`, () =>
    legShape(Lc, r0, r1, BOW, (sh) => {
      circleHole(sh, 0, 0, 0.32)
      for (const [x, y] of hornPts()) circleHole(sh, x, y, 0.1)
      circleHole(sh, Lc, 0, 0.62)
      // rasgo de aligeiramento ao meio (segue o arco) e furos dos postes do servo do joelho
      if (Lc > 5) slotHole(sh, 1.9, Lc - 2.3 - s.L / 2 + 0.6, BOW / 2, 0.42)
    }),
  T, 0.03, 16)
  // abas do servo do joelho: a hornY − gap − tabY acima da chapa (o servo está virado ao contrário)
  const tabY = s.hornY - COXA.gap - s.tabY
  const sx = Lc - s.hornX
  const posts = [-1, 1].map((k) => sx + k * (s.L / 2 + 0.27))
  return (
    <group>
      <mesh geometry={g} material={M} castShadow receiveShadow />
      {/* parafusos do braço do servo da anca (cabeça por fora, +y) */}
      <Screws pts={hornPts().map(([x, y]) => [x, T, -y])} r={0.12} />
      <Screws pts={[[0, T, 0]]} r={0.26} color="#2b2f33" />
      {/* postes das abas do servo do joelho */}
      {posts.map((x) => (
        <group key={x} rotation={[-Math.PI / 2, 0, 0]}>
          <HexStandoffZ x={x} y={0} z1={T} z2={tabY - 0.13} color="#9aa3a9" />
        </group>
      ))}
    </group>
  )
}

export default { type: 'coxaAlu', Model }
