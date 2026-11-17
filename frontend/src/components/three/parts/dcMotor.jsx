// Motor DC 130 num suporte, com hélice de 3 pás que roda com live.angle.
import { Box, Cyl, useFrame, useRef, liveOf } from '../kit.jsx'
import { Badge, Boom } from './group-c-ui.jsx'

const AXIS_Y = 3.0

function Model({ part }) {
  const prop = useRef()
  const blur = useRef()
  useFrame(() => {
    const L = liveOf(part.id)
    if (prop.current) prop.current.rotation.x = L?.angle || 0
    // a alta velocidade a hélice "desfoca" num disco translúcido
    if (blur.current) blur.current.opacity = Math.min(0.35, Math.abs(L?.rpm || 0) / 12000)
  })
  return (
    <group>
      {/* suporte */}
      <Box size={[1.8, 0.2, 2.2]} pos={[-0.1, 0.1, 0]} color="#3a3a3a" />
      <Box size={[0.5, AXIS_Y - 0.9, 1.0]} pos={[-0.1, 0.2 + (AXIS_Y - 1.1) / 2, 0]} color="#3a3a3a" />
      <Cyl r={1.08} h={0.5} pos={[-0.1, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#3a3a3a" />
      {/* corpo do motor (lados achatados) */}
      <mesh position={[-0.1, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.78]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 2.5, 32]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.3} />
      </mesh>
      <Cyl r={0.75} h={0.15} pos={[-1.42, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#e8e1d0" />
      <Cyl r={0.3} h={0.15} pos={[1.22, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#c9ccd1" metal={0.8} />
      {/* terminais */}
      {[-0.45, 0.45].map((z, i) => (
        <group key={z}>
          <Box size={[0.25, 0.3, 0.06]} pos={[-1.55, AXIS_Y + 0.05, z]} color="#d9a441" metal={0.9} rough={0.3} />
          <Box size={[0.12, 0.12, 0.08]} pos={[-1.5, AXIS_Y + 0.42, z]} color={i ? '#212121' : '#e53935'} />
        </group>
      ))}
      {/* veio + hélice */}
      <Cyl r={0.05} h={0.6} pos={[1.55, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#ddd" metal={0.9} />
      <group position={[1.75, AXIS_Y, 0]}>
        <group ref={prop}>
          <Cyl r={0.25} h={0.35} rot={[0, 0, Math.PI / 2]} color="#ff7a1a" />
          {[0, 1, 2].map((k) => (
            <group key={k} rotation={[(k * 2 * Math.PI) / 3, 0, 0]}>
              <Box size={[0.06, 2.6, 0.7]} pos={[0, 1.5, 0]} rot={[0, 0.4, 0]} color="#ff7a1a" rough={0.5} />
            </group>
          ))}
        </group>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[2.85, 2.85, 0.02, 40]} />
          <meshStandardMaterial ref={blur} color="#ff9a4a" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burned) return <Boom info={info} />
  const rpm = Math.abs(live.rpm || 0)
  return <Badge info={info} text={`${Math.round(live.rpm || 0)} rpm`} color={rpm > 10 ? '#f5f5f5' : '#404040'} />
}

export default { type: 'dcMotor', Model, Overlay2D }
