// Motor 12 V JGA25-370 sem encoder: suporte em L, caixa redutora metálica de Ø25 mm, lata do
// motor 370 com a tampa de plástico preta (casquilho, furos de ventilação, marca vermelha do +)
// e os dois terminais de latão furados; o veio D roda com o mount "shaft".
import { Box, Cyl, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { rotX } from './_mechKit.jsx'
import { MotorOverlay, JgaFront, JgaShaft } from './motorEnc.jsx'
import def from '@shared/parts/motor12v.js'
import { JGA } from '@shared/parts/motorEnc.js'

const AY = JGA.AY

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
  })
  return (
    <group>
      <JgaFront />
      {/* tampa de plástico preto: casquilho do rotor, ventilação e marca do + */}
      <Cyl r={1.1} h={0.33} pos={[-5.36, AY, 0]} rot={rotX} color="#1c1c1c" rough={0.55} seg={32} />
      <Cyl r={0.3} h={0.1} pos={[-5.56, AY, 0]} rot={rotX} color="#b9bfc4" metal={0.85} rough={0.3} seg={18} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.02, 0.16, 0.36]} pos={[-5.526, AY + s * 0.65, 0]} color="#050505" />
      ))}
      <Cyl r={0.07} h={0.02} pos={[-5.527, AY + 0.35, def.pins[0].pos[2]]} rot={rotX} color="#e53935" seg={12} />
      {/* terminais de latão com o furo de soldar */}
      {def.pins.map((p) => (
        <group key={p.id} position={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]}>
          <Box size={[0.3, 0.3, 0.05]} pos={[0.06, 0, 0]} color="#d9a441" metal={0.9} rough={0.3} />
          <Cyl r={0.05} h={0.06} pos={[0, 0.02, 0]} rot={[Math.PI / 2, 0, 0]} color="#151515" seg={10} />
        </group>
      ))}
      <group ref={shaft} position={[0, AY, 0]}>
        <JgaShaft />
      </group>
      <Cyl r={0.45} h={0.12} pos={[0.31, AY, 0]} rot={rotX} color="#d0d4d8" metal={0.85} rough={0.3} seg={24} />
    </group>
  )
}

export default { type: 'motor12v', Model, Overlay2D: MotorOverlay }
