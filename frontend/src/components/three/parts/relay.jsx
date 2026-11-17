// Módulo relé: LED de alimentação, LED de entrada, armadura que se move e
// o estado dos contactos (COM–NO ou COM–NC) no 2D.
import { Box, Cyl, Pcb, HeaderPins, GlowLed, useFrame, useRef, useLabel, liveOf } from '../kit.jsx'
import def from '@shared/parts/relay.js'

const TERM = Object.fromEntries(def.pins.filter((p) => ['NO', 'COM', 'NC'].includes(p.id)).map((p) => [p.id, p.pos]))

function Model({ part }) {
  const arm = useRef()
  const label = useLabel([{ text: 'SRD-05VDC', font: 'bold 64px Arial' }, { text: '10A 250VAC', font: '44px Arial', y: 190 }], 512, 256)
  useFrame(() => {
    const closed = !!liveOf(part.id)?.closed
    if (arm.current) arm.current.rotation.x += ((closed ? -0.22 : 0.22) - arm.current.rotation.x) * 0.5
  })
  return (
    <group>
      <Pcb size={[5.0, 0.16, 2.6]} color="#1f5f9f" />
      {/* relé */}
      <Box size={[1.9, 1.55, 1.5]} pos={[0.1, 0.16 + 0.775, 0]} color="#1f6fd1" rough={0.4} />
      <mesh position={[0.1, 1.715, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 0.85]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* armadura (indicador do contacto móvel) */}
      <group position={[0.1, 1.75, 0.55]}>
        <group ref={arm}>
          <Box size={[0.9, 0.05, 0.12]} pos={[0, 0.04, 0]} color="#c9c9c9" metal={0.8} rough={0.3} />
        </group>
        <Cyl r={0.06} h={0.1} pos={[0, 0.02, 0]} rot={[0, 0, Math.PI / 2]} color="#888" metal={0.8} />
      </group>
      {/* bloco de terminais de parafuso */}
      <Box size={[0.8, 0.9, 1.55]} pos={[2.1, 0.16 + 0.45, 0]} color="#1a5fb4" />
      {Object.values(TERM).map((p, i) => (
        <Cyl key={i} r={0.17} h={0.06} pos={[p[0], 1.05, p[2]]} color="#cfcfcf" metal={0.9} rough={0.3} />
      ))}
      {/* transístor, díodo e LEDs */}
      <Box size={[0.35, 0.35, 0.15]} pos={[-1.4, 0.34, -0.6]} color="#111" />
      <Box size={[0.4, 0.15, 0.15]} pos={[-1.4, 0.24, 0.3]} color="#222" />
      <GlowLed pos={[-1.6, 0.21, 0.95]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <GlowLed pos={[-1.6, 0.21, -1.0]} color="#33ff55" read={() => (liveOf(part.id)?.coil ? 1 : 0)} />
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
