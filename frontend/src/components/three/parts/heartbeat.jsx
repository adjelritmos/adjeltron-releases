// Pulse Sensor: placa redonda com coração impresso e LED verde ao centro que brilha a cada batimento.
import { Box, Cyl, HeaderPins, Glow, useCanvasTexture, liveOf } from '../kit.jsx'
import def from '@shared/parts/heartbeat.js'

const T = 0.12
const C = [0.3, 0] // centro da placa redonda
const R = 0.8

function drawFace(ctx, w, h) {
  ctx.fillStyle = '#6a1b9a'
  ctx.fillRect(0, 0, w, h)
  // coração
  const cx = w / 2
  const cy = h / 2 + 4
  const s = w * 0.36
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.75)
  ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.05, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.35)
  ctx.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.2, cy - s * 0.05, cx, cy + s * 0.75)
  ctx.lineWidth = 7
  ctx.strokeStyle = '#f2f2f2'
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 22px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('PULSE', cx, h * 0.88)
}

function Model({ part }) {
  const tex = useCanvasTexture(drawFace, [], 256, 256)
  const beat = () => {
    const L = liveOf(part.id)
    return L?.powered ? 0.25 + 0.9 * (L.beat || 0) : 0
  }
  return (
    <group>
      {/* placa redonda + língua com os pinos */}
      <Cyl r={R} h={T} pos={[C[0], T / 2, C[1]]} color="#6a1b9a" seg={48} />
      <mesh position={[C[0], T + 0.001, C[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.98, 48]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <Box size={[0.75, T, 1.0]} pos={[-0.78, T / 2, 0]} color="#6a1b9a" />
      {/* LED verde e fotodíodo ao centro */}
      <Glow pos={[C[0], T + 0.06, C[1] - 0.05]} color="#30ff60" base="#2f5e36" read={beat} light={0.6}>
        <boxGeometry args={[0.2, 0.12, 0.16]} />
      </Glow>
      <Box size={[0.18, 0.08, 0.14]} pos={[C[0], T + 0.04, C[1] + 0.22]} color="#2b2b2b" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([C[0], 0.2, C[1] - 0.05])
  const b = live.beat || 0
  return <circle cx={x} cy={y} r={4 + b * 8} fill="#30ff60" opacity={0.35 + b * 0.6} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'heartbeat', Model, Overlay2D }
