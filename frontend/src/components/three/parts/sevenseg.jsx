// Display de 7 segmentos (1 dígito). Segmentos desenhados numa textura de canvas.
import { Box, Leg, PITCH } from '../kit.jsx'
import { LED_HEX, drawDigit, SvgDigit, useLiveTexture, FacePlane, rectOf } from './_groupA.jsx'

// face com o dígito (cm): largura 1,1 × altura 1,74
const FACE = { x: [-0.55, 0.55], z: [-0.87, 0.87] }
const H = 0.8

function draw(color) {
  return (ctx, w, h, L) => {
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, w, h)
    drawDigit(ctx, w * 0.46, h / 2, h * 0.36, L?.seg, color)
  }
}

function Model({ part }) {
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const tex = useLiveTexture(part.id, 128, 200, draw(color))
  const xs = [-2, -1, 0, 1, 2].map((k) => k * PITCH)
  return (
    <group>
      {[-0.762, 0.762].flatMap((z) => xs.map((x) => <Leg key={`${x}${z}`} from={[x, 0, z]} to={[x, 0.12, z]} />))}
      <Box size={[1.26, H - 0.1, 1.9]} pos={[0, 0.1 + (H - 0.1) / 2, 0]} color="#1b1b1b" rough={0.8} />
      <FacePlane tex={tex} w={FACE.x[1] - FACE.x[0]} d={FACE.z[1] - FACE.z[0]} pos={[0, H + 0.002, 0]} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  if (!live?.seg?.some((v) => v > 0.02)) return null
  const color = LED_HEX[part.config?.color] || LED_HEX.red
  const r = rectOf(info, FACE.x[0], FACE.z[0], FACE.x[1], FACE.z[1])
  return (
    <g pointerEvents="none" filter="url(#glow)">
      <SvgDigit cx={r.x + r.w * 0.46} cy={r.y + r.h / 2} s={r.h * 0.36} lit={live.seg} color={color} />
    </g>
  )
}

export default { type: 'sevenseg', Model, Overlay2D }
