// Módulo microSD Catalex (azul): ranhura metálica com cartão, regulador e conversor de níveis.
import { Box, Cyl, Pcb, HeaderPins, GlowLed, liveOf, useLabel } from '../kit.jsx'
import def from '@shared/parts/microSD.js'
import { Chip } from './_analogModule.jsx'

const T = 0.16
const LED = [-0.45, -0.95]

const fmtSize = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1).replace('.', ',')} KB` : `${n} B`)

function Model({ part }) {
  const card = useLabel([{ text: 'micro', font: 'bold 60px Arial', y: 70 }, { text: 'SD', font: 'bold 70px Arial', y: 140 }], 256, 200)
  return (
    <group>
      <Pcb size={[4.3, T, 2.4]} pos={[-0.05, 0, 0]} color="#1d4ed8" />
      {/* ranhura do cartão (chapa metálica) e cartão inserido */}
      <Box size={[1.45, 0.18, 1.45]} pos={[0.85, T + 0.09, 0]} color="#c9cdd2" metal={0.9} rough={0.3} />
      {[-0.4, 0, 0.4].map((z) => (
        <Box key={z} size={[1.1, 0.01, 0.06]} pos={[0.85, T + 0.185, z]} color="#9ea3a8" metal={0.9} rough={0.3} />
      ))}
      {/* parte do cartão que fica de fora */}
      <Box size={[0.62, 0.08, 1.1]} pos={[1.82, T + 0.1, 0]} color="#1a1a1a" rough={0.5} />
      <mesh position={[1.82, T + 0.141, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[0.95, 0.55]} />
        <meshBasicMaterial map={card} transparent />
      </mesh>
      {/* regulador AMS1117 (SOT-223) e 74LVC125 (SOIC-14) */}
      <Box size={[0.65, 0.16, 0.35]} pos={[-0.9, T + 0.08, -0.6]} color="#151515" />
      <Box size={[0.3, 0.03, 0.18]} pos={[-0.9, T + 0.015, -0.87]} color="#ccc" metal={0.8} />
      <Chip pos={[-0.85, T, 0.45]} size={[0.85, 0.15, 0.4]} />
      {[[-0.1, -0.6], [-0.1, 0.45], [0.2, -0.95]].map(([x, z], i) => (
        <Box key={i} size={[0.12, 0.06, 0.22]} pos={[x, T + 0.03, z]} color="#c8b089" />
      ))}
      <GlowLed pos={[LED[0], T + 0.04, LED[1]]} size={[0.16, 0.08, 0.1]} color="#30ff60" read={() => (liveOf(part.id)?.busy ? 1 : 0)} />
      <Cyl r={0.12} h={T + 0.01} pos={[1.85, T / 2, -1.0]} color="#c9a227" metal={0.8} rough={0.3} seg={12} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

// lista dos ficheiros do cartão por baixo do módulo
function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const files = live.files || []
  const shown = files.slice(0, 4)
  const lines = shown.length ? shown.map((f) => `${f.name}  ${fmtSize(f.size || 0)}`) : ['(cartão vazio)']
  if (files.length > 4) lines.push(`… +${files.length - 4}`)
  const lh = 12
  const w = Math.max(90, Math.max(...lines.map((l) => l.length)) * 6.2 + 10)
  const y0 = info.h / 2 + 6
  const [lx, ly] = info.project([LED[0], 0.3, LED[1]])
  return (
    <g pointerEvents="none">
      {live.busy && <circle cx={lx} cy={ly} r={4} fill="#30ff60" opacity={0.9} filter="url(#glow)" />}
      <rect x={-w / 2} y={y0} width={w} height={lines.length * lh + 6} rx={4} fill="#0d1117" opacity={0.88} stroke="#30363d" />
      {lines.map((l, i) => (
        <text key={i} x={-w / 2 + 5} y={y0 + 3 + lh * (i + 0.8)} fontSize={10} fontFamily="ui-monospace, Menlo, monospace" fill="#c9d1d9" xmlSpace="preserve">
          {l}
        </text>
      ))}
    </g>
  )
}

export default { type: 'microSD', Model, Overlay2D }
