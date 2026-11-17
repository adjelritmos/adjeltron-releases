// LiPo 2S 2200 mAh: bloco com manga impressa azul, fios de silicone até à ficha T vermelha e o
// cabo de balanceamento (branco, 3 vias).
import { Box, RBox, Leg, useCanvasTexture } from '../kit.jsx'
import def from '@shared/parts/bateriaLipo2s.js'
import { Badge } from './group-c-ui.jsx'

const [L, H, W] = def.size
const pin = (id) => def.pins.find((p) => p.id === id).pos

function Model() {
  const wrap = useCanvasTexture(
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#0d47a1')
      g.addColorStop(1, '#1565c0')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#e0e0e0'
      ctx.fillRect(0, h * 0.74, w, h * 0.08)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 70px Arial'
      ctx.fillText('2200mAh 2S', w / 2, h * 0.3)
      ctx.font = 'bold 38px Arial'
      ctx.fillText('7.4V · 30C · LiPo', w / 2, h * 0.58)
    },
    ['lipo2s'],
    512,
    170,
  )
  const ty = pin('+')[1]
  const tx = pin('+')[0] - 0.4
  return (
    <group>
      <RBox size={[L, H, W]} r={0.12} pos={[0, H / 2, 0]} color="#0f3f8f" rough={0.5} />
      <mesh position={[0, H + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L - 0.3, W - 0.25]} />
        <meshBasicMaterial map={wrap} />
      </mesh>
      {/* fios de silicone até à ficha T */}
      <Leg from={[L / 2 - 0.1, 0.9, -0.35]} to={[tx - 0.3, ty, -0.35]} r={0.11} color="#e53935" />
      <Leg from={[L / 2 - 0.1, 0.9, 0.35]} to={[tx - 0.3, ty, 0.35]} r={0.11} color="#1a1a1a" />
      <RBox size={[0.75, 0.75, 1.5]} r={0.08} pos={[tx, ty, 0]} color="#c62828" rough={0.45} />
      {[-0.35, 0.35].map((z, i) => (
        <Box key={z} size={[0.1, i ? 0.42 : 0.12, i ? 0.12 : 0.42]} pos={[tx + 0.4, ty, z]} color="#d4af37" metal={0.9} rough={0.3} />
      ))}
      {/* cabo de balanceamento */}
      <Leg from={[L / 2 - 0.1, 1.5, 1.1]} to={[L / 2 + 0.9, 1.3, 1.35]} r={0.05} color="#eee" />
      <Box size={[0.35, 0.3, 0.8]} pos={[L / 2 + 1.1, 1.3, 1.35]} color="#f5f5f5" />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${String(live.v?.toFixed(1)).replace('.', ',')} V · ${String(live.i).replace('.', ',')} A · ${Math.round(live.charge)}%`} color={live.cell < 3.4 ? '#c62828' : '#f5f5f5'} />
}

export default { type: 'bateriaLipo2s', Model, Overlay2D }
