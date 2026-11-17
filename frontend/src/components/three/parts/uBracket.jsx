// Suporte em U: base furada (ao longo de z) e duas abas verticais.
import { Box } from '../kit.jsx'
import { Holes, ALU } from './_mechKit.jsx'
import { HOLE, beamLen } from '@shared/parts/_mech.js'
import { UB } from '@shared/parts/uBracket.js'

function Model({ part }) {
  const n = part.config?.holes ?? 4
  const B = beamLen(n) + 1.2
  const H = part.config?.height ?? 2.4
  const T = UB.T
  const zs = Array.from({ length: n }, (_, i) => -beamLen(n) / 2 + i * HOLE)
  const ny = Math.max(1, Math.floor((H - 0.4) / HOLE))
  const ys = Array.from({ length: ny }, (_, i) => H - 0.6 - i * HOLE).filter((y) => y > T + 0.3)
  return (
    <group>
      <Box size={[UB.W, T, B + 2 * T]} pos={[0, T / 2, 0]} color={ALU} metal={0.85} rough={0.32} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[UB.W, H, T]} pos={[0, H / 2, s * (B / 2 + T / 2)]} color={ALU} metal={0.85} rough={0.32} />
      ))}
      <Holes pts={zs.map((z) => [0, T / 2, z])} r={0.2} h={T + 0.02} />
      <Holes pts={[-1, 1].flatMap((s) => ys.map((y) => [0, y, s * (B / 2 + T / 2)]))} r={0.2} h={T + 0.02} axis="z" />
    </group>
  )
}

export default { type: 'uBracket', Model }
