// Transístor 2N2222 em TO-92: meio cilindro preto com a face plana virada para a frente (+x).
import { Leg, useLabel, PITCH } from '../kit.jsx'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

const Y0 = 0.36 // base do corpo (as pernas ficam à vista por baixo)
const H = 0.5
const R = 0.24

export function To92({ text, color = '#1b1b1b' }) {
  const label = useLabel([{ text, font: 'bold 64px Arial', y: 80 }, { text: 'NPN', font: 'bold 48px Arial', y: 170 }], 256, 256)
  return (
    <group>
      {[PITCH, 0, -PITCH].map((z) => (
        <Leg key={z} from={[0, 0, z]} to={[-0.05, Y0 + 0.02, z * 0.55]} r={0.022} />
      ))}
      <mesh position={[0, Y0 + H / 2, 0]} castShadow>
        <cylinderGeometry args={[R, R, H, 24, 1, false, Math.PI, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* face plana com a marcação */}
      <mesh position={[0.001, Y0 + H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2 * R, H]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.003, Y0 + H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2 * R * 0.9, H * 0.9]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </group>
  )
}

function Model() {
  return <To92 text="2N2222" />
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  if (!live.ic || live.ic < 0.0005) return null
  return <Badge info={info} text={`${fmt(live.ic * 1000, 0)} mA`} color={live.mode === 'ativo' ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'npn', Model, Overlay2D }
