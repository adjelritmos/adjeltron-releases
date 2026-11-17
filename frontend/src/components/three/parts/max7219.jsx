// Matriz 8×8 com MAX7219: linhas em live.rows (bit 7 = coluna 0, à esquerda).
import { Box, Pcb, HeaderPins } from '../kit.jsx'
import def from '@shared/parts/max7219.js'
import { LED_HEX, useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

const M = 3.2 // lado do bloco de LEDs (cm)
const P = M / 8

function draw(color) {
  return (ctx, w, h, L) => {
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, w, h)
    const c = w / 8
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < 8; k++) {
        const on = (L?.rows?.[r] ?? 0) & (0x80 >> k)
        ctx.beginPath()
        ctx.arc(k * c + c / 2, r * c + c / 2, c * 0.36, 0, Math.PI * 2)
        if (on) {
          ctx.globalAlpha = L.b ?? 1
          ctx.fillStyle = color
          ctx.shadowColor = color
          ctx.shadowBlur = c * 0.3
        } else ctx.fillStyle = '#2e2e2e'
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      }
    }
  }
}

function Model({ part }) {
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const tex = useLiveTexture(part.id, 256, 256, draw(color))
  return (
    <group>
      <Pcb size={[5.0, 0.16, 3.2]} color="#1f5f9f" />
      <Box size={[M, 0.95, M]} pos={[0, 0.16 + 0.475, 0]} color="#151515" rough={0.7} />
      <FacePlane tex={tex} w={M - 0.04} d={M - 0.04} pos={[0, 1.112, 0]} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live?.rows?.some((r) => r)) return null
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const dots = []
  for (let r = 0; r < 8; r++) {
    for (let k = 0; k < 8; k++) {
      if (!(live.rows[r] & (0x80 >> k))) continue
      const q = rectOf(info, -M / 2 + k * P, -M / 2 + r * P, -M / 2 + (k + 1) * P, -M / 2 + (r + 1) * P)
      dots.push(<circle key={r * 8 + k} cx={q.x + q.w / 2} cy={q.y + q.h / 2} r={q.w * 0.38} fill={color} opacity={0.35 + 0.65 * (live.b ?? 1)} />)
    }
  }
  return (
    <g pointerEvents="none" filter="url(#glow)">
      {dots}
    </g>
  )
}

export default { type: 'max7219', Model, Overlay2D }
