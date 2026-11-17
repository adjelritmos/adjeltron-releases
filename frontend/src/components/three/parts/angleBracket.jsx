// Cantoneira em L: aba horizontal ao longo de +x e aba vertical em x = −0,6.
import { Box } from '../kit.jsx'
import { Holes, ALU } from './_mechKit.jsx'
import { HOLE, beamLen } from '@shared/parts/_mech.js'
import { ANGLE } from '@shared/parts/angleBracket.js'

function Model({ part }) {
  const n = part.config?.holes ?? 3
  const L = beamLen(n)
  const T = ANGLE.T
  return (
    <group>
      <Box size={[L + 1.2, T, ANGLE.W]} pos={[L / 2, T / 2, 0]} color={ALU} metal={0.85} rough={0.32} />
      <Box size={[T, L + 0.6, ANGLE.W]} pos={[-0.6 + T / 2, (L + 0.6) / 2, 0]} color={ALU} metal={0.85} rough={0.32} />
      <Holes pts={Array.from({ length: n }, (_, i) => [0.4 + i * HOLE, T / 2, 0])} r={0.2} h={T + 0.02} />
      <Holes pts={Array.from({ length: n - 1 }, (_, i) => [-0.6 + T / 2, L + 0.15 - i * HOLE, 0])} r={0.2} h={T + 0.02} axis="x" />
    </group>
  )
}

export default { type: 'angleBracket', Model }
