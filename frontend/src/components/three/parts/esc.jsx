// ESC de 30 A: placa em manga termorretrátil azul (arestas boleadas, apertada nas pontas sobre os
// fios, com o relevo dos MOSFETs e do condensador por baixo) e etiqueta branca, fios de silicone da
// bateria (vermelho/preto), cabo de servo (castanho/vermelho/laranja) com a ficha JR de 3 vias
// e 3 fios do motor com fichas bala douradas de 3,5 mm e manga termorretrátil.
import { Box, RBox, Cyl, Leg, useLabel, useFrame, useRef, liveOf } from '../kit.jsx'
import def from '@shared/parts/esc.js'
import { Badge } from './group-c-ui.jsx'

const BODY = [3.9, 0.75, 2.2]
const BX = 0.1
const pin = (id) => def.pins.find((p) => p.id === id).pos

function Model({ part }) {
  const label = useLabel([{ text: '30A ESC', font: 'bold 92px Arial', y: 95, color: '#1b2a4a' }, { text: 'BLHeli · 2-4S · BEC 5V/2A', font: '40px Arial', y: 200, color: '#1b2a4a' }], 512, 256)
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
      {/* manga termorretrátil: corpo boleado, relevos dos MOSFETs e do condensador, pontas apertadas */}
      <RBox size={BODY} r={0.22} pos={[BX, BODY[1] / 2 + 0.05, 0]} color="#1565c0" rough={0.32} />
      {[-0.55, -0.15, 0.25, 0.65].map((x) => (
        <RBox key={x} size={[0.32, 0.06, 0.5]} r={0.03} pos={[BX + x, BODY[1] + 0.04, 0.55]} color="#1565c0" rough={0.32} />
      ))}
      <RBox size={[0.9, 0.12, 0.5]} r={0.06} pos={[BX - 1.2, BODY[1] + 0.03, 0.5]} color="#1565c0" rough={0.32} />
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.3, BODY[1] * 0.7, BODY[2] * 0.82]} r={0.12} pos={[BX + s * (BODY[0] / 2 + 0.1), BODY[1] * 0.35 + 0.1, 0]} color="#1565c0" rough={0.32} />
      ))}
      {/* etiqueta branca colada por cima */}
      <Box size={[2.4, 0.006, 1.0]} pos={[BX + 0.1, BODY[1] + 0.053, -0.42]} color="#f4f4f2" rough={0.5} />
      <mesh position={[BX + 0.1, BODY[1] + 0.058, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 1.0]} />
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
      {/* ficha JR/Futaba de 3 vias (corpo preto com o rebordo e as 3 bocas) */}
      <RBox size={[0.3, 0.28, 0.8]} r={0.03} pos={[pin('5V')[0] - 0.05, pin('5V')[1], pin('5V')[2]]} color="#111" rough={0.5} />
      {[-0.254, 0, 0.254].map((dz) => (
        <Box key={dz} size={[0.01, 0.12, 0.12]} pos={[pin('5V')[0] - 0.2, pin('5V')[1], pin('5V')[2] + dz]} color="#000" />
      ))}
      {/* fases do motor com fichas bala douradas */}
      {['A', 'B', 'C'].map((id) => (
        <group key={id}>
          {lead(id, '#262626', 0.08)}
          {/* ficha bala de 3,5 mm (manga transparente azulada sobre a soldadura, ponta dourada) */}
          <Cyl r={0.12} h={0.25} pos={[pin(id)[0] - 0.25, pin(id)[1], pin(id)[2]]} rot={[0, 0, Math.PI / 2]} color="#1e88e5" rough={0.3} seg={12} />
          <Cyl r={0.1} h={0.3} pos={[pin(id)[0] - 0.02, pin(id)[1], pin(id)[2]]} rot={[0, 0, Math.PI / 2]} color="#d4af37" metal={1} rough={0.22} seg={12} />
          <Cyl r={0.06} r2={0.1} h={0.06} pos={[pin(id)[0] + 0.16, pin(id)[1], pin(id)[2]]} rot={[0, 0, Math.PI / 2]} color="#d4af37" metal={1} rough={0.22} seg={12} />
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
