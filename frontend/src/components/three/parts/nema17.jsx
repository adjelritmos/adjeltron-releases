// Motor de passo NEMA 17 (42 × 42 mm): o veio com a bandeira roda com live.angle
// (positivo = sentido horário visto de cima). Placa de ligação com 4 pinos à esquerda.
import { Box, Cyl, Leg, Pcb, HeaderPins, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import def from '@shared/parts/nema17.js'

const S = 4.23
const WIRES = ['#e53935', '#1e63d6', '#2e9d3a', '#1a1a1a']

// bloco quadrado de chanfros nos cantos (prisma octogonal)
function Block({ y0, h, color, metal = 0, rough = 0.5 }) {
  return (
    <group position={[0, y0 + h / 2, 0]}>
      <mesh rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[S / 2 / Math.cos(Math.PI / 8) * 0.985, S / 2 / Math.cos(Math.PI / 8) * 0.985, h, 8]} />
        <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
      </mesh>
      <mesh>
        <boxGeometry args={[S * 0.86, h, S]} />
        <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
      </mesh>
      <mesh>
        <boxGeometry args={[S, h, S * 0.86]} />
        <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
      </mesh>
    </group>
  )
}

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.y = -(liveOf(part.id)?.angle || 0) * D2R
  })
  return (
    <group>
      <Block y0={0} h={0.7} color="#c3c7cc" metal={0.8} rough={0.35} />
      <Block y0={0.7} h={2.6} color="#1c1c1c" rough={0.6} />
      <Block y0={3.3} h={0.7} color="#c3c7cc" metal={0.8} rough={0.35} />
      {/* parafusos e ressalto central */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} r={0.22} h={0.06} pos={[sx * 1.55, 4.02, sz * 1.55]} color="#2a2a2a" seg={16} />
      ))}
      <Cyl r={1.1} h={0.2} pos={[0, 4.1, 0]} color="#d0d4d8" metal={0.85} rough={0.3} seg={40} />
      {/* veio rotativo com o plano (D) e bandeira */}
      <group ref={shaft}>
        <Cyl r={0.25} h={2.4} pos={[0, 3.9 + 1.2, 0]} color="#e6e8ea" metal={0.95} rough={0.2} />
        <Box size={[0.1, 1.5, 0.4]} pos={[0.22, 5.5, 0]} color="#b8bcc0" metal={0.9} rough={0.25} />
        <Box size={[1.7, 0.1, 0.36]} pos={[0.85, 6.15, 0]} color="#e53935" />
        <Cyl r={0.4} h={0.12} pos={[0, 6.15, 0]} color="#e53935" />
      </group>
      {/* conector e cabo até à placa de ligação */}
      <Box size={[0.4, 0.55, 1.4]} pos={[-2.2, 0.55, 0]} color="#f2f2f2" />
      {WIRES.map((c, i) => {
        const z = (i - 1.5) * 0.254
        return <Leg key={c} from={[-2.35, 0.55, z * 1.3]} to={[-2.75, 0.2, z]} r={0.045} color={c} />
      })}
      <Pcb size={[0.55, 0.16, 1.4]} pos={[-2.83, 0, 0]} color="#1f7a3a" holes={false} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'nema17', Model }
