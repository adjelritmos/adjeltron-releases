// Motor de passo 28BYJ-48 + placa ULN2003. O ponteiro no veio roda com live.angle;
// os LEDs A–D da placa mostram as bobinas ligadas.
import { Box, Cyl, Leg, Pcb, HeaderPins, Glow, useLabel, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import def from '@shared/parts/stepper.js'
import { Badge, Glow2D, fmt } from './group-c-ui.jsx'

const MOTOR = [0, 0, -1.9] // centro do corpo do motor
const SHAFT = [0.8, 0, -1.9] // veio excêntrico (8 mm do centro)
const BOARD_Y = 0.55
const LEDS = [1.0, 1.35, 1.7, 2.05].map((z) => [1.25, BOARD_Y + 0.2, z])
const WIRES = ['#1e63d6', '#e86fb0', '#f2d21b', '#f08a1a', '#e53935']

function Model({ part }) {
  const arrow = useRef()
  const label = useLabel([{ text: 'ULN2003', font: 'bold 70px Arial' }], 512, 128)
  useFrame(() => {
    const L = liveOf(part.id)
    if (arrow.current) arrow.current.rotation.y = -(L?.angle || 0) * D2R
  })
  const coil = (k) => () => (liveOf(part.id)?.coils?.[k] ? 1 : 0)
  return (
    <group>
      {/* motor: corpo metálico, orelhas de fixação e tampa azul do redutor */}
      <Cyl r={1.4} h={1.9} pos={[MOTOR[0], 0.95, MOTOR[2]]} color="#c3c7cc" metal={0.85} rough={0.35} seg={40} />
      <Box size={[4.2, 0.08, 0.7]} pos={[0, 1.86, MOTOR[2]]} color="#b8bcc2" metal={0.85} rough={0.35} />
      {[-1.75, 1.75].map((x) => (
        <Cyl key={x} r={0.36} h={0.09} pos={[x, 1.86, MOTOR[2]]} color="#b8bcc2" metal={0.85} rough={0.35} />
      ))}
      {[-1.75, 1.75].map((x) => (
        <Cyl key={`h${x}`} r={0.2} h={0.1} pos={[x, 1.87, MOTOR[2]]} color="#222" />
      ))}
      <Cyl r={0.95} h={0.25} pos={[0.45, 2.02, MOTOR[2]]} color="#2457c5" rough={0.5} />
      <Cyl r={0.45} h={0.25} pos={[SHAFT[0], 2.25, SHAFT[2]]} color="#2457c5" rough={0.5} />
      {/* caixa de saída dos fios, virada para a placa */}
      <Box size={[1.6, 0.9, 0.5]} pos={[0, 0.6, -0.45]} color="#2457c5" rough={0.5} />
      {WIRES.map((c, i) => (
        <Leg key={c} from={[-0.5 + i * 0.25, 0.6, -0.25]} to={[-0.5 + i * 0.25, BOARD_Y + 0.3, 0.7]} r={0.05} color={c} />
      ))}
      {/* veio e ponteiro (rodam) */}
      <group ref={arrow} position={[SHAFT[0], 2.37, SHAFT[2]]}>
        <Box size={[0.3, 0.55, 0.2]} pos={[0, 0.27, 0]} color="#d9dde2" metal={0.9} rough={0.25} />
        <Box size={[1.5, 0.08, 0.22]} pos={[0.55, 0.5, 0]} color="#f5f5f5" />
        <Box size={[0.35, 0.09, 0.3]} pos={[1.25, 0.5, 0]} color="#e53935" />
        <Cyl r={0.2} h={0.1} pos={[0, 0.5, 0]} color="#e53935" />
      </group>
      {/* placa ULN2003 */}
      <Pcb size={[3.2, 0.16, 3.5]} pos={[0, BOARD_Y - 0.16, 2.2]} color="#1f7a3a" />
      <Box size={[0.65, 0.3, 1.95]} pos={[0.1, BOARD_Y + 0.15, 2.45]} color="#151515" />
      <mesh position={[0.1, BOARD_Y + 0.31, 2.45]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[1.8, 0.45]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      <Box size={[1.45, 0.6, 0.55]} pos={[0, BOARD_Y + 0.3, 0.75]} color="#f2f2f2" rough={0.6} />
      {LEDS.map((p, k) => (
        <Glow key={k} pos={p} color="#ff2a2a" base="#5a1a1a" read={coil(k)}>
          <boxGeometry args={[0.2, 0.12, 0.14]} />
        </Glow>
      ))}
      <HeaderPins pins={def.pins} base={BOARD_Y} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return (
    <g pointerEvents="none">
      {LEDS.map((p, k) => (
        <Glow2D key={k} info={info} pos={p} color="#ff3030" on={live.coils?.[k]} r={4} />
      ))}
      <Badge info={info} text={`${fmt(live.angle, 1)}° · ${fmt(live.rpm, 1)} rpm`} color={Math.abs(live.rpm || 0) > 0.2 ? '#f5f5f5' : '#404040'} />
    </g>
  )
}

export default { type: 'stepper', Model, Overlay2D }
