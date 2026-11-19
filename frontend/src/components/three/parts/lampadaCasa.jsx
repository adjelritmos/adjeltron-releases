// Candeeiro/lâmpada: florão (rosácea torneada) com a régua de dois bornes e, conforme o modelo,
// candeeiro pendente (cabo têxtil, casquilho E27 de baquelite e abajur de chapa lacada, branco
// por dentro, com o rebordo enrolado), plafon (base com aro e difusor opalino), aplique de parede
// (braço de latão e copo de vidro) ou lâmpada LED A60 com a rosca E27 num suporte de porcelana.
// O vidro brilha e uma luz pontual ilumina a casa com o brilho do simulador (live.b = potência
// relativa).
import { Cyl, Halo, mat, mergedGeo, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { LUZ } from '@shared/parts/lampadaCasa.js'
import { Bornes, shadeGeo, latheGeo } from './_casaKit.jsx'

const WHITE = '#f4f3ef'
const BRASS = '#b48a3c'

// perfil da ampola A60 (pescoço para −y, junto ao casquilho), raio 1 ≈ 0,55 do modelo
const A60 = (() => {
  const pts = [[0.47, -1.45], [0.49, -1.1]]
  for (let i = 0; i <= 14; i++) {
    const a = (-60 + (150 * i) / 14) * (Math.PI / 180)
    pts.push([Math.cos(a), Math.sin(a)])
  }
  return pts
})()
// rosca E27 (perfil ondulado) de y = 0 a 1
const E27 = Array.from({ length: 25 }, (_, i) => [1 + 0.07 * Math.cos((i * Math.PI) / 2), i / 24])

function Bulb({ pos, r = 0.55, color, read, light = 260, frosted = false, shape = 'sphere' }) {
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
      {shape === 'a60' ? (
        <mesh scale={[r, r, r]} geometry={latheGeo('lampA60', A60, 28)}>
          <meshStandardMaterial ref={m} color={frosted ? '#ffffff' : '#fffaf0'} emissive={color} emissiveIntensity={0} roughness={frosted ? 0.6 : 0.1} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ) : (
        <mesh>
          <sphereGeometry args={[r, 24, 16]} />
          <meshStandardMaterial ref={m} color={frosted ? '#ffffff' : '#fffaf0'} emissive={color} emissiveIntensity={0} roughness={frosted ? 0.6 : 0.1} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      )}
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
  const y0 = 0.5 + fio
  // florão torneado (degrau e cúpula)
  const rose = latheGeo('lampRose', [[0.001, 0], [1.0, 0], [1.0, 0.12], [0.94, 0.2], [0.82, 0.34], [0.55, 0.45], [0.3, 0.5], [0.001, 0.5]], 36)
  return (
    <group>
      {/* florão com a régua de bornes do lado −x */}
      <mesh geometry={rose} material={mat(WHITE, 0, 0.45)} castShadow receiveShadow />
      <Bornes pos={[-0.95, 0.25, 0]} size={[0.4, 0.4, 1.1]} />
      {estilo === 'pendente' && (
        <group>
          {/* cabo têxtil, bucim e casquilho E27 de baquelite com o anel roscado */}
          <Cyl r={0.05} h={fio} pos={[0, 0.5 + fio / 2, 0]} color="#1d1d1d" rough={0.9} seg={8} />
          <Cyl r={0.1} r2={0.07} h={0.25} pos={[0, 0.62, 0]} color="#1d1d1d" rough={0.5} seg={10} />
          <Cyl r={0.18} r2={0.28} h={0.2} pos={[0, y0 + 0.1, 0]} color="#222" rough={0.4} seg={16} />
          <Cyl r={0.3} h={0.5} pos={[0, y0 + 0.45, 0]} color="#2a2a2a" rough={0.4} seg={16} />
          <Cyl r={0.33} h={0.06} pos={[0, y0 + 0.42, 0]} color="#2a2a2a" rough={0.35} seg={16} />
          {/* abajur: chapa lacada por fora, branca por dentro, rebordo enrolado */}
          <mesh geometry={shadeGeo(0.45, 2.3, 2.0)} position={[0, y0 + 0.2, 0]} material={mat(shadeC, 0.2, 0.38)} castShadow />
          <mesh geometry={shadeGeo(0.45, 2.3, 2.0)} position={[0, y0 + 0.2, 0]} material={mat('#f3f1ea', 0, 0.6, { side: THREE.BackSide })} />
          <mesh position={[0, y0 + 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={mergedGeo('lampRim', () => [[new THREE.TorusGeometry(2.3, 0.04, 6, 48), [0, 0, 0]]])} material={mat(shadeC, 0.2, 0.38)} />
          <Bulb pos={[0, y0 + 1.45, 0]} color={color} read={read} shape="a60" />
        </group>
      )}
      {estilo === 'plafon' && (
        <group>
          <Cyl r={2.0} r2={2.05} h={0.2} pos={[0, 0.6, 0]} color={WHITE} rough={0.45} seg={40} />
          <mesh position={[0, 0.71, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={mergedGeo('lampTrim', () => [[new THREE.TorusGeometry(1.92, 0.035, 6, 48), [0, 0, 0]]])} material={mat('#c9ced3', 1, 0.3)} />
          <group scale={[1, 0.42, 1]} position={[0, 0.7, 0]}>
            <Bulb pos={[0, 0, 0]} r={1.9} color={color} read={read} frosted light={300} />
          </group>
        </group>
      )}
      {estilo === 'aplique' && (
        <group>
          <Cyl r={0.12} h={1.4} pos={[0, 1.2, 0]} color={BRASS} metal={0.9} rough={0.28} seg={12} />
          <Cyl r={0.2} r2={0.24} h={0.15} pos={[0, 0.57, 0]} color={BRASS} metal={0.9} rough={0.28} seg={14} />
          {/* copo de vidro vertical (z = cima quando preso numa parede) */}
          <group position={[0, 2.1, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={shadeGeo(0.6, 1.0, 1.8)} position={[0, -1.1, 0]} material={mat('#f6efe2', 0, 0.3, { side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false })} />
            <Cyl r={0.4} h={0.5} pos={[0, -1.25, 0]} color={BRASS} metal={0.9} rough={0.28} seg={16} />
            <Cyl r={0.45} h={0.06} pos={[0, -1.02, 0]} color={BRASS} metal={0.9} rough={0.28} seg={16} />
          </group>
          <Bulb pos={[0, 2.1, 0.9]} r={0.45} color={color} read={read} light={200} />
        </group>
      )}
      {estilo === 'lampada' && (
        <group>
          {/* suporte de porcelana, rosca E27 de latão niquelado, gola de plástico e ampola A60 */}
          <Cyl r={0.42} h={0.9} pos={[0, 0.95, 0]} color="#ececec" rough={0.3} seg={20} />
          <Cyl r={0.44} h={0.08} pos={[0, 1.36, 0]} color="#ececec" rough={0.3} seg={20} />
          <mesh position={[0, 1.4, 0]} scale={[0.31, 0.45, 0.31]} geometry={latheGeo('lampE27', E27, 20)} material={mat('#c9cdd1', 1, 0.3)} />
          <Cyl r={0.36} r2={0.33} h={0.35} pos={[0, 1.95, 0]} color="#f4f4f4" rough={0.3} seg={20} />
          <Bulb pos={[0, 2.65, 0]} r={0.62} color={color} read={read} frosted shape="a60" />
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
