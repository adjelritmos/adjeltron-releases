// Barra perfurada de alumínio 12 × 3 mm: origem no 1.º furo, ao longo de +x.
import { RBox } from '../kit.jsx'
import { Holes, ALU } from './_mechKit.jsx'
import { HOLE, beamLen } from '@shared/parts/_mech.js'
import { BEAM } from '@shared/parts/beam.js'

function Model({ part }) {
  const n = part.config?.holes ?? 7
  const L = beamLen(n)
  const pts = Array.from({ length: n }, (_, i) => [i * HOLE, BEAM.T / 2, 0])
  return (
    <group>
      <RBox size={[L + BEAM.W, BEAM.T, BEAM.W]} r={0.08} pos={[L / 2, BEAM.T / 2, 0]} color={ALU} metal={0.85} rough={0.32} />
      <Holes pts={pts} r={0.2} h={BEAM.T + 0.02} />
    </group>
  )
}

export default { type: 'beam', Model }
