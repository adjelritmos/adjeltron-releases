// Engrenagem reta de módulo 1 (POM branco), com cubo de alumínio e parafuso de aperto.
import { Cyl } from '../kit.jsx'
import { Gear } from './_mechKit.jsx'
import { gearR, GEAR_M } from '@shared/parts/_mech.js'
import { SPUR, GEAR_WHITE } from '@shared/parts/spurGear.js'

function Model({ part }) {
  const z = part.config?.teeth ?? 20
  const r = gearR(z)
  const hubR = Math.min(0.55, r - 0.25)
  return (
    <group>
      <Gear z={z} m={GEAR_M} w={SPUR.W} color={part.config?.color || GEAR_WHITE} rough={0.45} bore={0.2} />
      {r > 1.3 && [0, 1, 2, 3].map((k) => <Cyl key={k} r={r * 0.17} h={SPUR.W + 0.02} pos={[Math.cos(k * Math.PI / 2 + 0.785) * r * 0.55, SPUR.W / 2, Math.sin(k * Math.PI / 2 + 0.785) * r * 0.55]} color="#2b2f33" seg={18} />)}
      <Cyl r={hubR} h={SPUR.HUB} pos={[0, SPUR.W + SPUR.HUB / 2, 0]} color="#b0bec5" metal={0.85} rough={0.3} seg={20} />
      <Cyl r={0.2} h={SPUR.HUB + SPUR.W + 0.02} pos={[0, (SPUR.HUB + SPUR.W) / 2, 0]} color="#111" seg={12} />
      <Cyl r={0.07} h={0.1} pos={[hubR, SPUR.W + SPUR.HUB / 2, 0]} rot={[0, 0, Math.PI / 2]} color="#222" seg={6} />
    </group>
  )
}

export default { type: 'spurGear', Model }
