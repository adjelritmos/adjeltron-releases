// Condensador eletrolítico radial: tamanho conforme a capacidade, risco claro do lado −
// (+x), tampa de alumínio com ranhuras; incha e abre quando rebenta (live.burst).
import { Leg, Cyl, Box, useFrame, useRef, liveOf } from '../kit.jsx'
import { capDiameter } from '@shared/parts/capacitor.js'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

const HEIGHT = { 0.5: 1.1, 0.63: 1.1, 0.8: 1.25, 1.0: 1.6, 1.25: 2.0, 1.6: 2.5 }
const Y0 = 0.25

function Model({ part }) {
  const d = capDiameter(part.config?.uF ?? 100)
  const r = d / 2
  const h = HEIGHT[d] ?? 1.2
  const top = useRef()
  const fume = useRef()
  useFrame(() => {
    const burst = !!liveOf(part.id)?.burst
    if (top.current) top.current.visible = !burst
    if (fume.current) fume.current.visible = burst
  })
  return (
    <group>
      <Leg from={[-0.127, 0, 0]} to={[-0.127, Y0 + 0.02, 0]} />
      <Leg from={[0.127, 0, 0]} to={[0.127, Y0 + 0.02, 0]} />
      <Cyl r={r} h={h} pos={[0, Y0 + h / 2, 0]} color="#1c2f6b" rough={0.45} seg={32} />
      {/* risco do − (lado +x), ligeiramente saliente para se ver de cima */}
      <mesh position={[0, Y0 + h / 2, 0]}>
        <cylinderGeometry args={[r + 0.012, r + 0.012, h * 0.98, 16, 1, true, Math.PI / 2 - 0.45, 0.9]} />
        <meshStandardMaterial color="#c9d3e6" roughness={0.5} side={2} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <Box key={k} size={[0.05, 0.02, 0.04]} pos={[r * 0.75, Y0 + h * (0.5 + k * 0.25), 0]} color="#1c2f6b" />
      ))}
      <group ref={top}>
        <Cyl r={r * 0.92} h={0.02} pos={[0, Y0 + h + 0.005, 0]} color="#d5d8dc" metal={0.8} rough={0.3} seg={32} />
        <Box size={[r * 1.2, 0.025, 0.03]} pos={[0, Y0 + h + 0.012, 0]} color="#8a8f96" />
        <Box size={[0.03, 0.025, r * 1.2]} pos={[0, Y0 + h + 0.012, 0]} color="#8a8f96" />
      </group>
      <group ref={fume} visible={false}>
        <mesh position={[0, Y0 + h, 0]}>
          <sphereGeometry args={[r * 0.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#6b5a3a" roughness={0.9} />
        </mesh>
        <Cyl r={r * 0.6} h={0.4} pos={[0, Y0 + h + 0.5, 0]} color="#9a9a9a" opacity={0.35} />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burst) return <Boom info={info} />
  return <Badge info={info} text={`${fmt(live.v, 2)} V`} color={live.hot ? '#dc2626' : '#f5f5f5'} />
}

export default { type: 'capacitor', Model, Overlay2D }
