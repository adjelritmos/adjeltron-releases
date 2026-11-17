// TCS3200 (GY-31): placa preta quadrada com 4 LEDs brancos à volta do sensor e um anel
// de plástico; o 2D mostra a cor do objeto e o filtro ativo.
import { Box, Cyl, Pcb, HeaderPins, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/tcs3200.js'
import { Silk, Smd } from './_groupG.jsx'

const T = 0.16

function Model({ part }) {
  const on = () => (liveOf(part.id)?.powered ? 1 : 0)
  return (
    <group>
      <Pcb size={[2.8, T, 2.8]} color="#121212" />
      <Box size={[0.55, 0.12, 0.55]} pos={[0.2, T + 0.06, 0]} color="#3a2a12" />
      <Box size={[0.3, 0.02, 0.3]} pos={[0.2, T + 0.13, 0]} color="#5b9bd5" metal={0.3} rough={0.2} />
      <mesh position={[0.2, T + 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.08, 10, 32]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.5} />
      </mesh>
      {[[-0.55, -0.75], [-0.55, 0.75], [0.95, -0.75], [0.95, 0.75]].map(([x, z], i) => (
        <GlowLed key={i} pos={[x, T + 0.08, z]} size={[0.5, 0.16, 0.5]} color="#fffbe6" read={on} />
      ))}
      {[[-0.7, 0], [0.95, 0], [0.2, -1.1], [0.2, 1.1]].map(([x, z], i) => (
        <Smd key={i} pos={[x, T, z]} rot={Math.PI / 2} />
      ))}
      <Silk text="GY-31 TCS3200" pos={[1.2, T + 0.003, 0]} w={1.6} h={0.2} rot={Math.PI / 2} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live, input }) {
  const c = ['r', 'g', 'b'].map((k) => Math.round(input?.[k] ?? part.config?.[k] ?? 0))
  const [x, y] = info.project([0.2, 0, 0])
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={14} fill={`rgb(${c.join(',')})`} stroke="#fff" strokeWidth={1.5} opacity={0.9} />
      {live?.powered && live.filter && (
        <text x={x} y={y + 30} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff" fontFamily="monospace">
          {live.filter} {live.hz > 999 ? `${(live.hz / 1000).toFixed(1)} kHz` : `${live.hz} Hz`}
        </text>
      )}
    </g>
  )
}

export default { type: 'tcs3200', Model, Overlay2D }
