// Caneta: tampa de trás na origem, corpo ao longo de +y e ponta cónica em y = comprimento.
// A ponta e o anel da tampa têm a cor da tinta.
import { Cyl } from '../kit.jsx'
import { penLen } from '@shared/parts/caneta.js'

function Model({ part }) {
  const c = part.config || {}
  const L = penLen(c)
  const ink = c.color || '#1565c0'
  const body = Math.max(0.5, L - 1.6)
  return (
    <group>
      <Cyl r={0.5} h={0.9} pos={[0, 0.45, 0]} color={ink} rough={0.4} seg={20} />
      <Cyl r={0.42} h={body} pos={[0, 0.9 + body / 2, 0]} color="#eceff1" rough={0.35} seg={20} />
      <Cyl r={0.42} r2={0.12} h={0.55} pos={[0, L - 0.43, 0]} color="#cfd8dc" rough={0.4} seg={20} />
      <Cyl r={0.1} r2={0.04} h={0.16} pos={[0, L - 0.08, 0]} color={ink} rough={0.5} seg={12} />
    </group>
  )
}

export default { type: 'caneta', Model }
