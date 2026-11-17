// Espaçador hexagonal de latão M3 com parafuso no topo.
import { Cyl } from '../kit.jsx'
import { BRASS } from './_mechKit.jsx'

function Model({ part }) {
  const h = part.config?.height ?? 1
  return (
    <group>
      <Cyl r={0.317} h={h} pos={[0, h / 2, 0]} color={BRASS} metal={0.85} rough={0.3} seg={6} />
      <Cyl r={0.28} h={0.18} pos={[0, h + 0.09, 0]} color="#263238" metal={0.7} rough={0.4} seg={20} />
      <Cyl r={0.08} h={0.05} pos={[0, h + 0.2, 0]} color="#111" seg={6} />
    </group>
  )
}

export default { type: 'standoff', Model }
