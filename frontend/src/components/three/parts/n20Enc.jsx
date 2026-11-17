// Micro motor N20 com redutor e encoder magnético: corpo 12 × 10 mm, braçadeira de fixação,
// disco magnético (live.motorAngle) e placa com ficha de 6 vias. O veio D roda com o mount.
import { Box, Cyl, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { MotorOverlay } from './motorEnc.jsx'
import { rotX } from './_mechKit.jsx'
import def, { N20 } from '@shared/parts/n20Enc.js'

const AY = N20.AY
const WIRE = { 'M+': '#e53935', 'M-': '#f5f5f5', GND: '#212121', VCC: '#1e88e5', A: '#fdd835', B: '#43a047' }

function Model({ part }) {
  const shaft = useRef()
  const disc = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
    if (disc.current) disc.current.rotation.x = (liveOf(part.id)?.motorAngle || 0) * D2R
  })
  return (
    <group>
      {/* braçadeira de fixação (por cima do motor) */}
      <Box size={[0.9, 0.15, 2.0]} pos={[-1.7, 0.075, 0]} color="#37474f" metal={0.6} rough={0.4} />
      <Box size={[0.9, 1.2, 0.12]} pos={[-1.7, AY, 0.66]} color="#37474f" metal={0.6} rough={0.4} />
      <Box size={[0.9, 1.2, 0.12]} pos={[-1.7, AY, -0.66]} color="#37474f" metal={0.6} rough={0.4} />
      <Box size={[0.9, 0.12, 1.44]} pos={[-1.7, AY + 0.56, 0]} color="#37474f" metal={0.6} rough={0.4} />
      {/* redutor (placas + engrenagens à vista) */}
      <Box size={[0.95, N20.H, N20.W]} pos={[-0.475, AY, 0]} color="#d4af37" metal={0.85} rough={0.3} />
      <Box size={[0.08, N20.H + 0.02, N20.W + 0.02]} pos={[-0.04, AY, 0]} color="#e0e0e0" metal={0.85} rough={0.3} />
      <Box size={[0.08, N20.H + 0.02, N20.W + 0.02]} pos={[-0.9, AY, 0]} color="#e0e0e0" metal={0.85} rough={0.3} />
      {/* motor (lados achatados) */}
      <mesh position={[-1.7, AY, 0]} rotation={rotX} scale={[1, 1, 0.83]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.5, 24]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* placa do encoder e disco magnético */}
      <Box size={[0.1, 1.3, 1.5]} pos={[N20.pcbX, AY, 0]} color="#1b5e20" rough={0.6} />
      <group ref={disc} position={[-2.68, AY, 0]}>
        <Cyl r={0.35} h={0.12} rot={rotX} color="#424242" seg={20} />
        <Box size={[0.13, 0.3, 0.12]} pos={[0, 0.17, 0]} color="#c62828" />
      </group>
      <Box size={[0.3, 0.4, 1.3]} pos={[-2.9, AY, 0]} color="#f2f2f2" rough={0.5} />
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.08, 0.08, 0.08]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={WIRE[p.id]} />
      ))}
      {/* veio D de 3 mm */}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={N20.shaftR} h={1.0} pos={[0.5, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={14} />
        <Box size={[0.7, 0.04, 0.22]} pos={[0.6, 0.13, 0]} color="#bfc4c8" metal={0.9} rough={0.25} />
      </group>
    </group>
  )
}

export default { type: 'n20Enc', Model, Overlay2D: MotorOverlay }
