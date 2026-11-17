// Pata do cão robô: bola de borracha preta com casquilho de alumínio.
import { Cyl } from '../kit.jsx'
import { PAW } from '@shared/parts/robotPaw.js'

function RobotPawModel() {
  return (
    <group>
      <mesh position={[0, PAW.r, 0]} castShadow>
        <sphereGeometry args={[PAW.r, 24, 16]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.95} />
      </mesh>
      <Cyl r={0.55} h={0.5} pos={[0, 2.0, 0]} color="#1f1f1f" rough={0.9} />
      <Cyl r={0.45} h={PAW.top - 2.1} pos={[0, (PAW.top + 2.1) / 2, 0]} color="#cfd8dc" metal={0.85} rough={0.3} />
    </group>
  )
}

export default { type: 'robotPaw', Model: RobotPawModel }
