// Canela de alumínio: chapa curva que estreita para a pata; ponta redonda no braço do servo
// do joelho, furos de aligeiramento e 2 furos de fixação da pata.
import { CANELA, canelaLen } from '@shared/parts/canelaAlu.js'
import { partAluMat, flatPlateGeo, circleHole, Screws } from './_caoKit.jsx'
import { legShape, hornPts } from './coxaAlu.jsx'

function Model({ part }) {
  const c = part.config || {}
  const Ls = canelaLen(c)
  const { T, r0, w1 } = CANELA
  const M = partAluMat(c)
  const r1 = w1 / 2
  const n = Math.max(0, Math.floor((Ls - 3.2) / 1.3))
  const holes = Array.from({ length: n }, (_, i) => 1.9 + i * 1.3)
  const g = flatPlateGeo(`canela${Ls}`, () =>
    legShape(Ls, r0, r1, -0.5, (sh) => {
      circleHole(sh, 0, 0, 0.32)
      for (const [x, y] of hornPts()) circleHole(sh, x, y, 0.1)
      // furos de aligeiramento (cada vez mais pequenos) a seguir a curva
      holes.forEach((x) => {
        const t = x / Ls
        circleHole(sh, x, -0.5 * 2 * t * (1 - t), Math.max(0.16, 0.42 - 0.22 * t))
      })
      // furos dos parafusos da pata (a 3,0 e 2,3 cm da borracha)
      for (const x of [Ls - 0.4, Ls + 0.3]) circleHole(sh, x, 0, 0.11)
    }),
  T, 0.03, 16)
  return (
    <group>
      <mesh geometry={g} material={M} castShadow receiveShadow />
      {/* parafusos no braço do servo do joelho (cabeças do lado oposto ao braço) */}
      <Screws pts={hornPts().map(([x, y]) => [x, T, -y])} r={0.12} />
      <Screws pts={[[0, T, 0]]} r={0.26} color="#2b2f33" />
    </group>
  )
}

export default { type: 'canelaAlu', Model }
