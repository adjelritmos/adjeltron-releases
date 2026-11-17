// Pilha de 9 V deitada, com clip de pressão e fios vermelho/preto até aos pinos.
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'
import def from '@shared/parts/battery9v.js'
import { Badge, fmt } from './group-c-ui.jsx'

const L = 4.85
const H = 1.75
const Dz = 2.65

export function LeadPair({ from, pins }) {
  // fios do clip/suporte até aos pinos, com uma pequena curva
  return pins.map((p, i) => {
    const c = i ? '#212121' : '#e53935'
    const a = [from[0], from[1], from[2] + (i ? 0.25 : -0.25)]
    const m = [(a[0] + p.pos[0]) / 2, 0.35, (a[2] + p.pos[2]) / 2 + (i ? 0.25 : -0.25)]
    const end = [p.pos[0] - 0.3, p.pos[1], p.pos[2]]
    return (
      <group key={p.id}>
        <Leg from={a} to={m} r={0.06} color={c} />
        <Leg from={m} to={end} r={0.06} color={c} />
        <Leg from={end} to={p.pos} r={0.03} color="#c9c9c9" />
      </group>
    )
  })
}

function Model() {
  const label = useLabel([{ text: '9V', font: 'bold 120px Arial', y: 110 }, { text: 'ALCALINA', font: 'bold 46px Arial', y: 200 }], 512, 256)
  return (
    <group>
      <Box size={[L * 0.62, H, Dz]} pos={[-L / 2 + (L * 0.62) / 2, H / 2, 0]} color="#1f2937" rough={0.4} />
      <Box size={[L * 0.38, H, Dz]} pos={[L / 2 - (L * 0.38) / 2, H / 2, 0]} color="#d97706" rough={0.35} metal={0.3} />
      <mesh position={[-0.6, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 1.3]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {/* terminais + clip */}
      <Cyl r={0.3} h={0.25} pos={[L / 2 + 0.12, H / 2, -0.64]} rot={[0, 0, Math.PI / 2]} color="#c9ccd1" metal={0.9} />
      <Cyl r={0.42} h={0.25} pos={[L / 2 + 0.12, H / 2, 0.64]} rot={[0, 0, Math.PI / 2]} color="#c9ccd1" metal={0.9} seg={6} />
      <Box size={[0.45, H * 0.85, Dz * 0.85]} pos={[L / 2 + 0.45, H / 2, 0]} color="#151515" rough={0.6} />
      <LeadPair from={[L / 2 + 0.68, H / 2, 0]} pins={def.pins} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  return <Badge info={info} text={live.hot ? 'CURTO!' : `${fmt(live.v, 2)} V`} color={live.hot ? '#dc2626' : '#f5f5f5'} />
}

export default { type: 'battery9v', Model, Overlay2D }
