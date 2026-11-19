// Motor de passo biaxial (corpo NEMA 17 de 42 mm, curto): tampas de alumínio de cantos
// chanfrados, pacote de chapas, ressalto de centragem e dois veios concêntricos com ponteiros —
// exterior (tubo de latão, motor 1, ponteiro curto vermelho) e interior (aço, motor 2, ponteiro
// comprido branco). Ficha JST de 8 vias de lado e o cabo até à placa de ligação.
import { Box, Cyl, Pcb, HeaderPins, Leg, METAL, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import def from '@shared/parts/biaxialStepper.js'
import { NemaBody, NemaPlug } from './nema17.jsx'

const WIRES = ['#e53935', '#1e63d6', '#2e9d3a', '#1a1a1a']

function Model({ part }) {
  const outer = useRef()
  const inner = useRef()
  useFrame(() => {
    const L = liveOf(part.id)
    if (outer.current) outer.current.rotation.y = -(L?.a1 || 0) * D2R
    if (inner.current) inner.current.rotation.y = -(L?.a2 || 0) * D2R
  })
  return (
    <group>
      <NemaBody h={3.0} cap={0.55} s={4.2} label={false} />
      {/* ressalto de centragem e casquilho do veio exterior */}
      <Cyl r={0.9} h={0.18} pos={[0, 3.09, 0]} color="#d0d4d8" metal={0.9} rough={0.28} seg={40} />
      <Cyl r={0.42} h={0.03} pos={[0, 3.19, 0]} color="#7d8288" metal={1} rough={0.35} seg={24} />
      {/* veio exterior (tubo de latão) + ponteiro curto */}
      <group ref={outer}>
        <Cyl r={0.32} h={0.55} pos={[0, 3.45, 0]} color={METAL.brass} metal={1} rough={0.28} />
        <Cyl r={0.36} h={0.08} pos={[0, 3.62, 0]} color="#e53935" rough={0.45} />
        <Box size={[0.22, 0.08, 1.5]} pos={[0, 3.62, -0.7]} color="#e53935" rough={0.45} />
        <Cyl r={0.08} h={0.09} pos={[0, 3.62, -1.3]} color="#c62828" rough={0.45} seg={12} />
      </group>
      {/* veio interior (aço) + ponteiro comprido */}
      <group ref={inner}>
        <Cyl r={0.15} h={0.6} pos={[0, 3.9, 0]} color="#eef0f2" metal={1} rough={0.2} />
        <Box size={[0.14, 0.06, 2.2]} pos={[0, 3.95, -1.0]} color="#f5f5f5" rough={0.45} />
        <Box size={[0.14, 0.06, 0.5]} pos={[0, 3.95, 0.3]} color="#f5f5f5" rough={0.45} />
        <Cyl r={0.22} h={0.08} pos={[0, 3.98, 0]} color="#222" />
        <Cyl r={0.06} h={0.02} pos={[0, 4.03, 0]} color={METAL.nickel} metal={1} rough={0.3} seg={10} />
      </group>
      {/* ficha e cabos (8 fios) até à placa de ligação */}
      <NemaPlug w={2.3} />
      {def.pins.map((p, i) => (
        <Leg key={p.id} from={[-2.35, 0.55, p.pos[2] * 0.9]} to={[-2.4, 0.2, p.pos[2]]} r={0.04} color={WIRES[i % 4]} />
      ))}
      <Pcb size={[0.5, 0.16, 2.2]} pos={[-2.45, 0, 0]} color="#1f7a3a" holes={false} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  const [cx, cy] = info.project([0, 0, 0])
  const hand = (deg, len, w, c) => {
    const a = (deg * Math.PI) / 180
    return <line x1={cx} y1={cy} x2={cx + Math.sin(a) * len} y2={cy - Math.cos(a) * len} stroke={c} strokeWidth={w} strokeLinecap="round" />
  }
  return (
    <g pointerEvents="none">
      {hand(live.a1 || 0, 58, 8, '#e53935')}
      {hand(live.a2 || 0, 86, 5, '#f5f5f5')}
      <circle cx={cx} cy={cy} r={7} fill="#222" stroke="#999" />
    </g>
  )
}

export default { type: 'biaxialStepper', Model, Overlay2D }
