// TCS34725: placa azul de 20 × 20 mm com o sensor ao centro e o LED branco ao lado.
import { Box, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/tcs34725.js'
import { i2cModuleUI, Silk } from './_groupG.jsx'

function Sensor({ part, T }) {
  return (
    <group>
      <Box size={[0.25, 0.08, 0.2]} pos={[0, T + 0.04, -0.2]} color="#2a1d0e" />
      <Box size={[0.12, 0.01, 0.1]} pos={[0, T + 0.085, -0.2]} color="#7aa6d8" metal={0.3} rough={0.2} />
      <GlowLed pos={[0.4, T + 0.06, -0.2]} size={[0.3, 0.12, 0.3]} color="#fffbe6" read={() => (liveOf(part.id)?.led ? 1 : 0)} />
      <Silk text="TCS34725" pos={[0, T + 0.003, 0.25]} w={1.1} h={0.18} />
    </group>
  )
}

const ui = i2cModuleUI({ def, board: { x: [-1.0, 1.0], z: [-1.0, 1.0], color: '#1f4fb4' }, Sensor, holes: [[-0.75, -0.75], [0.75, -0.75]], led: [-0.6, -0.2] })

function Overlay2D({ part, info, input }) {
  const c = ['r', 'g', 'b'].map((k) => Math.round(input?.[k] ?? part.config?.[k] ?? 0))
  const [x, y] = info.project([0, 0, -0.2])
  return <circle cx={x} cy={y} r={9} fill={`rgb(${c.join(',')})`} stroke="#fff" strokeWidth={1.2} opacity={0.85} pointerEvents="none" />
}

export default { ...ui, Overlay2D }
