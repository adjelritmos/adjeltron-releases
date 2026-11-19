// Painel solar pequeno de resina (tipo "6V 1W epoxy solar panel"): placa de FR4 com as células de
// silício monocristalino pseudo-quadradas (cantos cortados, azul-escuro, dedos finos e dois
// barramentos prateados, fitas de ligação entre células) sob resina epóxi brilhante com a orla
// boleada, e o bloco de terminais de parafuso verde (5,08 mm, 2 vias) no lado −x.
import { Box, RBox, Cyl, THREE, mat, METAL, useCanvasTexture, useMemo } from '../kit.jsx'
import { solarGeom } from '@shared/parts/painelSolar.js'
import { Badge, fmt } from './group-c-ui.jsx'

function cellsTexture(ctx, w, h, m) {
  ctx.fillStyle = '#f1f1ee' // placa branca por baixo da resina (margem)
  ctx.fillRect(0, 0, w, h)
  const pad = Math.round(w * 0.025)
  const gap = Math.max(4, Math.round(w * 0.008))
  const cw = (w - 2 * pad - (m.cols - 1) * gap) / m.cols
  const ch = (h - 2 * pad - (m.rows - 1) * gap) / m.rows
  const cut = Math.min(cw, ch) * 0.12
  for (let i = 0; i < m.cols; i++)
    for (let j = 0; j < m.rows; j++) {
      const x = pad + i * (cw + gap)
      const y = pad + j * (ch + gap)
      // célula pseudo-quadrada (cantos cortados do lingote redondo)
      ctx.beginPath()
      ctx.moveTo(x + cut, y)
      ctx.lineTo(x + cw - cut, y)
      ctx.lineTo(x + cw, y + cut)
      ctx.lineTo(x + cw, y + ch - cut)
      ctx.lineTo(x + cw - cut, y + ch)
      ctx.lineTo(x + cut, y + ch)
      ctx.lineTo(x, y + ch - cut)
      ctx.lineTo(x, y + cut)
      ctx.closePath()
      const g = ctx.createLinearGradient(x, y, x + cw, y + ch)
      g.addColorStop(0, '#1d2a4f')
      g.addColorStop(0.45, '#101a38')
      g.addColorStop(1, '#1a2850')
      ctx.fillStyle = g
      ctx.fill()
      ctx.save()
      ctx.clip()
      // dedos finos (perpendiculares aos barramentos)
      ctx.strokeStyle = 'rgba(190,200,215,0.38)'
      ctx.lineWidth = 1
      const nf = Math.max(8, Math.round(ch / 6))
      for (let k = 1; k < nf; k++) {
        ctx.beginPath()
        ctx.moveTo(x, y + (ch * k) / nf)
        ctx.lineTo(x + cw, y + (ch * k) / nf)
        ctx.stroke()
      }
      ctx.restore()
      // dois barramentos
      ctx.fillStyle = '#c9ced6'
      for (const f of [0.3, 0.7]) ctx.fillRect(x + cw * f - 2, y, 4, ch)
    }
  // fitas de ligação em série entre células vizinhas
  ctx.fillStyle = '#b8bec6'
  for (let i = 0; i < m.cols - 1; i++) {
    const x = pad + (i + 1) * (cw + gap) - gap
    ctx.fillRect(x - cw * 0.02, pad + 2, gap + cw * 0.04, h - 2 * pad - 4)
  }
  // barramentos de saída nas pontas
  ctx.fillRect(pad * 0.4, pad, pad * 0.35, h - 2 * pad)
  ctx.fillRect(w - pad * 0.75, pad, pad * 0.35, h - 2 * pad)
}

function Model({ part }) {
  const { m, L, W, T } = solarGeom(part.config || {})
  const tex = useCanvasTexture((ctx, w, h) => cellsTexture(ctx, w, h, m), [m.cols, m.rows, L, W, 'v2'], 1024, Math.round((1024 * W) / L))
  const top = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.1, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1 }), [tex])
  const edge = mat('#1c1c1c', 0, 0.5)
  return (
    <group>
      {/* placa de FR4 (verde-escura nas arestas, máscara preta por baixo) */}
      <RBox size={[L, T * 0.55, W]} r={0.04} pos={[0, T * 0.275, 0]} color="#1d2a1f" rough={0.6} />
      {/* resina epóxi com a orla boleada (a face de cima leva as células) */}
      <mesh position={[0, T * 0.775, 0]} castShadow receiveShadow material={[edge, edge, top, edge, edge, edge]}>
        <boxGeometry args={[L - 0.06, T * 0.45, W - 0.06]} />
      </mesh>
      {/* bloco de terminais de parafuso (5,08 mm, 2 vias), por cima da margem da placa */}
      <group position={[-3.6, T, 0]}>
        <RBox size={[0.75, 0.5, 1.45]} r={0.04} pos={[0, 0.25, 0]} color="#1f9a4c" rough={0.45} />
        <RBox size={[0.5, 0.2, 1.45]} r={0.04} pos={[0.05, 0.55, 0]} color="#1f9a4c" rough={0.45} />
        {[-0.35, 0.35].map((z) => (
          <group key={z}>
            {/* poço do parafuso e parafuso de fenda niquelado (topo = pino) */}
            <Cyl r={0.19} h={0.045} pos={[0, 0.63, z]} color="#13703a" seg={16} />
            <Cyl r={0.16} h={0.05} pos={[0, 0.62, z]} color={METAL.nickel} metal={1} rough={0.3} seg={16} />
            <Box size={[0.28, 0.02, 0.05]} pos={[0, 0.645, z]} rot={[0, Math.PI / 4, 0]} color="#3a3d40" />
            {/* boca do fio (−x) com a gaiola metálica */}
            <Box size={[0.02, 0.28, 0.4]} pos={[-0.34, 0.25, z]} color="#0b0b0b" />
            <Box size={[0.025, 0.06, 0.34]} pos={[-0.34, 0.12, z]} color={METAL.nickel} metal={1} rough={0.35} />
          </group>
        ))}
        {/* marcação de polaridade */}
        <Box size={[0.12, 0.02, 0.035]} pos={[0.32, 0.505, -0.35]} color="#d32f2f" />
        <Box size={[0.035, 0.02, 0.12]} pos={[0.32, 0.505, -0.35]} color="#d32f2f" />
        <Box size={[0.12, 0.02, 0.035]} pos={[0.32, 0.505, 0.35]} color="#111" />
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
