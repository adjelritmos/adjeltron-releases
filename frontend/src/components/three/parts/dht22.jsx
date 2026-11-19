// DHT22 (AM2302): caixa branca de 25,1 × 15,1 × 7,7 mm com a grelha frontal de 4 × 8
// aberturas (treliça saliente sobre a cavidade escura), patilha de fixação com furo de 3 mm
// no topo e 4 pernas. No 2D há botões −/+ para a humidade.
import { RBox, Leg, useCanvasTexture, THREE, geo, mat } from '../kit.jsx'
import { setInput } from '../../../services/simControl.js'
import def from '@shared/parts/dht22.js'
import { Grille } from './_analogModule.jsx'

const BODY = { y0: 0.3, h: 2.1, w: 1.51, t: 0.75 } // + patilha de 0,45 no topo (total 2,85)
const COLS = [-0.465, -0.155, 0.155, 0.465]
const ROWS = Array.from({ length: 8 }, (_, r) => BODY.y0 + BODY.h - 0.2 - r * 0.16)

function drawFace(ctx, w, h) {
  ctx.fillStyle = '#f4f4f2'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#3a3a3a'
  ctx.font = `bold ${Math.round(w * 0.18)}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('DHT22', w / 2, h * 0.86)
  ctx.font = `${Math.round(w * 0.1)}px Arial`
  ctx.fillText('AM2302', w / 2, h * 0.95)
}

// patilha de fixação (perfil arredondado no topo, com o furo de 3 mm) extrudida em x
const tabGeo = () =>
  geo('dht22tab', () => {
    const s = new THREE.Shape()
    s.moveTo(-0.45, 0)
    s.lineTo(0.45, 0)
    s.lineTo(0.45, 0.05)
    s.absarc(0, 0.05, 0.45, 0, Math.PI, false)
    s.lineTo(-0.45, 0)
    const hole = new THREE.Path()
    hole.absarc(0, 0.2, 0.14, 0, Math.PI * 2, true)
    s.holes.push(hole)
    // forma no plano zy (x da forma = z), espessura 0,3 ao longo de x
    return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 12 }).rotateY(Math.PI / 2).translate(-0.15, 0, 0)
  })

function Model() {
  const tex = useCanvasTexture(drawFace, ['dht-3'], 160, 264)
  const fx = BODY.t / 2
  return (
    <group>
      {/* pernas: sobem dos furos e entram no corpo */}
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, BODY.y0 + 0.05, p.pos[2]]} r={0.03} />
      ))}
      <RBox size={[BODY.t, BODY.h, BODY.w]} r={0.06} pos={[0, BODY.y0 + BODY.h / 2, 0]} color="#f4f4f2" rough={0.55} />
      {/* patilha de fixação com furo, no topo (recuada para trás, como no real) */}
      <mesh position={[-0.2, BODY.y0 + BODY.h - 0.02, 0]} castShadow geometry={tabGeo()} material={mat('#efefec', 0, 0.55)} />
      <mesh position={[fx + 0.001, BODY.y0 + BODY.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[BODY.w - 0.06, BODY.h - 0.06]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <Grille id="dht22" fx={fx} cols={COLS} rows={ROWS} cw={0.2} ch={0.09} depth={0.022} color="#f4f4f2" cavity="#2e3134" />
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
