// Interruptor deslizante SPDT (tipo SS12D00): base preta, tampa metálica e alavanca.
import { Box, Leg, PITCH, inputOf, useFrame, useRef } from '../kit.jsx'

const leverX = (on) => (on ? 0.13 : -0.13)
const isOn = (part) => !!(inputOf(part.id).on ?? part.config?.on)

function Model({ part }) {
  const lever = useRef()
  useFrame(() => {
    if (lever.current) lever.current.position.x = leverX(isOn(part))
  })
  return (
    <group>
      {[-PITCH, 0, PITCH].map((x) => (
        <Leg key={x} from={[x, 0, 0]} to={[x, 0.3, 0]} r={0.03} />
      ))}
      <Box size={[0.86, 0.2, 0.36]} pos={[0, 0.38, 0]} color="#1b1b1b" />
      <Box size={[0.87, 0.17, 0.37]} pos={[0, 0.565, 0]} color="#c9ccd0" metal={0.85} rough={0.3} />
      <Box size={[0.5, 0.01, 0.16]} pos={[0, 0.655, 0]} color="#222" />
      <group ref={lever} position={[leverX(!!part.config?.on), 0, 0]}>
        <Box size={[0.16, 0.32, 0.14]} pos={[0, 0.8, 0]} color="#111" />
      </group>
    </group>
  )
}

// a imagem 2D é estática: desenha a alavanca na posição atual
function Overlay2D({ part, info, input }) {
  const on = !!(input?.on ?? part.config?.on)
  const [x0, y0] = info.project([-0.27, 0, -0.09])
  const [x1, y1] = info.project([0.27, 0, 0.09])
  const [lx, ly] = info.project([leverX(on), 0, 0])
  const s = info.project([0.08, 0, 0.07])[0] - info.project([0, 0, 0])[0]
  return (
    <g pointerEvents="none">
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={2} fill="#2a2a2a" />
      <rect x={lx - s} y={ly - s} width={2 * s} height={2 * s} rx={1.5} fill="#0d0d0d" stroke="#777" strokeWidth={0.8} />
    </g>
  )
}

export default { type: 'slideSwitch', Model, Overlay2D }
