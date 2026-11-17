// Veio de aço de 4 mm ao longo de +y, com casquilhos de fixação.
import { Cyl } from '../kit.jsx'
import { AXLE_R } from '@shared/parts/axle.js'

function Model({ part }) {
  const L = part.config?.length ?? 5
  return (
    <group>
      <Cyl r={AXLE_R} h={L} pos={[0, L / 2, 0]} color="#e3e6e8" metal={0.95} rough={0.18} seg={16} />
      <Cyl r={0.45} h={0.35} pos={[0, 0.18, 0]} color="#90a4ae" metal={0.85} rough={0.3} seg={18} />
      <Cyl r={0.08} h={0.3} pos={[0.42, 0.18, 0]} rot={[0, 0, Math.PI / 2]} color="#222" seg={8} />
    </group>
  )
}

export default { type: 'axle', Model }
