// Candeeiro/lâmpada: base (rosácea) com dois bornes e, conforme o modelo, candeeiro pendente com
// abajur, plafon, aplique de parede ou lâmpada com casquilho. O vidro brilha e uma luz pontual
// ilumina a casa com o brilho do simulador (live.b = potência relativa).
import { Box, Cyl, Halo, mat, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { LUZ } from '@shared/parts/lampadaCasa.js'
import { shadeGeo } from './_casaKit.jsx'

const WHITE = '#f4f3ef'

function Bulb({ pos, r = 0.55, color, read, light = 260, frosted = false }) {
  const m = useRef()
  const l = useRef()
  useFrame(() => {
    const b = Math.max(0, Math.min(1.5, read() || 0))
    if (m.current) {
      m.current.emissiveIntensity = b * (frosted ? 1.6 : 2.6)
      m.current.opacity = b > 0.03 ? 0.98 : 0.55
    }
    if (l.current) l.current.intensity = b * light
  })
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[r, 24, 16]} />
        <meshStandardMaterial ref={m} color={frosted ? '#ffffff' : '#fffaf0'} emissive={color} emissiveIntensity={0} roughness={frosted ? 0.6 : 0.1} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <pointLight ref={l} color={color} intensity={0} distance={120} decay={2} />
      <Halo size={r * 6} color={color} read={() => Math.min(1, read() || 0)} />
    </group>
  )
}

function Model({ part }) {
  const c = part.config || {}
  const estilo = c.estilo || 'pendente'
  const color = LUZ[c.luz] || LUZ.quente
  const read = () => liveOf(part.id)?.b || 0
  const fio = Math.max(0.5, +(c.fio ?? 4))
  const shadeC = c.abajur || '#2e3a40'
  return (
    <group>
      {/* base com bornes de parafuso do lado −x */}
      <Cyl r={1.0} h={0.5} pos={[0, 0.25, 0]} color={WHITE} rough={0.5} seg={28} />
      <Box size={[0.4, 0.4, 1.1]} pos={[-0.95, 0.25, 0]} color="#e9e9e4" rough={0.5} />
      {[-0.35, 0.35].map((z) => (
        <Cyl key={z} r={0.1} h={0.06} pos={[-0.95, 0.47, z]} color="#c0c6cc" metal={0.85} rough={0.3} seg={10} />
      ))}
      {estilo === 'pendente' && (
        <group>
          <Cyl r={0.05} h={fio} pos={[0, 0.5 + fio / 2, 0]} color="#1d1d1d" rough={0.6} seg={8} />
          <Cyl r={0.32} h={0.7} pos={[0, 0.5 + fio + 0.35, 0]} color="#2a2a2a" rough={0.4} seg={16} />
          <mesh geometry={shadeGeo(0.45, 2.3, 2.0)} position={[0, 0.5 + fio + 0.2, 0]} material={mat(shadeC, 0.2, 0.45, { side: THREE.DoubleSide })} castShadow />
          <Bulb pos={[0, 0.5 + fio + 1.45, 0]} color={color} read={read} />
        </group>
      )}
      {estilo === 'plafon' && (
        <group>
          <Cyl r={2.0} h={0.2} pos={[0, 0.6, 0]} color={WHITE} rough={0.5} seg={36} />
          <group scale={[1, 0.42, 1]} position={[0, 0.7, 0]}>
            <Bulb pos={[0, 0, 0]} r={1.9} color={color} read={read} frosted light={300} />
          </group>
        </group>
      )}
      {estilo === 'aplique' && (
        <group>
          <Cyl r={0.12} h={1.4} pos={[0, 1.2, 0]} color="#b48a3c" metal={0.85} rough={0.3} seg={12} />
          {/* copo de vidro vertical (z = cima quando preso numa parede) */}
          <group position={[0, 2.1, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={shadeGeo(0.6, 1.0, 1.8)} position={[0, -1.1, 0]} material={mat('#f6efe2', 0, 0.3, { side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false })} />
            <Cyl r={0.4} h={0.5} pos={[0, -1.25, 0]} color="#b48a3c" metal={0.85} rough={0.3} seg={16} />
          </group>
          <Bulb pos={[0, 2.1, 0.9]} r={0.45} color={color} read={read} light={200} />
        </group>
      )}
      {estilo === 'lampada' && (
        <group>
          <Cyl r={0.42} h={0.9} pos={[0, 0.95, 0]} color="#ececec" rough={0.45} seg={18} />
          <Cyl r={0.33} h={0.45} pos={[0, 1.6, 0]} color="#b9b9b9" metal={0.8} rough={0.3} seg={18} />
          <Cyl r={0.36} r2={0.33} h={0.35} pos={[0, 1.95, 0]} color="#f4f4f4" rough={0.3} seg={18} />
          <Bulb pos={[0, 2.65, 0]} r={0.62} color={color} read={read} />
        </group>
      )}
    </group>
  )
}

function Overlay2D({ live, part }) {
  const b = live?.b || 0
  if (b < 0.03) return null
  const c = LUZ[part?.config?.luz] || LUZ.quente
  return <circle r={14 + Math.min(1.3, b) * 22} fill={c} opacity={Math.min(0.85, 0.25 + b * 0.5)} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'lampadaCasa', Model, Overlay2D }
