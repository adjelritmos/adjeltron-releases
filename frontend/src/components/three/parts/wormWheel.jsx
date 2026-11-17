// Coroa do sem-fim: roda dentada com a orla côncava (o sem-fim encaixa no "vale") e cubo.
import { Cyl } from '../kit.jsx'
import { Gear } from './_mechKit.jsx'
import { gearR, GEAR_M } from '@shared/parts/_mech.js'
import { COROA } from '@shared/parts/wormWheel.js'
import { GEAR_WHITE } from '@shared/parts/spurGear.js'

function Model({ part }) {
  const z = part.config?.teeth ?? 30
  const col = part.config?.color || GEAR_WHITE
  const r = gearR(z)
  const hubR = Math.min(0.55, r - 0.3)
  return (
    <group>
      {/* dentes em duas camadas ligeiramente rodadas: lembram os dentes inclinados da coroa */}
      <Gear z={z} m={GEAR_M} w={COROA.W / 2} color={col} rough={0.45} bore={0.2} />
      <group rotation={[0, Math.PI / z / 2, 0]}>
        <Gear z={z} m={GEAR_M} w={COROA.W / 2} y0={COROA.W / 2} color={col} rough={0.45} bore={0.2} />
      </group>
      {r > 1.3 && [0, 1, 2, 3].map((k) => <Cyl key={k} r={r * 0.16} h={COROA.W + 0.02} pos={[Math.cos(k * Math.PI / 2 + 0.785) * r * 0.55, COROA.W / 2, Math.sin(k * Math.PI / 2 + 0.785) * r * 0.55]} color="#2b2f33" seg={18} />)}
      <Cyl r={hubR} h={COROA.HUB} pos={[0, COROA.W + COROA.HUB / 2, 0]} color="#b0bec5" metal={0.85} rough={0.3} seg={20} />
      <Cyl r={0.2} h={COROA.HUB + COROA.W + 0.02} pos={[0, (COROA.HUB + COROA.W) / 2, 0]} color="#111" seg={12} />
    </group>
  )
}

export default { type: 'wormWheel', Model }
