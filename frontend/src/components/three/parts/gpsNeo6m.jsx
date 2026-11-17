// GPS GY-GPS6MV2: placa azul de 36 × 26 mm com o módulo u-blox NEO-6M (lata metálica),
// pilha de backup, LED de posição (PPS) e a antena cerâmica de 25 × 25 mm colada por cima.
import { Box, Cyl, HeaderPins, useCanvasTexture, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/gpsNeo6m.js'
import { Glow2D } from './group-c-ui.jsx'

const L = 3.6
const D = 2.6
const T = 0.16
const BY = 0.0
const TOP = BY + T
const PX = 110
const LED = [-1.25, TOP + 0.04, 1.0]

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px Arial'
      for (const p of def.pins) {
        const [x, y] = at(p.pos[0] + 0.2, p.pos[2])
        ctx.fillText(p.id, x, y)
      }
      ctx.font = 'bold 10px Arial'
      const [tx, ty] = at(-1.3, -1.12)
      ctx.fillText('GY-GPS6MV2', tx, ty)
    },
    ['gps6m'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  const top = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#5a5a5a'
      ctx.textAlign = 'center'
      ctx.font = 'bold 30px Arial'
      ctx.fillText('u-blox', w / 2, h / 2 - 14)
      ctx.font = 'bold 26px Arial'
      ctx.fillText('NEO-6M-0-001', w / 2, h / 2 + 24)
    },
    ['gps-can'],
    256,
    128,
  )
  return (
    <group>
      <Box size={[L, T, D]} pos={[0, BY + T / 2, 0]} color="#1f4fb5" rough={0.5} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.15} h={T + 0.01} pos={[sx * (L / 2 - 0.25), BY + T / 2, sz * (D / 2 - 0.25)]} color="#d9b54a" metal={0.8} rough={0.3} seg={16} />
      ))}
      {/* módulo NEO-6M (16 × 12 mm, lata metálica), visível à esquerda da antena */}
      <Box size={[1.1, 0.24, 1.6]} pos={[-0.9, TOP + 0.12, -0.15]} color="#b9bcc0" metal={0.8} rough={0.35} />
      <mesh position={[-0.85, TOP + 0.243, -0.15]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[1.5, 0.75]} />
        <meshBasicMaterial map={top} transparent />
      </mesh>
      {/* pilha de backup (memória das efemérides: arranque rápido) */}
      <Cyl r={0.3} h={0.12} pos={[-0.85, TOP + 0.06, 0.95]} color="#c8c8c8" metal={0.7} rough={0.35} seg={24} />
      {/* antena cerâmica 25 × 25 × 4 mm à direita, com o elemento prateado e o pino de alimentação */}
      <Box size={[1.9, 0.08, 1.9]} pos={[0.72, TOP + 0.04, 0]} color="#e9dfc4" rough={0.7} />
      <Box size={[1.8, 0.32, 1.8]} pos={[0.72, TOP + 0.24, 0]} color="#d9c9a0" rough={0.8} />
      <Box size={[1.4, 0.01, 1.4]} pos={[0.72, TOP + 0.405, 0]} color="#d7d9db" metal={0.85} rough={0.3} />
      <Cyl r={0.06} h={0.03} pos={[0.92, TOP + 0.42, 0.2]} color="#b08d2a" metal={0.8} seg={12} />
      <GlowLed pos={LED} color="#2f9bff" read={() => (liveOf(part.id)?.pps ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  return <Glow2D info={info} pos={LED} color="#2f9bff" on={!!live?.pps} r={4} />
}

export default { type: 'gpsNeo6m', Model, Overlay2D }
