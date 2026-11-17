// Termístor NTC (tipo MF52): pequena gota de epóxi preto com duas pernas.
import { Leg, PITCH } from '../kit.jsx'

function Model() {
  return (
    <group>
      {[-0.5, 0.5].map((k) => (
        <Leg key={k} from={[k * PITCH, 0, 0]} to={[k * 0.06, 0.5, 0]} r={0.02} />
      ))}
      <mesh position={[0, 0.58, 0]} scale={[1, 1.15, 0.8]} castShadow>
        <sphereGeometry args={[0.15, 20, 14]} />
        <meshStandardMaterial color="#141414" roughness={0.25} />
      </mesh>
    </group>
  )
}

export default { type: 'ntc', Model }
