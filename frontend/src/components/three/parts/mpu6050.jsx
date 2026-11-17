// Módulo GY-521 (MPU-6050): placa azul com o chip QFN, regulador, LED e as setas dos eixos.
import { Box, Cyl, HeaderPins, useCanvasTexture, GlowLed, liveOf } from '../kit.jsx'
import def from '@shared/parts/mpu6050.js'
import { Badge, fmt } from './group-c-ui.jsx'

const W = 1.6 // x
const D = 2.1 // z
const T = 0.16
const BY = 0.02
const TOP = BY + T
const PX = 240

function Model({ part }) {
  // serigrafia: nomes dos pinos e setas X (frente) / Y (esquerda)
  const silk = useCanvasTexture(
    (ctx, w, h) => {
      const at = (x, z) => [(x + W / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 19px Arial'
      for (const p of def.pins) {
        const [x, y] = at(p.pos[0] + 0.3, p.pos[2])
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(p.id, 0, 0)
        ctx.restore()
      }
      ctx.lineWidth = 6
      const [ox, oy] = at(0.35, 0.45)
      // seta X (+x)
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ox + 0.5 * PX, oy)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ox + 0.6 * PX, oy)
      ctx.lineTo(ox + 0.45 * PX, oy - 14)
      ctx.lineTo(ox + 0.45 * PX, oy + 14)
      ctx.fill()
      // seta Y (−z, para a esquerda)
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ox, oy - 0.5 * PX)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ox, oy - 0.6 * PX)
      ctx.lineTo(ox - 14, oy - 0.45 * PX)
      ctx.lineTo(ox + 14, oy - 0.45 * PX)
      ctx.fill()
      ctx.font = 'bold 30px Arial'
      ctx.fillText('X', ox + 0.55 * PX, oy + 34)
      ctx.fillText('Y', ox - 34, oy - 0.55 * PX)
      ctx.font = 'bold 24px Arial'
      const [lx, ly] = at(0.25, -0.62)
      ctx.fillText('GY-521', lx, ly)
    },
    ['gy521'],
    Math.round(W * PX),
    Math.round(D * PX),
  )
  return (
    <group>
      <Box size={[W, T, D]} pos={[0, BY + T / 2, 0]} color="#1f4fb5" rough={0.5} />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* chip MPU-6050 (QFN 4×4 mm) e componentes */}
      <Box size={[0.42, 0.09, 0.42]} pos={[0.25, TOP + 0.045, 0.05]} color="#151515" rough={0.4} />
      <Cyl r={0.03} h={0.01} pos={[0.1, TOP + 0.095, -0.1]} color="#888" seg={8} />
      <Box size={[0.3, 0.12, 0.16]} pos={[0.5, TOP + 0.06, 0.7]} color="#222" />
      {[[-0.05, 0.6], [0.05, -0.45], [0.55, -0.4]].map(([x, z], i) => (
        <Box key={i} size={[0.1, 0.06, 0.06]} pos={[x, TOP + 0.03, z]} color="#b98b4e" />
      ))}
      {/* furos de fixação */}
      {[-0.75, 0.75].map((z) => (
        <Cyl key={z} r={0.15} h={T + 0.01} pos={[0.55, BY + T / 2, z]} color="#d9b54a" metal={0.8} rough={0.3} seg={16} />
      ))}
      <GlowLed pos={[0.6, TOP + 0.04, 0.3]} size={[0.1, 0.06, 0.06]} color="#ff3b30" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} up={0.57} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  return <Badge info={info} text={live.awake ? `X ${fmt(live.roll, 0)}° · Y ${fmt(live.pitch, 0)}°` : 'a dormir'} color={live.awake ? '#f5f5f5' : '#404040'} />
}

export default { type: 'mpu6050', Model, Overlay2D }
