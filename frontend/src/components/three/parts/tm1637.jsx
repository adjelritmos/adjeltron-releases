// Display de 4 dígitos com TM1637: live.d = 4 bytes de segmentos (bit 7 do dígito 1 = dois pontos).
import { Box, Pcb, HeaderPins } from '../kit.jsx'
import def from '@shared/parts/tm1637.js'
import { LED_HEX, drawDigit, SvgDigit, useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

const FACE = { x: [-1.75, 1.15], z: [-0.6, 0.6] } // 2,9 × 1,2 cm
const segs = (v, b) => Array.from({ length: 8 }, (_, i) => ((v >> i) & 1 ? b : 0))
// posições (fração da largura) dos 4 dígitos e dos dois pontos
const DX = [0.14, 0.36, 0.64, 0.86]
const COLON = 0.5

function draw(color) {
  return (ctx, w, h, L) => {
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, w, h)
    const s = h * 0.36
    const b = L?.b ?? 0
    DX.forEach((fx, i) => drawDigit(ctx, fx * w, h / 2, s, segs(L?.d?.[i] ?? 0, b).slice(0, 7), color, undefined, false))
    const on = ((L?.d?.[1] ?? 0) & 0x80) && b
    for (const dy of [-0.4, 0.4]) {
      ctx.beginPath()
      ctx.arc(COLON * w, h / 2 + dy * s, s * 0.13, 0, Math.PI * 2)
      ctx.fillStyle = on ? color : '#2a2a2a'
      ctx.fill()
    }
  }
}

function Model({ part }) {
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const tex = useLiveTexture(part.id, 512, 212, draw(color))
  const cx = (FACE.x[0] + FACE.x[1]) / 2
  return (
    <group>
      <Pcb size={[4.2, 0.16, 2.4]} color="#1f5f9f" />
      <Box size={[3.05, 0.72, 1.4]} pos={[cx, 0.16 + 0.36, 0]} color="#e9e9e9" rough={0.5} />
      <FacePlane tex={tex} w={FACE.x[1] - FACE.x[0]} d={FACE.z[1] - FACE.z[0]} pos={[cx, 0.885, 0]} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live?.b || !live.d?.some((v) => v)) return null
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const r = rectOf(info, FACE.x[0], FACE.z[0], FACE.x[1], FACE.z[1])
  const s = r.h * 0.36
  return (
    <g pointerEvents="none" filter="url(#glow)">
      {DX.map((fx, i) => (
        <SvgDigit key={i} cx={r.x + fx * r.w} cy={r.y + r.h / 2} s={s} lit={segs(live.d[i], live.b)} color={color} dp={false} />
      ))}
      {live.d[1] & 0x80 ? [-0.4, 0.4].map((dy) => <circle key={dy} cx={r.x + COLON * r.w} cy={r.y + r.h / 2 + dy * s} r={s * 0.13} fill={color} />) : null}
    </g>
  )
}

export default { type: 'tm1637', Model, Overlay2D }
