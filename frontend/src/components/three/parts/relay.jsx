// Módulo relé (tipo KY-019): LED de alimentação, LED de entrada, armadura que se move e
// o estado dos contactos (COM–NO ou COM–NC) no 2D.
import { Box, Cyl, Pcb, HeaderPins, GlowLed, SilkText, useFrame, useRef, liveOf } from '../kit.jsx'
import { MountHoles, SmdParts, ScrewBlock, SongleRelay, To92, Diode } from './_gDisplays.jsx'
import def from '@shared/parts/relay.js'

const TERM = Object.fromEntries(def.pins.filter((p) => ['NO', 'COM', 'NC'].includes(p.id)).map((p) => [p.id, p.pos]))

// módulo de 1 relé (50 × 26 mm, placa azul): relé Songle, borne de 3 parafusos, transístor
// S8050, díodo 1N4007 de roda livre, resistências SMD, LEDs de alimentação e de entrada
function Model({ part }) {
  const arm = useRef()
  useFrame(() => {
    const closed = !!liveOf(part.id)?.closed
    if (arm.current) arm.current.rotation.x += ((closed ? -0.22 : 0.22) - arm.current.rotation.x) * 0.5
  })
  const T = 0.16
  return (
    <group>
      <Pcb size={[5.0, T, 2.6]} color="#1f5f9f" holes={false} />
      <MountHoles pts={[[-2.1, -0.95], [-2.1, 0.95], [1.35, -0.95], [1.35, 0.95]]} y={T} r={0.15} ring={0.26} />
      {/* relé SRD-05VDC-SL-C */}
      <SongleRelay pos={[0.1, T, 0]} />
      {/* armadura (indicador do contacto móvel) */}
      <group position={[0.1, 1.75, 0.55]}>
        <group ref={arm}>
          <Box size={[0.9, 0.05, 0.12]} pos={[0, 0.04, 0]} color="#c9c9c9" metal={0.8} rough={0.3} />
        </group>
        <Cyl r={0.06} h={0.1} pos={[0, 0.02, 0]} rot={[0, 0, Math.PI / 2]} color="#888" metal={0.8} seg={12} />
      </group>
      {/* borne de 3 parafusos (NO, COM, NC), bocas viradas para o bordo */}
      <ScrewBlock pos={[2.1, T, 0]} rotY={-Math.PI / 2} />
      {/* transístor, díodo de roda livre, resistências e LEDs */}
      <To92 pos={[-1.25, T, -0.42]} rotY={Math.PI / 2} />
      <Diode pos={[-1.08, T, 0.3]} rotY={-Math.PI / 2} len={0.42} r={0.11} pitch={0.76} />
      <SmdParts list={[[-1.6, 0.68, 0, 'R'], [-1.6, -0.72, 0, 'R'], [-1.65, -0.2, Math.PI / 2, 'R']]} y={T} />
      <GlowLed pos={[-1.6, 0.21, 0.95]} size={[0.2, 0.07, 0.125]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <GlowLed pos={[-1.6, 0.21, -1.0]} size={[0.2, 0.07, 0.125]} color="#33ff55" read={() => (liveOf(part.id)?.coil ? 1 : 0)} />
      {/* serigrafia */}
      <SilkText lines={[{ text: 'VCC', font: 'bold 40px Arial', y: 32 }, { text: 'GND', font: 'bold 40px Arial', y: 110 }, { text: 'IN', font: 'bold 40px Arial', y: 188 }]} px={[96, 220]} pos={[-1.98, T + 0.002, 0]} w={0.3} d={0.75} />
      <SilkText lines={[{ text: 'NO', font: 'bold 40px Arial', y: 30 }, { text: 'COM', font: 'bold 40px Arial', y: 110 }, { text: 'NC', font: 'bold 40px Arial', y: 190 }]} px={[96, 220]} pos={[1.48, T + 0.002, 0]} w={0.24} d={1.2} />
      <SilkText text="1 Relay Module" pos={[0.1, T + 0.002, 1.1]} w={1.6} d={0.18} font="bold 40px Arial" px={[360, 48]} />
      <HeaderPins pins={def.pins.filter((p) => !TERM[p.id])} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  const [cx, cy] = info.project(TERM.COM)
  const [nox, noy] = info.project(TERM.NO)
  const [ncx, ncy] = info.project(TERM.NC)
  const [px, py] = info.project([-1.6, 0, 0.95])
  const [ix, iy] = info.project([-1.6, 0, -1.0])
  // contacto móvel desenhado ao lado dos terminais
  const ox = cx - 22
  const to = live.closed ? [ox, noy] : [ox, ncy]
  return (
    <g pointerEvents="none">
      {live.powered && <circle cx={px} cy={py} r={5} fill="#ff3030" opacity={0.85} filter="url(#glow)" />}
      {live.coil && <circle cx={ix} cy={iy} r={5} fill="#33ff55" opacity={0.85} filter="url(#glow)" />}
      <g stroke={live.closed ? '#22c55e' : '#f5f5f5'} strokeWidth={2.5} strokeLinecap="round">
        <line x1={cx} y1={cy} x2={ox} y2={cy} />
        <line x1={ox} y1={cy} x2={to[0]} y2={to[1]} />
        <line x1={ox} y1={to[1]} x2={live.closed ? nox : ncx} y2={to[1]} />
      </g>
      <text x={ox - 4} y={cy + 3} textAnchor="end" fontSize={9} fontWeight="700" fill="#fff" stroke="#000" strokeWidth={2.5} paintOrder="stroke">
        {live.closed ? 'NO' : 'NC'}
      </text>
    </g>
  )
}

export default { type: 'relay', Model, Overlay2D }
