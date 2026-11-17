// Placa perfurada de alumínio com uma grelha de furos a cada 8 mm.
import { RBox } from '../kit.jsx'
import { Holes, ALU, gridPts } from './_mechKit.jsx'
import { HOLE } from '@shared/parts/_mech.js'
import { PLATE_T, PLATE_SIZES, plateDims } from '@shared/parts/mechPlate.js'

function Model({ part }) {
  const c = part.config || {}
  const [x, z] = plateDims(c)
  const [nz, nx] = PLATE_SIZES[c.size] || PLATE_SIZES['7x9']
  return (
    <group>
      <RBox size={[x, PLATE_T, z]} r={0.12} pos={[0, PLATE_T / 2, 0]} color={ALU} metal={0.85} rough={0.32} />
      <Holes pts={gridPts(nx, nz, HOLE, PLATE_T / 2)} r={0.2} h={PLATE_T + 0.02} />
    </group>
  )
}

export default { type: 'mechPlate', Model }
