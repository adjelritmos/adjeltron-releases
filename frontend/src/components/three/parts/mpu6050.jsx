// Módulo GY-521 (MPU-6050): placa azul de 21 × 16 mm com os 2 furos Ø 3 mm metalizados, o
// MPU-6050 em QFN-24 (4 × 4 mm) com a marcação, o regulador 662K (SOT-23), o LED de
// alimentação, os passivos 0603, a serigrafia dos pinos e as setas dos eixos X/Y.
import { Chip, HeaderPins, liveOf } from '../kit.jsx'
import def from '@shared/parts/mpu6050.js'
import { Badge, fmt } from './group-c-ui.jsx'
import { ShapedPcb, Art, SmdField, SmdLed, Sot23 } from './mq2.jsx'

const W = 1.6 // x
const D = 2.1 // z
const T = 0.16
const BY = 0.02
const TOP = BY + T
const HOLES = [
  [0.55, -0.75, 0.15],
  [0.55, 0.75, 0.15],
]

// serigrafia: nomes dos pinos, setas X (frente, +x) / Y (esquerda, −z), nome da placa
function draw(p) {
  for (const [x, z] of HOLES) p.ring(x, z, 0.15, 0.27, '#d6b25a')
  for (const pin of def.pins) p.text(pin.id, -0.36, pin.pos[2], 0.1, { rot: -Math.PI / 2 })
  const [ox, oz] = [-0.15, 0.78]
  const arrow = (x1, z1, hx, hz) => {
    p.line([[ox, oz], [x1, z1]], { lw: 0.025 })
    p.ctx.fillStyle = '#f2f2ee'
    p.ctx.beginPath()
    p.ctx.moveTo(p.X(x1 + hx * 0.09), p.Y(z1 + hz * 0.09))
    p.ctx.lineTo(p.X(x1 - hz * 0.05), p.Y(z1 - hx * 0.05))
    p.ctx.lineTo(p.X(x1 + hz * 0.05), p.Y(z1 + hx * 0.05))
    p.ctx.fill()
  }
  arrow(0.12, oz, 1, 0)
  arrow(ox, 0.48, 0, -1)
  p.text('X', 0.16, oz + 0.14, 0.12)
  p.text('Y', ox - 0.12, 0.45, 0.12)
  p.text('GY-521', 0.72, 0, 0.12, { rot: -Math.PI / 2 })
  // contorno do chip e marca do pino 1
  p.rect(0.25, 0.05, 0.52, 0.52, { lw: 0.012 })
  p.circle(0.0, -0.2, 0.025, { fill: '#f2f2ee', stroke: null })
  p.text('U1', 0.42, 0.4, 0.08)
  p.text('LED', 0.25, -0.47, 0.07)
}

function Model({ part }) {
  return (
    <group>
      <ShapedPcb id="gy521" pos={[0, BY, 0]} w={W} d={D} t={T} r={0.06} holes={HOLES} color="#1f4fb5" />
      <Art id="gy521" w={W} d={D} pos={[0, TOP + 0.0015, 0]} draw={draw} />
      {/* MPU-6050 (QFN-24 4 × 4 × 0,9 mm) */}
      <Chip pos={[0.25, TOP, 0.05]} size={[0.4, 0.09, 0.4]} pkg="qfn" n={6} label="MPU-6050" labelColor="#9a9a9a" />
      {/* regulador 662K (3,3 V) */}
      <Sot23 pos={[-0.05, TOP, -0.7]} />
      <SmdLed pos={[0.05, TOP, -0.35]} size={[0.16, 0.07, 0.08]} color="#ff3b30" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <SmdField
        id="gy521"
        y={TOP}
        items={[
          [0.3, -0.32, 0, 'c'],
          [0.6, -0.2, Math.PI / 2, 'c'],
          [0.6, 0.3, Math.PI / 2],
          [-0.15, 0.1, Math.PI / 2, 'c'],
          [-0.15, -0.25, Math.PI / 2],
          [0.15, -0.95, 0, 'c'],
          [0.15, 0.42, 0],
          [-0.12, -0.98, 0],
        ]}
      />
      <HeaderPins pins={def.pins} base={TOP} up={0.57} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return <Badge info={info} text={live.awake ? `X ${fmt(live.roll, 0)}° · Y ${fmt(live.pitch, 0)}°` : 'a dormir'} color={live.awake ? '#f5f5f5' : '#404040'} />
}

export default { type: 'mpu6050', Model, Overlay2D }
