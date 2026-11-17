// Voltímetro e amperímetro de painel: caixa preta com mostrador LED vermelho de 4 dígitos
// por cima (lê-se de cima, como na vista 2D), seletor de alcance e bornes de 4 mm à frente.
import { MEDIDOR_DEFS } from '@shared/parts/medidores.js'
import { Box, RBox, Cyl, liveOf } from '../kit.jsx'
import { useLiveCanvas } from './_groupF.jsx'
import { Badge } from './group-c-ui.jsx'

const H = 1.2
const BX = [-1.3, 1.3]
const D = 2.6

// valor com unidade automática (mV/V, mA/A) e 4 algarismos
export function leitura(v, unit, fuse) {
  if (fuse) return { txt: 'FUSE', unit: '' }
  const a = Math.abs(v ?? 0)
  const sign = v < 0 ? '-' : ''
  if (a < 0.0005) return { txt: '0.000', unit }
  if (a < 1) return { txt: sign + (a * 1000).toFixed(a * 1000 < 10 ? 2 : a * 1000 < 100 ? 1 : 0), unit: `m${unit}` }
  return { txt: sign + a.toFixed(a < 10 ? 3 : a < 100 ? 2 : 1), unit }
}

function draw(ctx, w, h, d) {
  ctx.fillStyle = '#0a0606'
  ctx.fillRect(0, 0, w, h)
  // dígitos "apagados" por trás (como num mostrador de 7 segmentos)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(h * 0.52)}px "Courier New", monospace`
  ctx.fillStyle = '#2a0d0d'
  ctx.fillText('8.888', w * 0.8, h * 0.5)
  ctx.fillStyle = d.fuse ? '#ff9a3d' : '#ff3b2f'
  ctx.shadowColor = '#ff3b2f'
  ctx.shadowBlur = 12
  ctx.fillText(d.txt, w * 0.8, h * 0.5)
  ctx.shadowBlur = 0
  ctx.font = `bold ${Math.round(h * 0.26)}px Arial`
  ctx.textAlign = 'left'
  ctx.fillText(d.unit, w * 0.82, h * 0.55)
}

function Jack({ pin, color }) {
  const [x, y, z] = pin.pos
  return (
    <group>
      <Cyl r={0.24} h={0.16} pos={[x - 0.02, y, z]} rot={[0, 0, Math.PI / 2]} color={color} rough={0.45} />
      <Cyl r={0.12} h={0.2} pos={[x + 0.02, y, z]} rot={[0, 0, Math.PI / 2]} color="#d4af37" metal={0.8} rough={0.3} />
    </group>
  )
}

function make(def) {
  const amp = def.type === 'amperimetro'
  function Model({ part }) {
    const tex = useLiveCanvas(400, 160, draw, () => {
      const l = liveOf(part.id)
      return leitura(l?.value ?? 0, amp ? 'A' : 'V', l?.fuse)
    })
    const w = BX[1] - BX[0]
    return (
      <group>
        <RBox size={[w, H, D]} r={0.1} pos={[0, H / 2, 0]} color="#1c1f24" rough={0.6} />
        <Box size={[w - 0.16, 0.02, D - 0.16]} pos={[0, H + 0.005, 0]} color="#101215" rough={0.7} />
        {/* janela do mostrador */}
        <Box size={[2.0, 0.03, 0.95]} pos={[-0.05, H + 0.015, -0.4]} color="#000" />
        <mesh position={[-0.05, H + 0.035, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.9, 0.76]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        {/* seletor de alcance e etiqueta V / A */}
        <Cyl r={0.34} h={0.16} pos={[-0.55, H + 0.09, 0.62]} color="#2b2b2b" rough={0.4} seg={28} />
        <Box size={[0.3, 0.02, 0.05]} pos={[-0.45, H + 0.18, 0.62]} color="#e5e5e5" />
        <Box size={[0.6, 0.03, 0.45]} pos={[0.55, H + 0.02, 0.62]} color={amp ? '#1565c0' : '#c62828'} rough={0.5} />
        <Jack pin={def.pins[0]} color="#d32f2f" />
        <Jack pin={def.pins[1]} color="#151515" />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.25, 0.06, D - 0.5]} pos={[s * 0.9, 0.03, 0]} color="#0b0b0b" />
        ))}
      </group>
    )
  }
  function Overlay2D({ info, live }) {
    if (!live) return null
    const r = leitura(live.value, amp ? 'A' : 'V', live.fuse)
    return <Badge info={info} text={`${r.txt.replace('.', ',')} ${r.unit}`} color={live.fuse ? '#f97316' : '#ff4d3d'} />
  }
  return { type: def.type, Model, Overlay2D }
}

export default MEDIDOR_DEFS.map(make)
