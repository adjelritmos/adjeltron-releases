// Display de 7 segmentos × 4 dígitos (multiplexado). Segmentos numa textura de canvas.
import { Box, Leg } from '../kit.jsx'
import def from '@shared/parts/sevenseg4.js'
import { LED_HEX, drawDigit, SvgDigit, useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

const BODY = { w: 5.0, d: 1.9, cz: -0.127, y0: 0.12, h: 0.68 }
const TOP = BODY.y0 + BODY.h
const FACE = { x: [-2.45, 2.45], z: [BODY.cz - 0.9, BODY.cz + 0.9] }
const DIG_X = [-1.83, -0.61, 0.61, 1.83] // centros dos dígitos (cm)
const S = 0.62 // escala do dígito (cm por unidade: altura 2 × S)

function draw(color) {
  return (ctx, w, h, L) => {
    const fw = FACE.x[1] - FACE.x[0]
    const k = w / fw
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, w, h)
    DIG_X.forEach((x, i) => drawDigit(ctx, (x - FACE.x[0] - 0.05) * k, h / 2, S * k, L?.seg?.[i], color))
  }
}

function Model({ part }) {
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const tex = useLiveTexture(part.id, 980, 360, draw(color))
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], BODY.y0 + 0.1, p.pos[2]]} r={0.025} />
      ))}
      <Box size={[BODY.w, BODY.h, BODY.d]} pos={[0, BODY.y0 + BODY.h / 2, BODY.cz]} color="#1b1b1b" rough={0.8} />
      <FacePlane tex={tex} w={FACE.x[1] - FACE.x[0]} d={FACE.z[1] - FACE.z[0]} pos={[0, TOP + 0.002, BODY.cz]} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live?.seg?.some((d) => d?.some((v) => v > 0.02))) return null
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const r = rectOf(info, FACE.x[0], FACE.z[0], FACE.x[1], FACE.z[1])
  const k = r.w / (FACE.x[1] - FACE.x[0])
  return (
    <g pointerEvents="none" filter="url(#glow)">
      {DIG_X.map((x, i) => (
        <SvgDigit key={i} cx={r.x + (x - FACE.x[0] - 0.05) * k} cy={r.y + r.h / 2} s={S * k} lit={live.seg[i]} color={color} />
      ))}
    </g>
  )
}

export default { type: 'sevenseg4', Model, Overlay2D }
