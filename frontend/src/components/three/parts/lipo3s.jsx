// LiPo 3S 1500 mAh 75C (≈ 75 × 35 × 24 mm): bolsa de células em manga termorretrátil impressa,
// arestas almofadadas, tampa rígida na ponta dos fios, fios de silicone 12 AWG até à ficha XT60
// amarela (cantos chanfrados do lado −, balas douradas) e o cabo de balanceamento JST-XH de 4 vias.
// Exporta LipoPack e BalanceLead (usados também pela LiPo 2S).
import { Box, RBox, Cyl, Leg, THREE, geo, mat, METAL, useCanvasTexture, useMemo } from '../kit.jsx'
import def from '@shared/parts/lipo3s.js'
import { Badge } from './group-c-ui.jsx'

const [L, H, W] = def.size
const pin = (id) => def.pins.find((p) => p.id === id).pos

// bolsa de células com a manga: corpo almofadado + etiqueta brilhante em cima e nos lados
export function LipoPack({ L, H, W, tex, color, cap = '#0d0d0d' }) {
  const label = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 0.8 }), [tex])
  return (
    <group>
      <RBox size={[L - 0.1, H, W]} r={Math.min(0.3, H * 0.2)} pos={[-0.05, H / 2, 0]} color={color} rough={0.35} />
      {/* etiqueta (topo) */}
      <mesh position={[-0.25, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={label}>
        <planeGeometry args={[L - 0.9, W - 0.45]} />
      </mesh>
      {/* tampa rígida na ponta dos fios (placa de proteção por baixo da manga) */}
      <RBox size={[0.42, H - 0.08, W - 0.08]} r={0.12} pos={[L / 2 - 0.21, H / 2, 0]} color={cap} rough={0.3} />
      {/* ruga da manga termorretrátil nas pontas */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.04, H - 0.5, W - 0.5]} pos={[s * (L / 2 + 0.005), H / 2, 0]} color="#050505" rough={0.4} />
      ))}
    </group>
  )
}

// cabo de balanceamento: n fios finos que saem da ponta e a ficha branca JST-XH (passo 2,5 mm)
const BAL = ['#1a1a1a', '#d32f2f', '#f2f2f2', '#d32f2f', '#f2f2f2']
export function BalanceLead({ from, to, n }) {
  const p = 0.25
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const dz = (i - (n - 1) / 2) * 0.1
        const dz2 = (i - (n - 1) / 2) * p
        return <Leg key={i} from={[from[0], from[1], from[2] + dz]} to={[to[0] - 0.22, to[1], to[2] + dz2]} r={0.035} color={BAL[i]} />
      })}
      <RBox size={[0.45, 0.3, n * p + 0.15]} r={0.03} pos={to} color="#f4f4f0" rough={0.5} />
      {/* rampa de travamento em cima e entradas dos terminais */}
      <Box size={[0.25, 0.04, n * p - 0.1]} pos={[to[0] + 0.05, to[1] + 0.16, to[2]]} color="#e6e6e0" rough={0.5} />
      <Box size={[0.02, 0.14, n * p]} pos={[to[0] + 0.226, to[1], to[2]]} color="#2a2a2a" />
    </group>
  )
}

// XT60: corte transversal com dois cantos chanfrados (lado −), extrudido ao longo de x
const xt60Geo = () =>
  geo('xt60', () => {
    const hy = 0.425
    const hz = 0.8
    const c = 0.22
    const s = new THREE.Shape()
    s.moveTo(-hz, -hy)
    s.lineTo(hz - c, -hy)
    s.lineTo(hz, -hy + c)
    s.lineTo(hz, hy - c)
    s.lineTo(hz - c, hy)
    s.lineTo(-hz, hy)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 })
    g.translate(0, 0, -0.35)
    g.rotateY(-Math.PI / 2) // forma no plano (z, y) do mundo, extrusão segundo x
    return g
  })
