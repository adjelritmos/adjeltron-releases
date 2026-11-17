// Recetor IR KY-022: VS1838B (cúpula preta) na ponta +x e LED vermelho que pisca ao receber.
import { Box, Pcb, HeaderPins, Leg, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/irReceiver.js'

const T = 0.16

function Model({ part }) {
  const blink = () => {
    const L = liveOf(part.id)
    if (!L?.powered) return 0
    return L.rx ? (Math.floor(performance.now() / 60) % 2 ? 1 : 0.25) : 0
  }
  return (
    <group>
      <Pcb size={[2.5, T, 1.5]} pos={[0.05, 0, 0]} color="#151515" holes={false} />
      {/* VS1838B: corpo com cúpula voltada para cima, pernas dobradas até à placa */}
      {[-0.254, 0, 0.254].map((z) => (
        <Leg key={z} from={[0.35, T, z]} to={[0.6, T + 0.25, z]} r={0.022} />
      ))}
      <group position={[0.92, T + 0.25, 0]}>
        <Box size={[0.65, 0.5, 0.75]} pos={[0, 0, 0]} color="#1c1c1c" rough={0.35} />
        <mesh position={[0.02, 0.25, 0]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#262626" roughness={0.2} metalness={0.1} />
        </mesh>
      </group>
      {/* resistência SMD e LED de sinal */}
      <Box size={[0.22, 0.06, 0.12]} pos={[-0.35, T + 0.03, 0.45]} color="#222" />
      <GlowLed pos={[-0.35, T + 0.04, -0.45]} size={[0.16, 0.08, 0.1]} color="#ff3030" read={blink} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered || !live.rx) return null
  const [x, y] = info.project([-0.35, 0.2, -0.45])
  return <circle cx={x} cy={y} r={5} fill="#ff3030" opacity={0.9} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'irReceiver', Model, Overlay2D }
