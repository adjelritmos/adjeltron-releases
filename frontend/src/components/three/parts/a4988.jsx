// Placa Pololu A4988: dissipador de alumínio com alhetas, trimpot de corrente e 2 filas de 8 pinos.
import { Box, Cyl, Leg, useLabel } from '../kit.jsx'
import def from '@shared/parts/a4988.js'

const PCB_Y = 0.35
const T = 0.16
const TOP = PCB_Y + T

function Model() {
  const label = useLabel([{ text: 'A4988', font: 'bold 80px Arial' }], 256, 96)
  return (
    <group>
      {/* pernas até à breadboard e barras de plástico das filas */}
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], TOP + 0.05, p.pos[2]]} r={0.03} color="#d4af37" />
      ))}
      {[-0.635, 0.635].map((z) => (
        <Box key={z} size={[2.03, 0.25, 0.24]} pos={[0, PCB_Y - 0.125, z]} color="#111" />
      ))}
      <Box size={[2.03, T, 1.52]} pos={[0, PCB_Y + T / 2, 0]} color="#1d7a3a" rough={0.6} />
      {/* dissipador com alhetas sobre o chip */}
      <Box size={[0.95, 0.12, 0.9]} pos={[0.25, TOP + 0.06, 0]} color="#c9cdd2" metal={0.8} rough={0.4} />
      {Array.from({ length: 5 }, (_, i) => (
        <Box key={i} size={[0.9, 0.42, 0.08]} pos={[0.25, TOP + 0.33, -0.36 + i * 0.18]} color="#d0d4d8" metal={0.8} rough={0.35} />
      ))}
      {/* trimpot de limitação de corrente */}
      <Cyl r={0.17} h={0.12} pos={[-0.6, TOP + 0.06, -0.15]} color="#e8e8e8" seg={20} />
      <Box size={[0.24, 0.02, 0.05]} pos={[-0.6, TOP + 0.13, -0.15]} rot={[0, Math.PI / 4, 0]} color="#888" />
      <mesh position={[-0.6, TOP + 0.002, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.22]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {def.pins.map((p) => (
        <Cyl key={`h${p.id}`} r={0.07} h={0.02} pos={[p.pos[0], TOP + 0.005, p.pos[2]]} color="#c9a227" metal={0.8} seg={10} />
      ))}
    </group>
  )
}

export default { type: 'a4988', Model }
