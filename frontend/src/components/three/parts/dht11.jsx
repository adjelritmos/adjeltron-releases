// DHT11: caixa azul de 15,5 × 12 × 5,5 mm com a grelha frontal saliente (treliça com a
// cavidade escura por trás), base com os 4 furos das pernas e 4 pernas de 2,54 mm.
import { RBox, Leg, useCanvasTexture } from '../kit.jsx'
import { setInput } from '../../../services/simControl.js'
import def from '@shared/parts/dht11.js'
import { Grille } from './_analogModule.jsx'

const BODY = { y0: 0.3, h: 1.6, w: 1.2, t: 0.52 }
const COLS = [-0.3, 0, 0.3]
const ROWS = Array.from({ length: 6 }, (_, r) => BODY.y0 + BODY.h - 0.25 - r * 0.17)

function drawFace(ctx, w, h) {
  ctx.fillStyle = '#2f73c9'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#d7e6fb'
  ctx.font = `bold ${Math.round(w * 0.17)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('DHT11', w / 2, h * 0.92)
}

function Model() {
  const tex = useCanvasTexture(drawFace, ['dht11b'], 160, 220)
  const fx = BODY.t / 2
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, BODY.y0 + 0.05, p.pos[2]]} r={0.03} />
      ))}
      {/* base mais estreita (por onde saem as pernas) e corpo */}
      <RBox size={[BODY.t - 0.08, 0.08, BODY.w - 0.1]} r={0.02} pos={[-0.02, BODY.y0 + 0.04, 0]} color="#2a68b8" rough={0.6} />
      <RBox size={[BODY.t, BODY.h - 0.06, BODY.w]} r={0.05} pos={[0, BODY.y0 + 0.06 + (BODY.h - 0.06) / 2, 0]} color="#2f73c9" rough={0.55} />
      <mesh position={[fx + 0.001, BODY.y0 + BODY.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BODY.w - 0.06, BODY.h - 0.06]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <Grille id="dht11" fx={fx} cols={COLS} rows={ROWS} cw={0.19} ch={0.1} depth={0.035} color="#2f73c9" cavity="#123155" />
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
