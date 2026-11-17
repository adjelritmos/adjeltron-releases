// Motor brushless 2205 (campânula a rodar) com hélice tripá de 5". A hélice roda com
// live.rpm (velocidade visível limitada, para não "parar" por aliasing) e, depressa,
// vira um disco translúcido. No estúdio (miniatura / imagem 2D) a hélice é mais pequena.
import { Box, Cyl, Leg, useFrame, useRef, liveOf } from '../kit.jsx'
import def, { PROP_R, PROP_Y } from '@shared/parts/brushless.js'
import { Badge } from './group-c-ui.jsx'

const BELL_R = 1.4
const pin = (id) => def.pins.find((p) => p.id === id).pos

function Model({ part }) {
  const prop = useRef()
  const bell = useRef()
  const blur = useRef()
  const studio = String(part.id).startsWith('__studio')
  const ccw = part.config?.spin === 'CCW'
  const R = studio ? 1.75 : PROP_R
  const color = ccw ? '#1aa3ff' : '#ff7a1a'
  useFrame((_, dt) => {
    const L = liveOf(part.id)
    const rpm = L?.rpm || 0
    const spin = L?.spin ?? (ccw ? -1 : 1)
    // CW visto de cima = rotação negativa em torno de +y
    const w = (-spin * Math.min(rpm, 700) * 2 * Math.PI) / 60
    if (prop.current) prop.current.rotation.y += w * dt
    if (bell.current) bell.current.rotation.y += w * dt
    if (blur.current) blur.current.opacity = Math.min(0.4, rpm / 9000)
  })
  return (
    <group>
      {/* base em cruz aparafusada ao braço */}
      {[0, Math.PI / 2].map((a) => (
        <Box key={a} size={[2.5, 0.25, 0.7]} pos={[0, 0.125, 0]} rot={[0, a + Math.PI / 4, 0]} color="#2b2b2b" metal={0.6} rough={0.4} />
      ))}
      <Cyl r={0.9} h={0.3} pos={[0, 0.3, 0]} color="#333" metal={0.6} rough={0.4} seg={32} />
      {/* enrolamentos visíveis por baixo da campânula */}
      <Cyl r={1.25} h={0.35} pos={[0, 0.55, 0]} color="#b5651d" metal={0.6} rough={0.35} seg={32} />
      {/* campânula (roda) */}
      <group ref={bell}>
        <Cyl r={BELL_R} h={1.15} pos={[0, 1.3, 0]} color="#1c1c1c" metal={0.7} rough={0.35} seg={36} />
        <Cyl r={BELL_R + 0.02} h={0.18} pos={[0, 1.8, 0]} color={color} metal={0.6} rough={0.35} seg={36} />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <Box key={k} size={[0.9, 0.04, 0.18]} pos={[Math.cos((k * Math.PI) / 3) * 0.75, 1.9, Math.sin((k * Math.PI) / 3) * 0.75]} rot={[0, -(k * Math.PI) / 3, 0]} color="#444" />
        ))}
      </group>
      {/* veio, porca e hélice */}
      <Cyl r={0.25} h={0.5} pos={[0, 2.1, 0]} color="#bbb" metal={0.9} rough={0.25} seg={16} />
      <group position={[0, PROP_Y, 0]}>
        <group ref={prop}>
          <Cyl r={0.55} h={0.4} color={color} rough={0.4} seg={24} />
          <Cyl r={0.3} h={0.35} pos={[0, 0.35, 0]} rot={[0, 0, 0]} color="#c0c0c0" metal={0.9} rough={0.3} seg={6} />
          {[0, 1, 2].map((k) => (
            <group key={k} rotation={[0, (k * 2 * Math.PI) / 3, 0]}>
              <mesh position={[R * 0.55, 0, 0]} rotation={[(ccw ? -1 : 1) * 0.28, 0, 0]} castShadow>
                <boxGeometry args={[R * 0.95, 0.07, R * 0.2]} />
                <meshStandardMaterial color={color} rough={0.45} transparent opacity={0.92} />
              </mesh>
            </group>
          ))}
        </group>
        <mesh>
          <cylinderGeometry args={[R, R, 0.02, 48]} />
          <meshStandardMaterial ref={blur} color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      {/* 3 fios das fases */}
      {['A', 'B', 'C'].map((id, i) => (
        <Leg key={id} from={[-0.7, 0.5, (i - 1) * 0.2]} to={pin(id)} r={0.06} color={['#1e1e1e', '#2a2a2a', '#151515'][i]} />
      ))}
      {['A', 'B', 'C'].map((id) => (
        <Cyl key={`b${id}`} r={0.08} h={0.25} pos={pin(id)} rot={[0, 0, Math.PI / 2]} color="#d4af37" metal={0.9} rough={0.25} seg={10} />
      ))}
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  const on = (live.rpm || 0) > 100
  return <Badge info={info} text={on ? `${Math.round(live.rpm / 100) / 10}k rpm · ${String(live.thrustN?.toFixed(1)).replace('.', ',')} N` : 'parado'} color={on ? '#f5f5f5' : '#404040'} />
}

export default { type: 'brushless', Model, Overlay2D }
