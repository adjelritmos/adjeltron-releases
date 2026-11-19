// LM35DZ em encapsulamento TO-92: face plana (com a marcação) virada para a frente (+x).
import { To92F } from './_groupF.jsx'
import def from '@shared/parts/lm35.js'

const PINS = def.pins.map((p) => p.pos)

function Model() {
  return <To92F line1="LM35" line2="DZ" x={0.14} pins={PINS} />
}

// ligado ao contrário: aquece (e queima)
function Overlay2D({ info, live }) {
  if (!live?.hot && !live?.damaged) return null
  const [x, y] = info.project([0, 0.8, 0])
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={14} pointerEvents="none">
      {live.damaged ? '💥' : '🔥'}
    </text>
  )
}

export default { type: 'lm35', Model, Overlay2D }
