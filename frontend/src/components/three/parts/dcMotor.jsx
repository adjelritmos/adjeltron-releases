// Motor DC 130 num suporte de plástico, com a ventoinha de 3 pás laranja dos kits escolares.
// Lata prateada de lados achatados (como o motor130), tampa de plástico atrás com os terminais
// de latão e os fios, abraçadeira do suporte e hélice com pás torcidas que roda com live.angle.
import { Box, RBox, Cyl, mat, METAL, useFrame, useRef, liveOf } from '../kit.jsx'
import { canGeo } from './nema17.jsx'
import { bladeGeo } from './propeller.jsx'
import { Badge, Boom } from './group-c-ui.jsx'

const AXIS_Y = 3.0
const SUPPORT = '#3a3d42'

// pá larga da ventoinha (plástico mole, ponta redonda)
const fanBlade = () =>
  bladeGeo('fan130', {
    r0: 0.22,
    R: 2.8,
    chord: (t) => (0.45 + 0.75 * Math.sin(Math.min(1, t * 1.8) * Math.PI * 0.5)) * (t > 0.85 ? Math.sqrt(Math.max(0.08, (1 - t) / 0.15)) : 1),
    twist: (t) => 0.75 - 0.35 * t,
    thick: (t) => 0.09 - 0.04 * t,
    sweep: (t) => -0.25 * t * t,
    camber: 0.06,
    n: 12,
  })

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
      {/* suporte: base com 2 furos, coluna com nervura e abraçadeira à volta da lata */}
      <RBox size={[1.8, 0.2, 2.2]} r={0.06} pos={[-0.1, 0.1, 0]} color={SUPPORT} rough={0.55} />
      {[-0.75, 0.75].map((z) => (
        <Cyl key={z} r={0.12} h={0.02} pos={[-0.65, 0.205, z]} color="#111" seg={12} />
      ))}
      <RBox size={[0.5, AXIS_Y - 0.9, 1.0]} r={0.05} pos={[-0.1, 0.2 + (AXIS_Y - 1.1) / 2, 0]} color={SUPPORT} rough={0.55} />
      <Box size={[1.1, 1.2, 0.12]} pos={[-0.1, 0.8, 0]} color={SUPPORT} rough={0.55} />
      <Cyl r={1.08} h={0.5} pos={[-0.1, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color={SUPPORT} rough={0.55} seg={32} />
      <Box size={[0.5, 0.3, 0.3]} pos={[-0.1, AXIS_Y - 1.15, 0]} color={SUPPORT} rough={0.55} />
      {/* lata do motor 130 (lados achatados em ±z) */}
      <mesh position={[1.15, AXIS_Y, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={canGeo(1.0, 0.78, 2.5, 0.05)} material={mat('#d3d7db', 0.8, 0.3)} castShadow receiveShadow />
      <Cyl r={0.33} h={0.12} pos={[1.2, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#b9bfc4" metal={0.8} rough={0.35} seg={20} />
      {/* tampa de plástico atrás com o casquilho */}
      <mesh position={[-1.35, AXIS_Y, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={canGeo(0.95, 0.74, 0.18, 0.04)} material={mat('#e8e1d0', 0, 0.55)} castShadow />
      <Cyl r={0.25} h={0.1} pos={[-1.56, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#efe9da" rough={0.5} seg={16} />
      {/* terminais de latão com furo e o fio soldado */}
      {[-0.45, 0.45].map((z, i) => (
        <group key={z}>
          <Box size={[0.25, 0.3, 0.05]} pos={[-1.55, AXIS_Y + 0.05, z]} color={METAL.brass} metal={1} rough={0.3} />
          <Cyl r={0.05} h={0.06} pos={[-1.6, AXIS_Y + 0.1, z]} rot={[Math.PI / 2, 0, 0]} color="#151515" seg={10} />
          <Box size={[0.12, 0.12, 0.08]} pos={[-1.5, AXIS_Y + 0.42, z]} color={i ? '#212121' : '#e53935'} />
        </group>
      ))}
      {/* veio + hélice */}
      <Cyl r={0.05} h={0.6} pos={[1.55, AXIS_Y, 0]} rot={[0, 0, Math.PI / 2]} color="#ddd" metal={0.9} />
      <group position={[1.75, AXIS_Y, 0]}>
        <group ref={prop}>
          <group rotation={[0, 0, -Math.PI / 2]}>
            <Cyl r={0.28} h={0.35} color="#ff7a1a" rough={0.45} seg={18} />
            <Cyl r={0.2} r2={0.28} h={0.1} pos={[0, 0.22, 0]} color="#ff7a1a" rough={0.45} seg={18} />
            {[0, 1, 2].map((k) => (
              <mesh key={k} rotation={[0, (k * 2 * Math.PI) / 3, 0]} geometry={fanBlade()} material={mat('#ff7a1a', 0, 0.45)} castShadow />
            ))}
          </group>
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
