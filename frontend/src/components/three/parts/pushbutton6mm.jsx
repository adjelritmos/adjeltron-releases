// Botão tátil 6 × 6 mm: corpo preto, tampa metálica e botão redondo que desce ao premir.
import { Box, Cyl, Leg, inputOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/pushbutton6mm.js'

function Model({ part }) {
  const cap = useRef()
  useFrame(() => {
    if (cap.current) cap.current.position.y = inputOf(part.id).pressed ? 0.58 : 0.64
  })
  const color = part.config?.color || '#212121'
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[Math.sign(p.pos[0]) * 0.3, 0.2, p.pos[2]]} r={0.025} />
      ))}
      <Box size={[0.6, 0.35, 0.6]} pos={[0, 0.2 + 0.175, 0]} color="#1b1b1b" rough={0.6} />
      <Box size={[0.62, 0.03, 0.62]} pos={[0, 0.565, 0]} color="#c9ccd0" metal={0.85} rough={0.3} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.04} h={0.03} pos={[sx * 0.22, 0.585, sz * 0.22]} color="#111" seg={8} />
      ))}
      <group ref={cap} position={[0, 0.64, 0]}>
        <Cyl r={0.17} h={0.16} pos={[0, 0.0, 0]} color={color} rough={0.45} seg={24} />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.pressed) return null
  const [x, y] = info.project([0, 0, 0])
  return <circle cx={x} cy={y} r={8} fill="none" stroke="#ffb300" strokeWidth={2.5} pointerEvents="none" />
}

export default { type: 'pushbutton6mm', Model, Overlay2D }
