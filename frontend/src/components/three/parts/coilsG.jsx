// Solenoide JF-0530B (estrutura em U, bobina de cobre e êmbolo que recolhe com live.x) e
// motor de vibração de moeda (treme com live.rpm).
import { Box, Cyl, Leg, useFrame, useRef, liveOf } from '../kit.jsx'
import solDef from '@shared/parts/solenoid.js'
import vibDef from '@shared/parts/vibrationMotor.js'

function SolenoidModel({ part }) {
  const plunger = useRef()
  useFrame(() => {
    const x = liveOf(part.id)?.x || 0
    if (plunger.current) plunger.current.position.x = 1.25 - x * 0.9
  })
  const y = 0.65
  return (
    <group>
      {/* estrutura metálica em U */}
      <Box size={[2.0, 0.08, 1.25]} pos={[0, 0.04, 0]} color="#b9bdc2" metal={0.85} rough={0.35} />
      <Box size={[0.08, 1.25, 1.25]} pos={[-0.96, 0.62, 0]} color="#b9bdc2" metal={0.85} rough={0.35} />
      <Box size={[0.08, 1.25, 1.25]} pos={[0.96, 0.62, 0]} color="#b9bdc2" metal={0.85} rough={0.35} />
      <Box size={[2.0, 0.08, 1.25]} pos={[0, 1.21, 0]} color="#b9bdc2" metal={0.85} rough={0.35} />
      {/* bobina */}
      <Cyl r={0.52} h={1.8} pos={[0, y, 0]} rot={[0, 0, Math.PI / 2]} color="#b8702e" metal={0.6} rough={0.4} seg={28} />
      <Cyl r={0.54} h={0.12} pos={[-0.85, y, 0]} rot={[0, 0, Math.PI / 2]} color="#111" seg={28} />
      <Cyl r={0.54} h={0.12} pos={[0.85, y, 0]} rot={[0, 0, Math.PI / 2]} color="#111" seg={28} />
      {/* êmbolo (sai pela frente, +x) com mola */}
      <group ref={plunger} position={[1.25, y, 0]}>
        <Cyl r={0.2} h={2.0} pos={[-0.4, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#d8dadd" metal={0.9} rough={0.25} />
        <Cyl r={0.3} h={0.1} pos={[0.55, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#c0c3c6" metal={0.9} rough={0.3} />
      </group>
      {[0, 1, 2, 3].map((i) => (
        <Cyl key={i} r={0.28} h={0.03} pos={[1.08 + i * 0.07, y, 0]} rot={[0, 0, Math.PI / 2]} color="#888" metal={0.9} />
      ))}
      {/* fios */}
      {solDef.pins.map((p, i) => (
        <Leg key={p.id} from={[-0.95, 0.3, (i - 0.5) * 0.3]} to={p.pos} r={0.04} color={i ? '#1a1a1a' : '#e53935'} />
      ))}
    </group>
  )
}

function VibModel({ part }) {
  const body = useRef()
  useFrame(({ clock }) => {
    const rpm = liveOf(part.id)?.rpm || 0
    const a = Math.min(1, rpm / 12000) * 0.025
    if (body.current) body.current.position.set(Math.sin(clock.elapsedTime * 377) * a, 0, Math.cos(clock.elapsedTime * 311) * a)
  })
  return (
    <group>
      <group ref={body}>
        <Cyl r={0.5} h={0.27} pos={[0, 0.135, 0]} color="#c9ccd0" metal={0.85} rough={0.3} seg={32} />
        <Cyl r={0.42} h={0.01} pos={[0, 0.275, 0]} color="#b0b3b7" metal={0.85} rough={0.35} seg={32} />
        <Box size={[0.3, 0.05, 0.25]} pos={[-0.5, 0.06, 0]} color="#1b1b1b" />
      </group>
      {vibDef.pins.map((p, i) => (
        <Leg key={p.id} from={[-0.6, 0.06, (i - 0.5) * 0.12]} to={p.pos} r={0.025} color={i ? '#1e63d6' : '#e53935'} />
      ))}
    </group>
  )
}

const badge = (info, text, on) => {
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y - 18} textAnchor="middle" fontSize={10} fontWeight="700" fill={on ? '#22c55e' : '#9ca3af'} stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">
      {text}
    </text>
  )
}

export default [
  { type: 'solenoid', Model: SolenoidModel, Overlay2D: ({ info, live }) => (live ? badge(info, live.pulled ? `recolhido ${(live.i * 1000).toFixed(0)} mA` : 'solto', live.pulled) : null) },
  { type: 'vibrationMotor', Model: VibModel, Overlay2D: ({ info, live }) => (live?.rpm > 100 ? badge(info, `${Math.round(live.rpm)} rpm`, true) : null) },
]
