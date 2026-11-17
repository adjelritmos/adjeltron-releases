// DHT11: caixa azul com grelha frontal e 4 pernas (mais pequena que o DHT22).
import { Box, RBox, Leg, useCanvasTexture } from '../kit.jsx'
import { setInput } from '../../../services/simControl.js'
import def from '@shared/parts/dht11.js'

const BODY = { y0: 0.3, h: 1.6, w: 1.2, t: 0.55 }
const SLOTS = []
for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) SLOTS.push([(c - 1) * 0.3, BODY.y0 + BODY.h - 0.25 - r * 0.17])

function drawFace(ctx, w, h) {
  ctx.fillStyle = '#2f73c9'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#e8f1ff'
  ctx.font = `bold ${Math.round(w * 0.2)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('DHT11', w / 2, h * 0.9)
}

function Model() {
  const tex = useCanvasTexture(drawFace, ['dht11'], 160, 220)
  const fx = BODY.t / 2
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, BODY.y0 + 0.05, p.pos[2]]} r={0.03} />
      ))}
      <RBox size={[BODY.t, BODY.h, BODY.w]} r={0.05} pos={[0, BODY.y0 + BODY.h / 2, 0]} color="#2f73c9" rough={0.6} />
      <mesh position={[fx + 0.002, BODY.y0 + BODY.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BODY.w - 0.05, BODY.h - 0.05]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {SLOTS.map(([z, y], i) => (
        <Box key={i} size={[0.03, 0.1, 0.18]} pos={[fx + 0.006, y, z]} color="#1b3f73" rough={0.8} />
      ))}
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const h = Math.round(input?.humidity ?? part.config?.humidity ?? 55)
  const [x, y] = info.project([0, BODY.y0 + BODY.h + 0.3, 0])
  const btn = (dx, d, label) => (
    <g
      transform={`translate(${x + dx},${y})`}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        setInput(part.id, { humidity: Math.max(0, Math.min(100, h + d)) })
      }}
    >
      <circle r={8} fill="#1f2937" stroke="#9ca3af" />
      <text textAnchor="middle" dy={4} fontSize={12} fill="#fff" pointerEvents="none">
        {label}
      </text>
    </g>
  )
  return (
    <g>
      <rect x={x - 24} y={y - 8} width={48} height={16} rx={4} fill="#0b3d5c" opacity={0.9} pointerEvents="none" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#e0f2fe" fontFamily="monospace" pointerEvents="none">
        HR {h}%
      </text>
      {btn(-36, -5, '−')}
      {btn(36, 5, '+')}
    </g>
  )
}

export default { type: 'dht11', Model, Overlay2D }
