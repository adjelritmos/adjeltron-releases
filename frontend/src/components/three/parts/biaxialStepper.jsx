// Motor de passo biaxial: corpo de 42 mm, dois veios concêntricos com ponteiros —
// exterior (motor 1, ponteiro curto vermelho) e interior (motor 2, ponteiro comprido branco).
import { Box, Cyl, RBox, Pcb, HeaderPins, Leg, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import def from '@shared/parts/biaxialStepper.js'

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
      <RBox size={[4.2, 0.6, 4.2]} r={0.25} pos={[0, 0.3, 0]} color="#c3c7cc" metal={0.8} rough={0.35} />
      <RBox size={[4.1, 1.9, 4.1]} r={0.3} pos={[0, 1.55, 0]} color="#1c1c1c" rough={0.6} />
      <RBox size={[4.2, 0.5, 4.2]} r={0.25} pos={[0, 2.75, 0]} color="#c3c7cc" metal={0.8} rough={0.35} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.2} h={0.06} pos={[sx * 1.55, 3.02, sz * 1.55]} color="#2a2a2a" seg={16} />
      ))}
      <Cyl r={0.9} h={0.18} pos={[0, 3.09, 0]} color="#d0d4d8" metal={0.85} rough={0.3} seg={40} />
      {/* veio exterior (tubo) + ponteiro curto */}
      <group ref={outer}>
        <Cyl r={0.32} h={0.55} pos={[0, 3.45, 0]} color="#b8bcc0" metal={0.9} rough={0.25} />
        <Box size={[0.22, 0.08, 1.5]} pos={[0, 3.62, -0.7]} color="#e53935" />
        <Cyl r={0.36} h={0.08} pos={[0, 3.62, 0]} color="#e53935" />
      </group>
      {/* veio interior + ponteiro comprido */}
      <group ref={inner}>
        <Cyl r={0.15} h={0.6} pos={[0, 3.9, 0]} color="#eef0f2" metal={0.95} rough={0.2} />
        <Box size={[0.14, 0.06, 2.2]} pos={[0, 3.95, -1.0]} color="#f5f5f5" />
        <Cyl r={0.22} h={0.08} pos={[0, 3.98, 0]} color="#222" />
      </group>
      {/* conector e cabos (8 fios) até à placa de ligação */}
      <Box size={[0.4, 0.55, 2.3]} pos={[-2.2, 0.55, 0]} color="#f2f2f2" />
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
