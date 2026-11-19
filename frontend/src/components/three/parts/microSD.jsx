// Módulo microSD Catalex (azul, 42 × 24 mm, 2 furos de 3 mm): ranhura push-push de chapa inox
// (nervuras estampadas, patilhas de solda e a mola de ejeção) com o cartão microSD inserido,
// regulador AMS1117-3.3 (SOT-223), conversor de níveis 74LVC125A (SOIC-14), passivos e LED.
import { Box, HeaderPins, GlowLed, liveOf, useLabel, Chip, METAL } from '../kit.jsx'
import { PcbPlate, Smds, Sot223 } from './_boardKit.jsx'
import def from '@shared/parts/microSD.js'

const T = 0.16
const LED = [-0.45, -0.95]
const W = 4.3
const D = 2.4
// furos de fixação na ponta da ranhura (relativos ao centro da placa)
const HOLES = [-1, 1].map((sz) => [W / 2 - 0.25, sz * (D / 2 - 0.25), 0.15])
const SMDS = [[-0.1, -0.6, 1, 'C'], [-0.1, 0.45, 1, 'C'], [0.2, -0.95, 0, 'r'], [-1.45, 0.45, 1, 'c'], [-0.3, 0.2, 1, 'r'], [-0.3, 0.75, 1, 'r'], [-1.45, -0.6, 1, 'C']]

const fmtSize = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1).replace('.', ',')} KB` : `${n} B`)

function Model({ part }) {
  const card = useLabel([{ text: 'micro', font: 'bold 60px Arial', y: 70 }, { text: 'SD', font: 'bold 70px Arial', y: 140 }], 256, 200)
  return (
    <group>
      <group position={[-0.05, 0, 0]}>
        <PcbPlate id="microSD" w={W} d={D} t={T} y={0} r={0.08} holes={HOLES} color="#1d4ed8" />
      </group>
      {/* ranhura do cartão: chapa inox com nervuras estampadas, patilhas de solda e mola */}
      <Box size={[1.45, 0.17, 1.45]} pos={[0.85, T + 0.095, 0]} color="#c9cdd2" metal={1} rough={0.32} />
      {[-0.4, 0, 0.4].map((z) => (
        <Box key={z} size={[1.1, 0.012, 0.06]} pos={[0.8, T + 0.186, z]} color="#aeb3b9" metal={1} rough={0.3} />
      ))}
      {[-1, 1].map((s) => [0.4, 1.3].map((x) => <Box key={`${s}${x}`} size={[0.18, 0.03, 0.08]} pos={[x, T + 0.015, s * 0.76]} color={METAL.tin} metal={1} rough={0.3} />))}
      <Box size={[0.5, 0.012, 0.12]} pos={[0.35, T + 0.186, 0.55]} rot={[0, 0, 0.12]} color="#aeb3b9" metal={1} rough={0.3} />
      {/* parte do cartão que fica de fora (com as estrias de agarrar) */}
      <Box size={[0.62, 0.08, 1.1]} pos={[1.82, T + 0.1, 0]} color="#1a1a1a" rough={0.5} />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} size={[0.025, 0.006, 0.9]} pos={[2.02 + i * 0.04, T + 0.142, 0]} color="#2c2c2c" rough={0.6} />
      ))}
      <mesh position={[1.78, T + 0.141, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[0.95, 0.4]} />
        <meshBasicMaterial map={card} transparent />
      </mesh>
      {/* regulador AMS1117 (SOT-223), 74LVC125A (SOIC-14) e passivos */}
      <Sot223 pos={[-0.9, T, -0.6]} label="AMS1117" sub="3.3" />
      <Chip pos={[-0.85, T, 0.45]} size={[0.86, 0.15, 0.39]} n={7} label="LVC125A" />
      <Smds id="microSD" y={T} items={SMDS} />
      <GlowLed pos={[LED[0], T + 0.04, LED[1]]} size={[0.16, 0.08, 0.1]} color="#30ff60" read={() => (liveOf(part.id)?.busy ? 1 : 0)} />
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
