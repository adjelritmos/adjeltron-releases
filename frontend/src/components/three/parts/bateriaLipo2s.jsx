// LiPo 2S 2200 mAh 30C (≈ 105 × 34 × 18 mm): bolsa de células em manga azul impressa, arestas
// almofadadas, tampa rígida na ponta, fios de silicone 14 AWG até à ficha T (Deans) vermelha com
// as duas lâminas em T e o cabo de balanceamento JST-XH de 3 vias.
import { Box, RBox, Cyl, Leg, METAL, THREE, useCanvasTexture } from '../kit.jsx'
import def from '@shared/parts/bateriaLipo2s.js'
import { LipoPack, BalanceLead } from './lipo3s.jsx'
import { Badge } from './group-c-ui.jsx'

const [L, H, W] = def.size
const pin = (id) => def.pins.find((p) => p.id === id).pos

const shade = (c, l) => new THREE.Color(c).offsetHSL(0, 0, l).getStyle()
// manga na cor escolhida (config.color)
function drawLabel(ctx, w, h, color = '#1565c0') {
  const dark = shade(color, -0.12)
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, dark)
  g.addColorStop(1, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#e8eef7'
  ctx.fillRect(0, h * 0.74, w, h * 0.1)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.55 + i * 0.07), 0, w * 0.03, h * 0.74)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 84px Arial'
  ctx.fillText('2200mAh', w * 0.04, h * 0.28)
  ctx.font = 'bold 44px Arial'
  ctx.fillText('7.4V  2S1P  30C', w * 0.04, h * 0.56)
  ctx.textAlign = 'right'
  ctx.font = 'bold 64px Arial'
  ctx.fillText('LiPo', w * 0.96, h * 0.3)
  ctx.font = 'bold 30px Arial'
  ctx.fillText('16.28Wh', w * 0.96, h * 0.56)
  ctx.fillStyle = dark
  ctx.textAlign = 'center'
  ctx.font = 'bold 24px Arial'
  ctx.fillText('USE A LIPO BALANCE CHARGER ONLY · MAX 8.4V', w / 2, h * 0.79)
}

function Model({ part }) {
  const color = part?.config?.color || def.config.color
  const tex = useCanvasTexture((c, w, h) => drawLabel(c, w, h, color), ['lipo2s-2', color], 1024, 340)
  const ty = pin('+')[1]
  const tx = pin('+')[0] - 0.4
  return (
    <group>
      <LipoPack L={L} H={H} W={W} tex={tex} color={shade(color, -0.15)} cap="#0a0a0a" />
      {/* fios de silicone até à ficha T, com manga termorretrátil na ficha */}
      <Leg from={[L / 2 - 0.1, 0.9, -0.35]} to={[tx - 0.5, ty, -0.35]} r={0.1} color="#d32f2f" />
      <Leg from={[L / 2 - 0.1, 0.9, 0.35]} to={[tx - 0.5, ty, 0.35]} r={0.1} color="#1a1a1a" />
      <Cyl r={0.3} h={0.3} pos={[tx - 0.5, ty, 0]} rot={[0, 0, Math.PI / 2]} color="#1a1a1a" rough={0.35} seg={14} />
      {/* ficha T (Deans): corpo de nylon vermelho com estrias de agarrar e as lâminas em T */}
      <RBox size={[0.75, 0.75, 1.5]} r={0.08} pos={[tx, ty, 0]} color="#c62828" rough={0.45} />
      {[-0.2, 0, 0.2].map((x) => (
        <Box key={x} size={[0.06, 0.77, 1.1]} pos={[tx + x, ty, 0]} color="#b71c1c" rough={0.5} />
      ))}
      <Box size={[0.02, 0.5, 1.2]} pos={[tx + 0.376, ty, 0]} color="#5d0f0f" />
      {[-0.35, 0.35].map((z, i) => (
        <Box key={z} size={[0.12, i ? 0.42 : 0.1, i ? 0.1 : 0.42]} pos={[tx + 0.4, ty, z]} color={METAL.gold} metal={1} rough={0.25} />
      ))}
      {/* + moldado junto à lâmina horizontal */}
      <Box size={[0.14, 0.02, 0.035]} pos={[tx, ty + 0.38, -0.5]} color="#8e1515" />
      <Box size={[0.035, 0.02, 0.14]} pos={[tx, ty + 0.38, -0.5]} color="#8e1515" />
      <BalanceLead from={[L / 2 - 0.1, 1.5, 1.1]} to={[L / 2 + 1.1, 1.3, 1.35]} n={3} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${String(live.v?.toFixed(1)).replace('.', ',')} V · ${String(live.i).replace('.', ',')} A · ${Math.round(live.charge)}%`} color={live.cell < 3.4 ? '#c62828' : '#f5f5f5'} />
}

export default { type: 'bateriaLipo2s', Model, Overlay2D }
