// LiPo 3S 1500 mAh: bloco com manga impressa, fios de silicone até à ficha XT60 amarela
// e o cabo de balanceamento (branco).
import { Box, Cyl, Leg, useCanvasTexture } from '../kit.jsx'
import def from '@shared/parts/lipo3s.js'
import { Badge } from './group-c-ui.jsx'

const [L, H, W] = def.size
const pin = (id) => def.pins.find((p) => p.id === id).pos

function Model() {
  const wrap = useCanvasTexture(
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0)
      g.addColorStop(0, '#111')
      g.addColorStop(1, '#2a2a2a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#ffcc00'
      ctx.fillRect(0, h * 0.72, w, h * 0.1)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 72px Arial'
      ctx.fillText('1500mAh 3S', w / 2, h * 0.3)
      ctx.font = 'bold 40px Arial'
      ctx.fillText('11.1V · 75C · LiPo', w / 2, h * 0.56)
      ctx.fillStyle = '#ffcc00'
      ctx.font = 'bold 28px Arial'
    },
    ['lipo3s'],
    512,
    256,
  )
  const xt = pin('+')[0] - 0.35
  return (
    <group>
      <Box size={[L, H, W]} pos={[0, H / 2, 0]} color="#1a1a1a" rough={0.55} />
      <mesh position={[0, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L - 0.2, W - 0.2]} />
        <meshBasicMaterial map={wrap} />
      </mesh>
      {/* fios de silicone até à XT60 */}
      <Leg from={[L / 2 - 0.1, 0.9, -0.35]} to={[xt - 0.3, pin('+')[1], -0.35]} r={0.12} color="#e53935" />
      <Leg from={[L / 2 - 0.1, 0.9, 0.35]} to={[xt - 0.3, pin('-')[1], 0.35]} r={0.12} color="#1a1a1a" />
      <Box size={[0.7, 0.85, 1.6]} pos={[xt, pin('+')[1], 0]} color="#f2c230" rough={0.5} />
      {[-0.35, 0.35].map((z) => (
        <Cyl key={z} r={0.18} h={0.12} pos={[xt + 0.38, pin('+')[1], z]} rot={[0, 0, Math.PI / 2]} color="#d4af37" metal={0.9} rough={0.3} seg={14} />
      ))}
      {/* cabo de balanceamento */}
      <Leg from={[L / 2 - 0.1, 1.6, 1.2]} to={[L / 2 + 1.0, 1.4, 1.4]} r={0.05} color="#eee" />
      <Box size={[0.4, 0.3, 0.9]} pos={[L / 2 + 1.2, 1.4, 1.4]} color="#f5f5f5" />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${String(live.v?.toFixed(1)).replace('.', ',')} V · ${String(live.i).replace('.', ',')} A · ${Math.round(live.charge)}%`} color={live.cell < 3.4 ? '#c62828' : '#f5f5f5'} />
}

export default { type: 'lipo3s', Model, Overlay2D }
