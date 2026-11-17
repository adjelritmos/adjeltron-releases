// Célula de carga de 5 kg (barra de alumínio) + amplificador HX711. Com massa > 0
// aparece um peso de latão na ponta livre da célula (altura proporcional à massa).
import { Box, Cyl, Leg, Pcb, HeaderPins, useFrame, useRef, inputOf, useLabel } from '../kit.jsx'
import def from '@shared/parts/hx711.js'
import { Chip } from './_analogModule.jsx'

const T = 0.16
const BAR = { x: [-6.0, 2.0], s: 1.27, y0: 0.35 }
const BAR_TOP = BAR.y0 + BAR.s
const FREE_X = -4.6 // centro do peso
const WIRES = [['#e53935', -0.45], ['#1a1a1a', -0.15], ['#f5f5f5', 0.15], ['#2e9d3a', 0.45]]

function Model({ part }) {
  const weight = useRef()
  const label = useLabel([{ text: 'HX711', font: 'bold 80px Arial' }], 256, 96)
  useFrame(() => {
    const g = Math.max(0, Math.min(5000, inputOf(part.id).value || 0))
    const m = weight.current
    if (!m) return
    m.visible = g > 0
    const h = 0.25 + (2.2 * g) / 5000
    m.scale.y = h
    m.position.y = BAR_TOP + h / 2
  })
  const bx = (BAR.x[0] + BAR.x[1]) / 2
  return (
    <group>
      {/* barra de alumínio apoiada na ponta fixa */}
      <Box size={[1.8, BAR.y0, 1.27]} pos={[1.1, BAR.y0 / 2, 0]} color="#3a3a3a" />
      <Box size={[BAR.x[1] - BAR.x[0], BAR.s, BAR.s]} pos={[bx, BAR.y0 + BAR.s / 2, 0]} color="#c9cdd2" metal={0.75} rough={0.35} />
      {[-5.5, -4.8, 0.6, 1.3].map((x) => (
        <Cyl key={x} r={0.22} h={0.02} pos={[x, BAR_TOP + 0.005, 0]} color="#222" seg={16} />
      ))}
      {/* extensómetros cobertos de silicone branco */}
      <Box size={[1.7, 0.08, 0.95]} pos={[-2.0, BAR_TOP + 0.04, 0]} color="#f2f2f0" rough={0.9} />
      <Box size={[1.2, 0.06, 0.7]} pos={[-2.0, BAR_TOP + 0.1, 0]} color="#fafafa" rough={0.9} />
      {/* fios até à placa */}
      {WIRES.map(([c, z]) => (
        <Leg key={c} from={[-1.2, BAR_TOP + 0.1, z * 0.5]} to={[2.4, T + 0.08, z * 1.4]} r={0.04} color={c} />
      ))}
      {/* placa HX711 */}
      <Pcb size={[2.7, T, 2.0]} pos={[3.55, 0, 0]} color="#1f7a3a" holes={false} />
      {WIRES.map(([c, z]) => (
        <Cyl key={c} r={0.1} h={0.05} pos={[2.4, T + 0.02, z * 1.4]} color="#c9a227" metal={0.8} seg={10} />
      ))}
      <Chip pos={[3.45, T, 0.1]} size={[0.75, 0.15, 0.5]} />
      <mesh position={[3.45, T + 0.152, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.65, 0.25]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      <Box size={[0.3, 0.12, 0.2]} pos={[3.4, T + 0.06, -0.7]} color="#222" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      {/* peso de latão (escala y = altura) */}
      <mesh ref={weight} visible={false} position={[FREE_X, BAR_TOP + 0.5, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 1, 32]} />
        <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Overlay2D({ info, input }) {
  const g = input?.value || 0
  if (g <= 0) return null
  const [cx, cy] = info.project([FREE_X, 0, 0])
  const [rx] = info.project([FREE_X + 0.85, 0, 0])
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={Math.abs(rx - cx)} fill="#c9a227" stroke="#7a5e10" strokeWidth={1.5} />
      <circle cx={cx - 5} cy={cy - 5} r={Math.abs(rx - cx) * 0.35} fill="#fff" opacity={0.25} />
    </g>
  )
}

export default { type: 'hx711', Model, Overlay2D }
