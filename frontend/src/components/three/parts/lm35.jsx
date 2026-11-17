// LM35 em encapsulamento TO-92: face plana (com a marcação) virada para a frente (+x).
import { Box, Leg, useLabel } from '../kit.jsx'
import def from '@shared/parts/lm35.js'

function Model() {
  const label = useLabel([{ text: 'LM35', font: 'bold 64px Arial', y: 50 }, { text: 'DZ', font: '48px Arial', y: 110 }], 256, 160)
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, 0.5, p.pos[2] * 0.9]} />
      ))}
      <group position={[0.1, 0.5, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.5, 24, 1, false, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} side={2} />
        </mesh>
        <Box size={[0.01, 0.5, 0.48]} pos={[0, 0.25, 0]} color="#1c1c1c" />
        <mesh position={[0.006, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.4, 0.25]} />
          <meshBasicMaterial map={label} transparent />
        </mesh>
      </group>
    </group>
  )
}

// ligado ao contrário: aquece (e queima)
function Overlay2D({ info, live }) {
  if (!live?.hot && !live?.damaged) return null
  const [x, y] = info.project([0, 0.8, 0])
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={14} pointerEvents="none">
      {live.damaged ? '💥' : '🔥'}
    </text>
  )
}

export default { type: 'lm35', Model, Overlay2D }
