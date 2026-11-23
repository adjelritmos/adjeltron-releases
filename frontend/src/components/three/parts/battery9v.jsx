// Pilha de 9 V (6LR61: 48,5 × 26,5 × 17,5 mm) deitada: camisa de aço com manga impressa, frisos
// da cravação nas pontas, terminais de pressão (+ pequeno redondo, − sextavado) e o clip de
// pressão de vinil preto com os fios vermelho/preto até aos pinos.
import { Box, RBox, Cyl, Leg, THREE, METAL, useCanvasTexture, useMemo } from '../kit.jsx'
import def from '@shared/parts/battery9v.js'
import { Badge, fmt } from './group-c-ui.jsx'

const L = 4.85
const H = 1.75
const Dz = 2.65

export function LeadPair({ from, pins }) {
  // fios do clip/suporte até aos pinos, com uma pequena curva e a ponta descarnada estanhada
  return pins.map((p, i) => {
    const c = i ? '#1c1c1c' : '#d32f2f'
    // rabicho curto e a direito: sai do suporte já à altura do pino (sem subir e descer, que
    // fazia uma dobra viva onde o jumper começa)
    const a = [from[0], Math.max(p.pos[1], Math.min(from[1], p.pos[1] + 0.15)), (from[2] + (i ? 0.25 : -0.25) + p.pos[2]) / 2]
    const m = [(a[0] + p.pos[0] - 0.3) / 2, (a[1] + p.pos[1]) / 2, p.pos[2]]
    const end = [p.pos[0] - 0.3, p.pos[1], p.pos[2]]
    return (
      <group key={p.id}>
        <Leg from={a} to={m} r={0.06} color={c} />
        <Leg from={m} to={end} r={0.06} color={c} />
        <Leg from={end} to={p.pos} r={0.032} color={METAL.tin} metal />
      </group>
    )
  })
}

// manga impressa (a mesma tela no topo e nos lados; o "9V" lê-se de cima)
// cor = a da faixa da marca (config.color); o resto da manga é escuro
function drawWrap(ctx, w, h, color = '#f59e0b') {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, '#171a1f')
  g.addColorStop(0.6, '#232830')
  g.addColorStop(0.62, new THREE.Color(color).offsetHSL(0, 0, -0.08).getStyle())
  g.addColorStop(1, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#c9ccd1'
  ctx.fillRect(w * 0.6, 0, 6, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 150px Arial'
  ctx.fillText('9V', w * 0.3, h * 0.42)
  ctx.font = 'bold 40px Arial'
  ctx.fillText('ALKALINE', w * 0.3, h * 0.78)
  ctx.fillStyle = '#1b1b1b'
  ctx.font = 'bold 38px Arial'
  ctx.fillText('6LR61', w * 0.81, h * 0.3)
  ctx.font = 'bold 28px Arial'
  ctx.fillText('MN1604 · 6F22', w * 0.81, h * 0.55)
  ctx.font = '22px Arial'
  ctx.fillText('+  −', w * 0.81, h * 0.8)
}

function Model({ part }) {
  const color = part?.config?.color || def.config.color
  const tex = useCanvasTexture((c, w, h) => drawWrap(c, w, h, color), ['bat9v-2', color], 768, 320)
  const wrapMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }), [tex])
  return (
    <group>
      {/* camisa de aço com arestas boleadas; a manga cobre o meio */}
      <RBox size={[L, H, Dz]} r={0.18} pos={[0, H / 2, 0]} color="#30343a" metal={0.6} rough={0.4} />
      <mesh position={[-0.05, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={wrapMat}>
        <planeGeometry args={[L - 0.5, Dz - 0.36]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.05, H / 2, s * (Dz / 2 + 0.002)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} material={wrapMat}>
          <planeGeometry args={[L - 0.5, H - 0.36]} />
        </mesh>
      ))}
      {/* frisos da cravação nas duas pontas (aço sem pintura) */}
      {[-1, 1].map((s) => (
        <RBox key={`c${s}`} size={[0.12, H + 0.02, Dz + 0.02]} r={0.16} pos={[s * (L / 2 - 0.12), H / 2, 0]} color="#b9bec4" metal={1} rough={0.3} />
      ))}
      {/* topo com os terminais: + pequeno redondo, − sextavado (encaixam no clip) */}
      <Box size={[0.03, H - 0.3, Dz - 0.3]} pos={[L / 2 + 0.005, H / 2, 0]} color="#1a1a1a" rough={0.6} />
      <Cyl r={0.28} h={0.22} pos={[L / 2 + 0.11, H / 2, -0.64]} rot={[0, 0, Math.PI / 2]} color={METAL.nickel} metal={1} rough={0.25} seg={18} />
      <Cyl r={0.4} h={0.22} pos={[L / 2 + 0.11, H / 2, 0.64]} rot={[0, 0, Math.PI / 2]} color={METAL.nickel} metal={1} rough={0.25} seg={6} />
      {/* clip de pressão (vinil preto) com as duas tampas dos terminais e a saída dos fios */}
      <RBox size={[0.42, H * 0.82, Dz * 0.88]} r={0.12} pos={[L / 2 + 0.45, H / 2, 0]} color="#141414" rough={0.55} />
      {[-0.64, 0.64].map((z) => (
        <Cyl key={z} r={0.5} h={0.08} pos={[L / 2 + 0.67, H / 2, z]} rot={[0, 0, Math.PI / 2]} color="#1c1c1c" rough={0.5} seg={20} />
      ))}
      <RBox size={[0.12, 0.3, 0.75]} r={0.04} pos={[L / 2 + 0.66, H / 2, 0]} color="#0e0e0e" rough={0.5} />
      <LeadPair from={[L / 2 + 0.68, H / 2, 0]} pins={def.pins} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={live.hot ? 'CURTO!' : `${fmt(live.v, 2)} V`} color={live.hot ? '#dc2626' : '#f5f5f5'} />
}

export default { type: 'battery9v', Model, Overlay2D }
