// DS18B20 em TO-92: face plana (com a marcação) virada para a frente (+x).
import { Box, Leg, useLabel } from '../kit.jsx'
import def from '@shared/parts/ds18b20.js'

function Model() {
  const label = useLabel([{ text: 'DS18', font: 'bold 72px Arial', y: 50 }, { text: 'B20', font: 'bold 72px Arial', y: 120 }], 256, 160)
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, 0.5, p.pos[2] * 0.9]} />
      ))}
      <group position={[0.1, 0.5, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.5, 24, 1, false, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#2c2c2c" roughness={0.45} side={2} />
        </mesh>
        <Box size={[0.01, 0.5, 0.48]} pos={[0, 0.25, 0]} color="#303030" />
        <mesh position={[0.006, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.44, 0.275]} />
          <meshBasicMaterial map={label} transparent />
        </mesh>
      </group>
    </group>
  )
}

export default { type: 'ds18b20', Model }
