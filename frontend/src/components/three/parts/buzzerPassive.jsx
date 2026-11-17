// Buzzer passivo: toca a frequência de tone() (live.freq) com WebAudio.
import { Box, Cyl, Leg, useFrame, useRef, liveOf } from '../kit.jsx'
import { simRef } from '../../../contexts/simRef.js'
import { toneVoice } from '../../../functions/audio.js'

const freqOf = (id) => (simRef.engine?.snap?.paused ? 0 : liveOf(id)?.freq || 0)

function Model({ part }) {
  const body = useRef()
  useFrame(({ clock }) => {
    const f = freqOf(part.id)
    toneVoice(part.id, f)
    // pequena vibração visual enquanto toca
    if (body.current) body.current.position.y = f ? 0.5 + Math.sin(clock.elapsedTime * 90) * 0.006 : 0.5
  })
  return (
    <group>
      <Leg from={[-0.381, 0, 0]} to={[-0.381, 0.1, 0]} />
      <Leg from={[0.381, 0, 0]} to={[0.381, 0.1, 0]} />
      {/* placa verde à vista por baixo (os passivos não têm selo) */}
      <Cyl r={0.56} h={0.06} pos={[0, 0.12, 0]} color="#1f7a3a" />
      <group ref={body} position={[0, 0.5, 0]}>
        <Cyl r={0.6} h={0.72} color="#151515" rough={0.35} />
        <Cyl r={0.13} h={0.02} pos={[0, 0.37, 0]} color="#050505" />
        <Box size={[0.16, 0.02, 0.05]} pos={[-0.36, 0.37, 0]} color="#ddd" />
        <Box size={[0.05, 0.02, 0.16]} pos={[-0.36, 0.37, 0]} color="#ddd" />
      </group>
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  const f = simRef.engine?.snap?.paused ? 0 : live?.freq || 0
  toneVoice(part.id, f)
  if (!f) return null
  const txt = `♪ ${Math.round(f)} Hz`
  const w = txt.length * 6.5 + 14
  return (
    <g transform={`translate(0, ${-info.h / 2 - 12})`} pointerEvents="none">
      <rect x={-w / 2} y={-9} width={w} height={17} rx={8} fill="#db2777" opacity={0.94} />
      <text textAnchor="middle" y={4} fontSize={11} fill="#fff" fontWeight="700">
        {txt}
      </text>
    </g>
  )
}

export default { type: 'buzzerPassive', Model, Overlay2D }
