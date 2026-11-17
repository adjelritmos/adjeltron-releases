// Engrenagem dupla: roda grande (raios de reforço e furos de alívio, como as de plástico
// injetado) com o pinhão por cima, furo do veio no centro.
import { Cyl } from '../kit.jsx'
import { Gear } from './_mechKit.jsx'
import { gearR, GEAR_M } from '@shared/parts/_mech.js'
import { DUPLA } from '@shared/parts/compoundGear.js'
import { GEAR_WHITE } from '@shared/parts/spurGear.js'

function Model({ part }) {
  const c = part.config || {}
  const zb = c.big ?? 40
  const zs = c.small ?? 10
  const col = c.color || GEAR_WHITE
  const R = gearR(zb)
  const n = R > 2 ? 6 : 4
  return (
    <group>
      <Gear z={zb} m={GEAR_M} w={DUPLA.WB} color={col} rough={0.45} bore={0.2} />
      {/* furos de alívio na roda grande (veem-se através) */}
      {R > 1.4 &&
        Array.from({ length: n }, (_, k) => {
          const a = (k / n) * Math.PI * 2 + 0.3
          return <Cyl key={k} r={R * 0.16} h={DUPLA.WB + 0.02} pos={[Math.cos(a) * R * 0.55, DUPLA.WB / 2, Math.sin(a) * R * 0.55]} color="#2b2f33" seg={18} />
        })}
      {/* aro interior (reforço) e pinhão por cima */}
      <Cyl r={gearR(zs) + 0.12} h={0.08} pos={[0, DUPLA.WB + 0.04, 0]} color={col} rough={0.45} seg={28} />
      <Gear z={zs} m={GEAR_M} w={DUPLA.WS} y0={DUPLA.WB} color={col} rough={0.45} bore={0.2} />
      <Cyl r={0.2} h={DUPLA.WB + DUPLA.WS + 0.02} pos={[0, (DUPLA.WB + DUPLA.WS) / 2, 0]} color="#111" seg={12} />
    </group>
  )
}

export default { type: 'compoundGear', Model }
