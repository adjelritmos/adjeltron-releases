// HC-05: placa base azul de 44 × 16 mm com a placa Bluetooth verde (27 × 13 mm, antena
// impressa em ziguezague na ponta), LED de estado, botão EN e 6 pinos.
import { Box, Cyl, HeaderPins, useCanvasTexture, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/hc05.js'
import { Glow2D } from './group-c-ui.jsx'

const L = 4.4
const D = 1.6
const T = 0.16
const TOP = T
const PX = 120
const LED = [-1.2, TOP + 0.04, 0.55]

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 11px Arial'
      for (const p of def.pins) {
        const [x, y] = at(p.pos[0] + 0.18, p.pos[2])
        ctx.fillText(p.id, x, y)
      }
    },
    ['hc05'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  const bt = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#1d7a3a'
      ctx.fillRect(0, 0, w, h)
      // antena impressa (ziguezague dourado) na ponta direita
      ctx.strokeStyle = '#d4af37'
      ctx.lineWidth = 5
      ctx.beginPath()
      const x0 = w * 0.78
      for (let i = 0; i < 7; i++) {
        const y = 12 + (i * (h - 24)) / 6
        ctx.lineTo(i % 2 ? w - 10 : x0, y)
        ctx.lineTo(i % 2 ? x0 : w - 10, y)
      }
      ctx.stroke()
      // contactos castelados nas bordas
      ctx.fillStyle = '#d4af37'
      for (let i = 0; i < 13; i++) {
        ctx.fillRect(8 + i * 26, 0, 10, 8)
        ctx.fillRect(8 + i * 26, h - 8, 10, 8)
      }
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('HC-05', 150, h / 2 + 8)
    },
    ['hc05-bt'],
    512,
    246,
  )
  return (
    <group>
      <Box size={[L, T, D]} pos={[0, T / 2, 0]} color="#1f4fb5" rough={0.5} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* placa Bluetooth (BC417) */}
      <Box size={[2.7, 0.08, 1.3]} pos={[0.75, TOP + 0.04, 0]} color="#1d7a3a" rough={0.5} />
      <mesh position={[0.75, TOP + 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.7, 1.3]} />
        <meshBasicMaterial map={bt} />
      </mesh>
      <Box size={[0.7, 0.1, 0.7]} pos={[0.2, TOP + 0.13, 0]} color="#151515" rough={0.4} />
      <Box size={[0.45, 0.08, 0.35]} pos={[0.95, TOP + 0.12, 0.2]} color="#151515" rough={0.4} />
      {/* regulador de 3,3 V e botão EN (KEY) */}
      <Box size={[0.3, 0.12, 0.35]} pos={[-1.15, TOP + 0.06, -0.4]} color="#1a1a1a" />
      <Box size={[0.3, 0.12, 0.3]} pos={[-0.85, TOP + 0.06, 0.45]} color="#c9c9c9" metal={0.6} />
      <Cyl r={0.08} h={0.08} pos={[-0.85, TOP + 0.16, 0.45]} color="#222" seg={12} />
      <GlowLed pos={LED} color="#ff3030" read={() => (liveOf(part.id)?.led ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  return <Glow2D info={info} pos={LED} color="#ff3030" on={!!live?.led} r={4} />
}

export default { type: 'hc05', Model, Overlay2D }
