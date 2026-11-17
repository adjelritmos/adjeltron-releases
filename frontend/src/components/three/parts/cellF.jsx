// Pilhas do grupo F: AA num suporte com fios e CR2032 num suporte de breadboard.
import CELL_DEFS from '@shared/parts/cellF.js'
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'
import { LeadPair } from './battery9v.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

const [AA, COIN] = CELL_DEFS

function AaModel() {
  const label = useLabel([{ text: 'AA  1,5V', font: 'bold 70px Arial', y: 64 }], 512, 128)
  const L = 5.8
  return (
    <group>
      {/* suporte preto aberto em cima */}
      <Box size={[L, 0.15, 1.7]} pos={[0, 0.075, 0]} color="#151515" />
      {[-1, 1].map((s) => (
        <Box key={s} size={[L, 0.9, 0.12]} pos={[0, 0.45, s * 0.79]} color="#151515" />
      ))}
      {[-1, 1].map((s) => (
        <Box key={`e${s}`} size={[0.15, 1.3, 1.7]} pos={[s * (L / 2 - 0.075), 0.65, 0]} color="#151515" />
      ))}
      {/* pilha: corpo verde-escuro, topo cor de cobre do lado + (−x), polo + saliente */}
      <Cyl r={0.7} h={4.8} pos={[0.05, 0.85, 0]} rot={[0, 0, Math.PI / 2]} color="#1f2937" rough={0.35} />
      <Cyl r={0.71} h={1.4} pos={[-1.75, 0.85, 0]} rot={[0, 0, Math.PI / 2]} color="#c9842a" metal={0.4} rough={0.35} />
      <Cyl r={0.25} h={0.15} pos={[-2.5, 0.85, 0]} rot={[0, 0, Math.PI / 2]} color="#d9dde2" metal={0.9} />
      <Cyl r={0.4} h={0.1} pos={[2.5, 0.85, 0]} rot={[0, 0, Math.PI / 2]} color="#b0b4ba" metal={0.9} />
      <mesh position={[0.6, 1.555, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      <LeadPair from={[L / 2, 0.35, 0]} pins={AA.pins} />
    </group>
  )
}

function CoinModel() {
  const label = useLabel([{ text: 'CR2032', font: 'bold 64px Arial', y: 100 }, { text: '+ 3V', font: 'bold 52px Arial', y: 170 }], 256, 256)
  const y0 = 0.15
  return (
    <group>
      {COIN.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], y0 + 0.05, p.pos[2]]} r={0.03} />
      ))}
      {/* suporte: base preta com aro aberto e a patilha metálica do + por cima */}
      <Cyl r={1.18} h={0.18} pos={[0, y0 + 0.09, 0]} color="#161616" seg={40} />
      <Box size={[0.5, 0.18, 1.0]} pos={[-1.05, y0 + 0.09, 0]} color="#161616" />
      <mesh position={[0, y0 + 0.36, 0]}>
        <cylinderGeometry args={[1.18, 1.18, 0.36, 40, 1, true, 0.5, Math.PI * 2 - 1.0]} />
        <meshStandardMaterial color="#161616" roughness={0.6} side={2} />
      </mesh>
      {/* pilha */}
      <Cyl r={1.0} h={0.32} pos={[0, y0 + 0.34, 0]} color="#c9cdd3" metal={0.85} rough={0.28} seg={48} />
      <mesh position={[0, y0 + 0.502, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={label} transparent color="#222" />
      </mesh>
      <Box size={[1.1, 0.04, 0.35]} pos={[-0.85, y0 + 0.53, 0]} color="#d2d5da" metal={0.85} rough={0.3} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={`${fmt(live.v, 2)} V${live.i > 0.0005 ? ` · ${fmt(live.i * 1000, 0)} mA` : ''}`} color={live.hot ? '#dc2626' : '#f5f5f5'} />
}

export default [
  { type: 'aaCell', Model: AaModel, Overlay2D },
  { type: 'cr2032', Model: CoinModel, Overlay2D },
]
