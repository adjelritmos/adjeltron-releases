// Joystick KY-023: o manípulo inclina conforme o controlo X/Y e desce ao premir (SW).
import { Box, Cyl, Pcb, HeaderPins, inputOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/joystick.js'

const C = [0.35, 0, 0] // centro do mecanismo (cm)
const TILT = 0.45 // inclinação máxima (rad)

function Model({ part }) {
  const stick = useRef()
  useFrame(() => {
    const i = inputOf(part.id)
    const g = stick.current
    if (!g) return
    g.rotation.z = -((i.x ?? 0.5) - 0.5) * 2 * TILT
    g.rotation.x = ((i.y ?? 0.5) - 0.5) * 2 * TILT
    g.position.y = i.pressed ? 1.05 : 1.15
  })
  return (
    <group>
      <Pcb size={[3.4, 0.16, 2.6]} pos={[0.05, 0, 0]} color="#16213f" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      {/* potenciómetros X e Y */}
      <Box size={[1.0, 0.9, 0.45]} pos={[C[0], 0.61, -1.05]} color="#1c1c1c" />
      <Box size={[0.45, 0.9, 1.0]} pos={[C[0] + 1.05, 0.61, 0]} color="#1c1c1c" />
      {/* caixa do mecanismo (gimbal) */}
      <Box size={[1.6, 0.85, 1.6]} pos={[C[0], 0.585, 0]} color="#2b2b2b" />
      <Box size={[0.5, 0.35, 0.5]} pos={[C[0] - 0.95, 0.33, 0.8]} color="#e0e0e0" />
      <group ref={stick} position={[C[0], 1.15, 0]}>
        <Cyl r={0.55} r2={0.7} h={0.3} pos={[0, -0.1, 0]} color="#222" />
        <Cyl r={0.18} h={0.9} pos={[0, 0.4, 0]} color="#1a1a1a" />
        <Cyl r={1.1} r2={1.0} h={0.55} pos={[0, 1.05, 0]} color="#1e1e1e" rough={0.8} seg={32} />
        <Cyl r={0.85} h={0.04} pos={[0, 1.34, 0]} color="#2a2a2a" rough={0.95} seg={32} />
      </group>
    </group>
  )
}

// posição atual do manípulo vista de cima
function Overlay2D({ info, input }) {
  const x = input?.x ?? 0.5
  const y = input?.y ?? 0.5
  const [cx, cy] = info.project(C)
  const [px, py] = info.project([C[0] + (x - 0.5) * 1.4, 0, (y - 0.5) * 1.4])
  return (
    <g pointerEvents="none">
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
      <circle cx={px} cy={py} r={9} fill={input?.pressed ? '#ffb300' : '#ffffff'} fillOpacity={0.35} stroke="#fff" strokeWidth={1.5} />
    </g>
  )
}

export default { type: 'joystick', Model, Overlay2D }
