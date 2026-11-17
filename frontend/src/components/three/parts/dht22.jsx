// DHT22: caixa branca com grelha frontal e 4 pernas. No 2D há botões −/+ para a humidade.
import { Box, RBox, Cyl, Leg, useCanvasTexture } from '../kit.jsx'
import { setInput } from '../../../services/simControl.js'
import def from '@shared/parts/dht22.js'

const BODY = { y0: 0.3, h: 2.1, w: 1.51, t: 0.77 } // + patilha de 0,45 no topo (total 2,85)

function drawGrille(ctx, w, h) {
  ctx.fillStyle = '#f4f4f2'
  ctx.fillRect(0, 0, w, h)
  // contorno da grelha (as aberturas são geometria; aqui só o texto)
  ctx.fillStyle = '#333'
  ctx.font = `bold ${Math.round(w * 0.2)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('DHT22', w / 2, h * 0.84)
  ctx.font = `${Math.round(w * 0.11)}px Arial`
  ctx.fillText('AM2302', w / 2, h * 0.93)
}

// grelha: 4 × 9 aberturas retangulares na face da frente (+x)
const SLOTS = []
for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) SLOTS.push([(c - 1.5) * 0.31, BODY.y0 + BODY.h - 0.2 - r * 0.16])

function Model() {
  const tex = useCanvasTexture(drawGrille, ['dht-2'], 160, 264)
  const fx = BODY.t / 2
  return (
    <group>
      {/* pernas: sobem dos furos e entram no corpo */}
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, BODY.y0 + 0.05, p.pos[2]]} r={0.03} />
      ))}
      <RBox size={[BODY.t, BODY.h, BODY.w]} r={0.06} pos={[0, BODY.y0 + BODY.h / 2, 0]} color="#f4f4f2" rough={0.6} />
      {/* patilha de fixação com furo, no topo */}
      <RBox size={[0.3, 0.45, 0.9]} r={0.04} pos={[-0.18, BODY.y0 + BODY.h + 0.2, 0]} color="#f0f0ee" rough={0.6} />
      <Cyl r={0.15} h={0.32} pos={[-0.18, BODY.y0 + BODY.h + 0.25, 0]} rot={[0, 0, Math.PI / 2]} color="#3a3a3a" seg={16} />
      <mesh position={[fx + 0.002, BODY.y0 + BODY.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BODY.w - 0.06, BODY.h - 0.06]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {SLOTS.map(([z, y], i) => (
        <Box key={i} size={[0.03, 0.09, 0.2]} pos={[fx + 0.006, y, z]} color="#4a4d50" rough={0.8} />
      ))}
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const h = Math.round(input?.humidity ?? part.config?.humidity ?? 50)
  const [x, y] = info.project([0, BODY.y0 + BODY.h + 0.35, 0])
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

export default { type: 'dht22', Model, Overlay2D }
