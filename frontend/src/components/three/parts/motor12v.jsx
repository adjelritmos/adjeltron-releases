// Motor 12 V JGA25-370 sem encoder: suporte em L, caixa redutora, lata do motor com a tampa
// e os terminais; o veio D roda com o mount "shaft".
import { Box, Cyl, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { Holes, ALU, rotX } from './_mechKit.jsx'
import { MotorOverlay } from './motorEnc.jsx'
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
      <Box size={[2.45, 0.25, 3.0]} pos={[-0.975, 0.125, 0]} color={ALU} metal={0.8} rough={0.35} />
      <Box size={[0.25, 2.8, 3.0]} pos={[0.125, 1.4, 0]} color={ALU} metal={0.8} rough={0.35} />
      <Holes pts={[[-1.8, 0.13, -1.0], [-1.8, 0.13, 1.0], [-0.6, 0.13, -1.0], [-0.6, 0.13, 1.0]]} r={0.15} h={0.27} />
      <Cyl r={JGA.gearR} h={2.1} pos={[-1.05, AY, 0]} rot={rotX} color="#d9dde0" metal={0.85} rough={0.3} seg={36} />
      {[-0.7, -1.4].map((x) => (
        <Cyl key={x} r={JGA.gearR + 0.02} h={0.06} pos={[x, AY, 0]} rot={rotX} color="#9ea7ad" metal={0.8} rough={0.35} seg={36} />
      ))}
      <mesh position={[-3.65, AY, 0]} rotation={rotX} scale={[1, 1, 0.84]} castShadow>
        <cylinderGeometry args={[1.22, 1.22, 3.1, 32]} />
        <meshStandardMaterial color="#c4c8cc" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* tampa de plástico preto com os dois terminais */}
      <Cyl r={1.1} h={0.35} pos={[-5.35, AY, 0]} rot={rotX} color="#1c1c1c" rough={0.6} seg={28} />
      {def.pins.map((p) => (
        <Box key={p.id} size={[0.12, 0.3, 0.12]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color="#d9a441" metal={0.9} rough={0.3} />
      ))}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={JGA.shaftR} h={1.0} pos={[0.75, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={16} />
        <Box size={[0.8, 0.06, 0.3]} pos={[0.85, 0.17, 0]} color="#bfc4c8" metal={0.9} rough={0.25} />
      </group>
      <Cyl r={0.45} h={0.12} pos={[0.31, AY, 0]} rot={rotX} color="#d0d4d8" metal={0.85} rough={0.3} seg={24} />
    </group>
  )
}

export default { type: 'motor12v', Model, Overlay2D: MotorOverlay }