export function XT60({ pos }) {
  return (
    <group position={pos}>
      <mesh geometry={xt60Geo()} material={mat('#f2c230', 0, 0.45)} castShadow />
      {/* nervuras de agarrar nos lados */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.5, 0.04, 0.02]} pos={[-0.05, s * 0.2, -0.83]} color="#e2b21f" rough={0.5} />
      ))}
      {/* balas douradas (fêmea: casquilho com a ponta à vista) */}
      {[-0.35, 0.35].map((z) => (
        <group key={z}>
          <Cyl r={0.2} h={0.06} pos={[0.37, 0, z]} rot={[0, 0, Math.PI / 2]} color="#e6b93f" rough={0.45} seg={16} />
          <Cyl r={0.15} h={0.12} pos={[0.38, 0, z]} rot={[0, 0, Math.PI / 2]} color={METAL.gold} metal={1} rough={0.25} seg={14} />
          <Cyl r={0.08} h={0.13} pos={[0.385, 0, z]} rot={[0, 0, Math.PI / 2]} color="#3a2e10" seg={10} />
        </group>
      ))}
      {/* + e − moldados em cima */}
      <Box size={[0.16, 0.02, 0.04]} pos={[0, 0.432, -0.35]} color="#c99a12" />
      <Box size={[0.04, 0.02, 0.16]} pos={[0, 0.432, -0.35]} color="#c99a12" />
      <Box size={[0.16, 0.02, 0.04]} pos={[0, 0.432, 0.35]} color="#c99a12" />
    </group>
  )
}

// manga na cor escolhida (config.color), com a faixa amarela da marca
function drawLabel(ctx, w, h, color = '#16171a') {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, new THREE.Color(color).offsetHSL(0, 0, -0.02).getStyle())
  g.addColorStop(1, new THREE.Color(color).offsetHSL(0, 0, 0.07).getStyle())
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#ffcc00'
  ctx.fillRect(0, h * 0.7, w, h * 0.09)
  ctx.beginPath()
  ctx.moveTo(w * 0.72, 0)
  ctx.lineTo(w * 0.82, 0)
  ctx.lineTo(w * 0.62, h * 0.7)
  ctx.lineTo(w * 0.52, h * 0.7)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 74px Arial'
  ctx.fillText('1500mAh', w * 0.05, h * 0.2)
  ctx.font = 'bold 60px Arial'
  ctx.fillText('3S1P', w * 0.05, h * 0.44)
  ctx.font = 'bold 34px Arial'
  ctx.fillText('11.1V  75C  LiPo', w * 0.05, h * 0.62)
  ctx.textAlign = 'right'
  ctx.font = 'bold 120px Arial'
  ctx.fillText('75C', w * 0.96, h * 0.4)
  ctx.fillStyle = '#111'
  ctx.textAlign = 'center'
  ctx.font = 'bold 22px Arial'
  ctx.fillText('CHARGE ≤ 1C · NEVER DISCHARGE BELOW 3.0V/CELL', w / 2, h * 0.745)
  ctx.fillStyle = '#9a9a9a'
  ctx.font = '20px Arial'
  ctx.fillText('16.65Wh · 1500mAh · Lithium Polymer Battery', w / 2, h * 0.9)
}

function Model({ part }) {
  const color = part?.config?.color || def.config.color
  const tex = useCanvasTexture((c, w, h) => drawLabel(c, w, h, color), ['lipo3s-2', color], 768, 384)
  const P = pin('+')
  const xt = P[0] - 0.35
  return (
    <group>
      <LipoPack L={L} H={H} W={W} tex={tex} color={color} />
      {/* fios de silicone 12 AWG até à XT60 (com manga termorretrátil na ficha) */}
      <Leg from={[L / 2 - 0.1, 0.9, -0.35]} to={[xt - 0.45, P[1], -0.35]} r={0.12} color="#d32f2f" />
      <Leg from={[L / 2 - 0.1, 0.9, 0.35]} to={[xt - 0.45, pin('-')[1], 0.35]} r={0.12} color="#1a1a1a" />
      {[-0.35, 0.35].map((z, i) => (
        <Cyl key={z} r={0.15} h={0.2} pos={[xt - 0.42, P[1], z]} rot={[0, 0, Math.PI / 2]} color={i ? '#1a1a1a' : '#c62828'} rough={0.35} seg={12} />
      ))}
      <XT60 pos={[xt, P[1], 0]} />
      <BalanceLead from={[L / 2 - 0.1, 1.6, 1.2]} to={[L / 2 + 1.2, 1.4, 1.4]} n={4} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${String(live.v?.toFixed(1)).replace('.', ',')} V · ${String(live.i).replace('.', ',')} A · ${Math.round(live.charge)}%`} color={live.cell < 3.4 ? '#c62828' : '#f5f5f5'} />
}

export default { type: 'lipo3s', Model, Overlay2D }
