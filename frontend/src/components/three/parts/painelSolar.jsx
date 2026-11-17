// Painel solar pequeno: placa com as células de silício monocristalino (azul-escuro, com os
// barramentos prateados) sob resina brilhante, moldura da placa e bloco de terminais verde com
// dois parafusos (+ / −) no lado −x.
import { Box, Cyl, THREE, useCanvasTexture } from '../kit.jsx'
import { solarGeom } from '@shared/parts/painelSolar.js'
import { Badge, fmt } from './group-c-ui.jsx'

function cellsTexture(ctx, w, h, m) {
  ctx.fillStyle = '#e8e8e8' // placa por baixo da resina (margem)
  ctx.fillRect(0, 0, w, h)
  const pad = 10
  const gap = 5
  const cw = (w - 2 * pad - (m.cols - 1) * gap) / m.cols
  const ch = (h - 2 * pad - (m.rows - 1) * gap) / m.rows
  for (let i = 0; i < m.cols; i++)
    for (let j = 0; j < m.rows; j++) {
      const x = pad + i * (cw + gap)
      const y = pad + j * (ch + gap)
      const g = ctx.createLinearGradient(x, y, x + cw, y + ch)
      g.addColorStop(0, '#1c2c55')
      g.addColorStop(0.5, '#122046')
      g.addColorStop(1, '#1a2a50')
      ctx.fillStyle = g
      ctx.fillRect(x, y, cw, ch)
      // dedos finos e dois barramentos
      ctx.strokeStyle = 'rgba(200,210,225,0.35)'
      ctx.lineWidth = 1
      for (let k = 1; k < 10; k++) {
        ctx.beginPath()
        ctx.moveTo(x, y + (ch * k) / 10)
        ctx.lineTo(x + cw, y + (ch * k) / 10)
        ctx.stroke()
      }
      ctx.fillStyle = '#c9ced6'
      for (const f of [0.3, 0.7]) ctx.fillRect(x + cw * f - 1.5, y, 3, ch)
    }
  // ligações entre células
  ctx.fillStyle = '#b8bec6'
  for (let i = 0; i < m.cols - 1; i++) ctx.fillRect(pad + (i + 1) * (cw + gap) - gap, pad + 4, gap, h - 2 * pad - 8)
}

function Model({ part }) {
  const { m, L, W, T } = solarGeom(part.config || {})
  const tex = useCanvasTexture((ctx, w, h) => cellsTexture(ctx, w, h, m), [m.cols, m.rows, L, W], 512, Math.round((512 * W) / L))
  return (
    <group>
      {/* placa (laterais e fundo) */}
      <Box size={[L, T * 0.6, W]} pos={[0, T * 0.3, 0]} color="#2a2a2a" rough={0.7} />
      {/* resina com as células */}
      <mesh position={[0, T * 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, T * 0.4, W]} />
        <meshStandardMaterial attach="material-0" color="#1b1b1b" />
        <meshStandardMaterial attach="material-1" color="#1b1b1b" />
        <meshPhysicalMaterial attach="material-2" map={tex} roughness={0.12} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
        <meshStandardMaterial attach="material-3" color="#1b1b1b" />
        <meshStandardMaterial attach="material-4" color="#1b1b1b" />
        <meshStandardMaterial attach="material-5" color="#1b1b1b" />
      </mesh>
      {/* bloco de terminais de parafuso (2 vias), por cima da margem da placa */}
      <group position={[-3.6, T, 0]}>
        <Box size={[0.75, 0.65, 1.45]} pos={[0, 0.325, 0]} color="#1e9e4a" rough={0.5} />
        {[-0.35, 0.35].map((z) => (
          <group key={z}>
            <Cyl r={0.17} h={0.06} pos={[0, 0.66, z]} color="#c9ccd1" metal={0.9} rough={0.3} seg={16} />
            <Box size={[0.26, 0.02, 0.05]} pos={[0, 0.695, z]} rot={[0, Math.PI / 4, 0]} color="#555" />
            <Box size={[0.08, 0.3, 0.35]} pos={[-0.38, 0.25, z]} color="#111" />
          </group>
        ))}
        <mesh position={[0.39, 0.4, -0.35]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.25, 0.25]} />
          <meshBasicMaterial color="#e53935" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  const txt = live.G < 1 ? 'sem luz' : `${fmt(live.v, 2)} V · ${Math.round(live.i * 1000)} mA`
  return <Badge info={info} text={txt} color={live.G < 1 ? '#525252' : '#f5f5f5'} />
}

export default { type: 'painelSolar', Model, Overlay2D }
