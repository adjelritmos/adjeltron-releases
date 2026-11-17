// Aquecedor de quartzo: caixa metálica com refletor polido, 3 tubos de quartzo horizontais que
// ficam ao rubro com live.g (potência relativa, com inércia térmica), grelha de proteção à
// frente (+x), pés e botão. Ilumina e "aquece" a sala com uma luz laranja.
import { Box, RBox, Cyl, Halo, geo, liveOf, useFrame, useMemo, useRef, THREE } from '../kit.jsx'
import { AQ } from '@shared/parts/aquecedor.js'

const TUBES = [0.95, 2.1, 3.25]

function Model({ part }) {
  const c = part.config || {}
  const { W, H, D, Y0 } = AQ
  const body = c.cor || '#d9dcdf'
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3e6d6', emissive: '#ff5a1a', emissiveIntensity: 0, roughness: 0.25, transparent: true, opacity: 0.92, toneMapped: false }), [])
  const coil = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4b3a', emissive: '#ff8a2a', emissiveIntensity: 0, roughness: 0.5, toneMapped: false }), [])
  const light = useRef()
  useFrame(() => {
    const g = Math.max(0, Math.min(1.5, liveOf(part.id)?.g || 0))
    glow.emissiveIntensity = g * 2.2
    glow.color.set(g > 0.05 ? '#ffd2a8' : '#f3e6d6')
    coil.emissiveIntensity = g * 3
    if (light.current) light.current.intensity = g * 60
  })
  const tubeGeo = geo(`aqTube${W}`, () => new THREE.CylinderGeometry(0.17, 0.17, W - 0.7, 16).rotateX(Math.PI / 2))
  const coilGeo = geo(`aqCoil${W}`, () => new THREE.CylinderGeometry(0.07, 0.07, W - 0.8, 8).rotateX(Math.PI / 2))
  const yb = Y0
  return (
    <group>
      {/* pés */}
      {[-1, 1].map((s) => (
        <RBox key={s} size={[D + 0.6, 0.2, 0.45]} r={0.06} pos={[0, 0.1, s * (W / 2 - 0.5)]} color="#3a3d41" />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.3, Y0 - 0.15, 0.3]} pos={[0, 0.2 + (Y0 - 0.2) / 2, s * (W / 2 - 0.5)]} color="#3a3d41" />
      ))}
      {/* caixa: fundo refletor, laterais, topo e base */}
      <Box size={[0.1, H, W]} pos={[-D / 2 + 0.05, yb + H / 2, 0]} color="#e6e9ec" metal={0.95} rough={0.15} />
      <Box size={[D, H, 0.2]} pos={[0, yb + H / 2, -W / 2 + 0.1]} color={body} metal={0.5} rough={0.4} />
      <Box size={[D, H, 0.2]} pos={[0, yb + H / 2, W / 2 - 0.1]} color={body} metal={0.5} rough={0.4} />
      <RBox size={[D + 0.1, 0.3, W + 0.1]} r={0.06} pos={[0, yb + H - 0.15, 0]} color={body} metal={0.5} rough={0.4} />
      <RBox size={[D + 0.1, 0.3, W + 0.1]} r={0.06} pos={[0, yb + 0.15, 0]} color={body} metal={0.5} rough={0.4} />
      {/* refletores curvos atrás de cada tubo */}
      {TUBES.map((y) => (
        <mesh key={y} position={[-D / 2 + 0.55, yb + y + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo(`aqRefl${W}`, () => new THREE.CylinderGeometry(0.5, 0.5, W - 0.45, 20, 1, true, Math.PI, Math.PI))}>
          <meshStandardMaterial color="#f4f6f8" metalness={0.95} roughness={0.12} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* tubos de quartzo com a resistência em espiral (fio) por dentro */}
      {TUBES.map((y) => (
        <group key={y} position={[-D / 2 + 0.6, yb + y + 0.05, 0]}>
          <mesh geometry={tubeGeo} material={glow} />
          <mesh geometry={coilGeo} material={coil} />
          <Cyl r={0.22} h={0.2} pos={[0, 0, -(W - 0.7) / 2]} rot={[Math.PI / 2, 0, 0]} color="#b9bec4" metal={0.8} rough={0.3} seg={12} />
          <Cyl r={0.22} h={0.2} pos={[0, 0, (W - 0.7) / 2]} rot={[Math.PI / 2, 0, 0]} color="#b9bec4" metal={0.8} rough={0.3} seg={12} />
        </group>
      ))}
      {/* grelha de proteção (varetas verticais) */}
      {Array.from({ length: 15 }, (_, i) => (
        <Cyl key={i} r={0.03} h={H - 0.5} pos={[D / 2 - 0.05, yb + H / 2, -W / 2 + 0.35 + (i * (W - 0.7)) / 14]} color="#cfd3d6" metal={0.9} rough={0.3} seg={6} />
      ))}
      {[0.9, H / 2, H - 0.9].map((y) => (
        <Box key={y} size={[0.05, 0.05, W - 0.4]} pos={[D / 2 - 0.05, yb + y, 0]} color="#cfd3d6" metal={0.9} rough={0.3} />
      ))}
      {/* botão de potência e bornes atrás */}
      <Cyl r={0.22} h={0.15} pos={[0.2, yb + H + 0.07, W / 2 - 0.7]} color="#202326" seg={16} />
      <Box size={[0.4, 0.3, 1.0]} pos={[-D / 2 - 0.25, 0.25, 0]} color="#e9e9e4" />
      <Halo pos={[D / 2 + 0.2, yb + H / 2, 0]} size={W * 1.3} color="#ff7a2a" read={() => Math.min(1, (liveOf(part.id)?.g || 0) * 0.8)} />
      <pointLight ref={light} position={[D / 2 + 1.5, yb + H / 2, 0]} color="#ff7a2a" intensity={0} distance={40} decay={2} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  const g = live?.g || 0
  if (g < 0.05) return null
  const [x, y] = info.project([0, 0, 0])
  return <rect x={x - 12} y={y - 32} width={24} height={64} rx={5} fill="#ff7a2a" opacity={Math.min(0.8, 0.2 + g * 0.5)} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'aquecedor', Model, Overlay2D }
