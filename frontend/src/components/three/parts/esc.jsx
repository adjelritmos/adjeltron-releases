// ESC de 30 A: placa em manga termorretrátil azul, fios da bateria (vermelho/preto),
// cabo de servo (castanho/vermelho/laranja) e 3 fios do motor com fichas bala.
import { Box, Cyl, Leg, useLabel, useFrame, useRef, liveOf } from '../kit.jsx'
import def from '@shared/parts/esc.js'
import { Badge } from './group-c-ui.jsx'

const BODY = [3.9, 0.75, 2.2]
const BX = 0.1
const pin = (id) => def.pins.find((p) => p.id === id).pos

function Model({ part }) {
  const label = useLabel([{ text: '30A ESC', font: 'bold 92px Arial', y: 95 }, { text: 'BLHeli · 2-4S · BEC 5V/2A', font: '40px Arial', y: 200 }], 512, 256)
  const led = useRef()
  useFrame(({ clock }) => {
    const L = liveOf(part.id)
    if (!led.current) return
    const mode = L?.mode
    // vermelho fixo à espera de sinal; a piscar a armar; verde armado
    const on = mode === 'armed' ? 1 : mode === 'arming' ? (Math.sin(clock.elapsedTime * 18) > 0 ? 1 : 0.1) : mode === 'wait' ? 0.8 : 0
    led.current.emissiveIntensity = on * 3
    led.current.color.set(mode === 'armed' ? '#22ee55' : on ? '#ff3030' : '#444')
    led.current.emissive.set(mode === 'armed' ? '#22ee55' : '#ff3030')
  })
  const lead = (id, color, r = 0.07) => {
    const p = pin(id)
    const from = [p[0] < 0 ? -BODY[0] / 2 + BX : BODY[0] / 2 + BX, 0.42, p[2] * 0.75]
    return <Leg key={id} from={from} to={[p[0], p[1], p[2]]} r={r} color={color} />
  }
  return (
    <group>
      <Box size={BODY} pos={[BX, BODY[1] / 2 + 0.05, 0]} color="#1565c0" rough={0.35} />
      <Box size={[BODY[0] - 0.4, 0.02, BODY[2] - 0.3]} pos={[BX, BODY[1] + 0.06, 0]} color="#0d47a1" rough={0.3} />
      <mesh position={[BX, BODY[1] + 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BODY[0] - 0.5, (BODY[0] - 0.5) / 2]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      <mesh position={[BX + 1.6, BODY[1] + 0.08, -0.85]}>
        <boxGeometry args={[0.16, 0.05, 0.12]} />
        <meshStandardMaterial ref={led} color="#444" emissive="#ff3030" emissiveIntensity={0} toneMapped={false} />
      </mesh>
      {/* bateria */}
      {lead('B+', '#e53935', 0.1)}
      {lead('B-', '#212121', 0.1)}
      {/* cabo de servo e ficha */}
      {lead('GND', '#6d4c41', 0.045)}
      {lead('5V', '#e53935', 0.045)}
      {lead('SIG', '#fb8c00', 0.045)}
      <Box size={[0.3, 0.28, 0.8]} pos={[pin('5V')[0] - 0.05, pin('5V')[1], pin('5V')[2]]} color="#111" />
      {/* fases do motor com fichas bala douradas */}
      {['A', 'B', 'C'].map((id) => (
        <group key={id}>
          {lead(id, '#262626', 0.08)}
          <Cyl r={0.11} h={0.45} pos={[pin(id)[0] - 0.1, pin(id)[1], pin(id)[2]]} rot={[0, 0, Math.PI / 2]} color="#d4af37" metal={0.9} rough={0.25} seg={12} />
        </group>
      ))}
    </group>
  )
}

const MODE = { off: 'sem bateria', wait: 'à espera (mín.)', arming: 'a armar…' }

function Overlay2D({ info, live }) {
  if (!live || live.mode === 'off') return null
  if (live.mode !== 'armed') return <Badge info={info} text={MODE[live.mode] || live.mode} color="#404040" />
  return <Badge info={info} text={`${live.us} µs · ${Math.round(live.throttle * 100)}% · ${String(live.i).replace('.', ',')} A`} />
}

export default { type: 'esc', Model, Overlay2D }
