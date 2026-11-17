// Drivers do grupo G: DRV8825 (placa Pololu roxa, dissipador) e TB6612FNG (placa vermelha).
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'
import drvDef from '@shared/parts/drv8825.js'
import tbDef from '@shared/parts/tb6612.js'

const PCB_Y = 0.35
const T = 0.16
const TOP = PCB_Y + T

function Legs({ def, w, rows }) {
  return (
    <>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], TOP + 0.05, p.pos[2]]} r={0.03} color="#d4af37" />
      ))}
      {rows.map((z) => (
        <Box key={z} size={[w, 0.25, 0.24]} pos={[0, PCB_Y - 0.125, z]} color="#111" />
      ))}
      {def.pins.map((p) => (
        <Cyl key={`h${p.id}`} r={0.07} h={0.02} pos={[p.pos[0], TOP + 0.005, p.pos[2]]} color="#c9a227" metal={0.8} seg={10} />
      ))}
    </>
  )
}

function DrvModel() {
  const label = useLabel([{ text: 'DRV8825', font: 'bold 74px Arial' }], 256, 96)
  return (
    <group>
      <Legs def={drvDef} w={2.03} rows={[-0.635, 0.635]} />
      <Box size={[2.03, T, 1.52]} pos={[0, PCB_Y + T / 2, 0]} color="#5b2a86" rough={0.6} />
      <Box size={[0.95, 0.12, 0.9]} pos={[0.25, TOP + 0.06, 0]} color="#c9cdd2" metal={0.8} rough={0.4} />
      {Array.from({ length: 5 }, (_, i) => (
        <Box key={i} size={[0.9, 0.42, 0.08]} pos={[0.25, TOP + 0.33, -0.36 + i * 0.18]} color="#d0d4d8" metal={0.8} rough={0.35} />
      ))}
      <Cyl r={0.17} h={0.12} pos={[-0.6, TOP + 0.06, -0.15]} color="#e8e8e8" seg={20} />
      <Box size={[0.24, 0.02, 0.05]} pos={[-0.6, TOP + 0.13, -0.15]} rot={[0, Math.PI / 4, 0]} color="#888" />
      <mesh position={[-0.6, TOP + 0.002, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.22]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </group>
  )
}

function TbModel() {
  const label = useLabel([{ text: 'TB6612FNG', font: 'bold 64px Arial' }], 512, 96)
  return (
    <group>
      <Legs def={tbDef} w={2.03} rows={[-0.889, 0.889]} />
      <Box size={[2.03, T, 2.03]} pos={[0, PCB_Y + T / 2, 0]} color="#c62828" rough={0.6} />
      {/* chip SSOP-24 e condensadores */}
      <Box size={[0.8, 0.12, 0.55]} pos={[0, TOP + 0.06, 0]} color="#151515" rough={0.4} />
      {[-1, 1].map((s) => [-3, -1, 1, 3].map((k) => <Box key={`${s}${k}`} size={[0.05, 0.04, 0.12]} pos={[k * 0.09, TOP + 0.02, s * 0.33]} color="#ccc" metal={0.8} />))}
      <Box size={[0.3, 0.18, 0.18]} pos={[-0.7, TOP + 0.09, 0]} color="#c9a227" />
      <Box size={[0.3, 0.18, 0.18]} pos={[0.7, TOP + 0.09, 0]} color="#c9a227" />
      <mesh position={[0, TOP + 0.002, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.28]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </group>
  )
}

function TbOverlay({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={live.hot ? '#f87171' : '#fff'} stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">
      {live.hot ? 'QUENTE' : live.stby ? `A ${live.out?.[0] ?? 0}V B ${live.out?.[1] ?? 0}V` : 'STBY'}
    </text>
  )
}

export default [
  { type: 'drv8825', Model: DrvModel, Overlay2D: ({ info, live }) => (live?.enabled ? <text x={info.project([0, 0, 0])[0]} y={info.project([0, 0, 0])[1] + 4} textAnchor="middle" fontSize={9} fill="#fff" stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">{`1/${live.micro}`}</text> : null) },
  { type: 'tb6612', Model: TbModel, Overlay2D: TbOverlay },
]
