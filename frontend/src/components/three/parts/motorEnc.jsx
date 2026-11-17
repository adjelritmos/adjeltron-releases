// Motor JGA25-370 com encoder Hall: suporte em L, caixa redutora, motor, disco magnético
// (roda com live.motorAngle) e placa do encoder com a ficha de 6 vias. O veio D roda com o mount.
import { Box, Cyl, useFrame, useRef, liveOf, D2R } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { Badge } from './group-c-ui.jsx'
import { Holes, ALU, rotX } from './_mechKit.jsx'
import def, { JGA } from '@shared/parts/motorEnc.js'

const AY = JGA.AY
const WIRE = { 'M+': '#e53935', 'M-': '#f5f5f5', GND: '#212121', VCC: '#1e88e5', A: '#fdd835', B: '#43a047' }

function Model({ part }) {
  const shaft = useRef()
  const disc = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
    if (disc.current) disc.current.rotation.x = (liveOf(part.id)?.motorAngle || 0) * D2R
  })
  return (
    <group>
      {/* suporte em L */}
      <Box size={[2.45, 0.25, 3.0]} pos={[-0.975, 0.125, 0]} color={ALU} metal={0.8} rough={0.35} />
      <Box size={[0.25, 2.8, 3.0]} pos={[0.125, 1.4, 0]} color={ALU} metal={0.8} rough={0.35} />
      <Holes pts={[[-1.8, 0.13, -1.0], [-1.8, 0.13, 1.0], [-0.6, 0.13, -1.0], [-0.6, 0.13, 1.0]]} r={0.15} h={0.27} />
      <Holes pts={[[0.13, AY + 0.85, -0.85], [0.13, AY - 0.85, 0.85], [0.13, AY + 0.85, 0.85], [0.13, AY - 0.85, -0.85]]} r={0.13} h={0.27} axis="x" color="#555" />
      {/* caixa redutora */}
      <Cyl r={JGA.gearR} h={2.1} pos={[-1.05, AY, 0]} rot={rotX} color="#d9dde0" metal={0.85} rough={0.3} seg={36} />
      {[-0.7, -1.4].map((x) => (
        <Cyl key={x} r={JGA.gearR + 0.02} h={0.06} pos={[x, AY, 0]} rot={rotX} color="#9ea7ad" metal={0.8} rough={0.35} seg={36} />
      ))}
      {/* motor (lados achatados) */}
      <mesh position={[-3.65, AY, 0]} rotation={rotX} scale={[1, 1, 0.84]} castShadow>
        <cylinderGeometry args={[1.22, 1.22, 3.1, 32]} />
        <meshStandardMaterial color="#c4c8cc" metalness={0.75} roughness={0.35} />
      </mesh>
      <Cyl r={1.0} h={0.12} pos={[-5.25, AY, 0]} rot={rotX} color="#3a3a3a" seg={28} />
      {/* disco magnético e placa do encoder */}
      <group position={[-5.38, AY, 0]} ref={disc}>
        <Cyl r={0.62} h={0.14} rot={rotX} color="#424242" seg={24} />
        {[0, 1].map((k) => (
          <Box key={k} size={[0.15, 0.6, 0.14]} pos={[0, k ? 0.3 : -0.3, 0]} color={k ? '#c62828' : '#1565c0'} />
        ))}
      </group>
      <Cyl r={1.25} h={0.16} pos={[-5.6, AY, 0]} rot={rotX} color="#1b5e20" rough={0.6} seg={32} />
      <Box size={[0.08, 0.3, 0.3]} pos={[-5.52, AY + 0.75, 0.5]} color="#111" />
      <Box size={[0.08, 0.3, 0.3]} pos={[-5.52, AY + 0.75, -0.5]} color="#111" />
      {/* ficha de 6 vias (JST XH) com os fios coloridos */}
      <Box size={[0.4, 0.55, 1.75]} pos={[-5.85, AY, 0]} color="#f2f2f2" rough={0.5} />
      {def.pins.map((p) => (
        <group key={p.id}>
          <Box size={[0.1, 0.1, 0.1]} pos={[p.pos[0] + 0.02, p.pos[1], p.pos[2]]} color={WIRE[p.id]} />
        </group>
      ))}
      {/* veio de saída D (4 mm) */}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={JGA.shaftR} h={1.0} pos={[0.75, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={16} />
        <Box size={[0.8, 0.06, 0.3]} pos={[0.85, 0.17, 0]} color="#bfc4c8" metal={0.9} rough={0.25} />
      </group>
      <Cyl r={0.45} h={0.12} pos={[0.31, AY, 0]} rot={rotX} color="#d0d4d8" metal={0.85} rough={0.3} seg={24} />
    </group>
  )
}

export function MotorOverlay({ info, live }) {
  if (!live) return null
  const rpm = Math.round(live.rpm || 0)
  return <Badge info={info} text={`${rpm} rpm · ${live.count ?? 0}`} color={Math.abs(rpm) > 2 ? '#f5f5f5' : '#404040'} />
}

export default { type: 'motorEnc', Model, Overlay2D: MotorOverlay }
