// Módulo PCF8574: placa azul de 44 × 22 mm, chip DIP-16 ao centro, pontes A0–A2,
// cabeçalho I2C à esquerda e fila INT + P0–P7 em baixo.
import { Box, Cyl, HeaderPins, useCanvasTexture, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/pcf8574.js'
import { Glow2D } from './group-c-ui.jsx'

const L = 4.4
const D = 2.2
const T = 0.16
const BY = 0.2
const TOP = BY + T
const PX = 120

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px Arial'
      for (const p of def.pins) {
        const left = p.pos[2] < 0.5
        const [x, y] = left ? at(p.pos[0] + 0.34, p.pos[2]) : at(p.pos[0], p.pos[2] - 0.3)
        ctx.fillText(p.id, x, y)
      }
      ctx.font = 'bold 16px Arial'
      const [tx, ty] = at(0.95, -0.85)
      ctx.fillText('PCF8574 I/O', tx, ty)
      ctx.font = 'bold 12px Arial'
      const [ax, ay] = at(1.7, -0.1)
      ctx.fillText('A0 A1 A2', ax, ay)
    },
    ['pcf8574'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  const label = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#ddd'
      ctx.textAlign = 'center'
      ctx.font = 'bold 40px Arial'
      ctx.fillText('PCF8574', w / 2, h / 2 + 14)
    },
    ['pcf-chip'],
    256,
    64,
  )
  const addr = part.config?.addr ?? 0x20
  const bits = (addr & 7)
  return (
    <group>
      <Box size={[L, T, D]} pos={[0, BY + T / 2, 0]} color="#1f4fb5" rough={0.5} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {[[-1, -1], [1, -1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.14} h={T + 0.01} pos={[sx * (L / 2 - 0.28), BY + T / 2, sz * (D / 2 - 0.28)]} color="#d9b54a" metal={0.8} rough={0.3} seg={16} />
      ))}
      {/* chip PCF8574 (DIP-16) */}
      <Box size={[2.0, 0.32, 0.65]} pos={[0.1, TOP + 0.16, -0.25]} color="#151515" rough={0.45} />
      <mesh position={[0.1, TOP + 0.322, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 0.32]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* pontes de endereço A0–A2 (3 pinos cada; jumper no lado + ou −) */}
      {[0, 1, 2].map((k) => (
        <group key={k} position={[1.45 + k * 0.28, TOP, 0.25]}>
          <Box size={[0.24, 0.25, 0.72]} pos={[0, 0.125, 0]} color="#111" />
          <Box size={[0.22, 0.5, 0.48]} pos={[0, 0.4, (bits >> k) & 1 ? -0.12 : 0.12]} color="#2b2b2b" rough={0.5} />
        </group>
      ))}
      {/* LED de alimentação */}
      <GlowLed pos={[-1.4, TOP + 0.04, -0.75]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return <Glow2D info={info} pos={[-1.4, 0, -0.75]} color="#ff3030" on r={4} />
}

export default { type: 'pcf8574', Model, Overlay2D }
