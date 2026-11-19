// Buzzer passivo: toca a frequência de tone() (live.freq) com WebAudio.
import { Box, Cyl, Leg, geo, mat, THREE, useFrame, useRef, liveOf } from '../kit.jsx'
import { simRef } from '../../../contexts/simRef.js'
import { toneVoice } from '../../../functions/audio.js'

const freqOf = (id) => (simRef.engine?.snap?.paused ? 0 : liveOf(id)?.freq || 0)

// buzzer passivo de 12 × 8,5 mm: caixa preta com o rebordo de cima boleado, furo de som ao
// centro, "+" em relevo junto à perna positiva e a placa verde à vista por baixo (os passivos
// não têm o selo de papel nem o enchimento de resina dos ativos)
const shell = () =>
  geo('buzzP', () => {
    const r = 0.6
    const h = 0.72
    const f = 0.06 // raio do boleado de cima
    const pts = [[0.13, h / 2 - 0.02], [0.13, h / 2], [r - f, h / 2]]
    for (let k = 1; k <= 5; k++) {
      const a = (k / 5) * (Math.PI / 2)
      pts.push([r - f + f * Math.sin(a), h / 2 - f + f * Math.cos(a)])
    }
    pts.push([r, -h / 2 + 0.02], [r - 0.02, -h / 2], [r - 0.08, -h / 2])
    // perfil de baixo para cima (normais para fora)
    return new THREE.LatheGeometry(pts.reverse().map(([x, y]) => new THREE.Vector2(x, y)), 40)
  })
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
      <Leg from={[-0.381, 0, 0]} to={[-0.381, 0.14, 0]} />
      <Leg from={[0.381, 0, 0]} to={[0.381, 0.14, 0]} />
      {/* placa verde à vista por baixo */}
      <Cyl r={0.54} h={0.05} pos={[0, 0.145, 0]} color="#1f7a3a" rough={0.5} seg={32} />
      <group ref={body} position={[0, 0.5, 0]}>
        <mesh geometry={shell()} material={mat('#151515', 0, 0.38)} castShadow receiveShadow />
        {/* fundo do furo de som (disco piezo lá dentro) */}
        <Cyl r={0.13} h={0.01} pos={[0, 0.3, 0]} color="#050505" seg={20} />
        <Cyl r={0.1} h={0.01} pos={[0, 0.31, 0]} color="#8a7a4a" metal={0.7} rough={0.4} seg={20} />
        {/* "+" moldado na tampa */}
        <Box size={[0.16, 0.012, 0.04]} pos={[-0.36, 0.362, 0]} color="#1d1d1d" />
        <Box size={[0.04, 0.012, 0.16]} pos={[-0.36, 0.362, 0]} color="#1d1d1d" />
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
