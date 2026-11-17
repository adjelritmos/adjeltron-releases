// Ventoinha de pé / de mesa: base redonda, coluna (telescópica na de pé), cabeça com motor,
// hélice de 3 pás translúcidas e grelha de arame. A hélice roda com live.rpm e a cabeça oscila
// com live.osc (graus). Sopra para +x.
import { Cyl, Box, Leg, geo, mat, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { vpeDims } from '@shared/parts/ventoinhaPe.js'

function Guard({ R, x }) {
  // aro e raios da grelha (frente e trás) — arame cromado
  const ring = geo(`vpeRing${R}`, () => new THREE.TorusGeometry(R, 0.045, 6, 48).rotateY(Math.PI / 2))
  const ringIn = geo(`vpeRingIn${R}`, () => new THREE.TorusGeometry(R * 0.55, 0.03, 6, 40).rotateY(Math.PI / 2))
  const m = mat('#d9dde0', 0.9, 0.3)
  const spokes = 16
  return (
    <group>
      {[x - 0.35, x + 0.35].map((xx) => (
        <group key={xx}>
          <mesh position={[xx, 0, 0]} geometry={ring} material={m} />
          <mesh position={[xx + (xx > x ? 0.08 : -0.08), 0, 0]} geometry={ringIn} material={m} />
          {Array.from({ length: spokes }, (_, i) => {
            const a = (i / spokes) * Math.PI * 2
            return <Leg key={i} from={[xx + (xx > x ? 0.18 : -0.18), 0, 0]} to={[xx, Math.cos(a) * R, Math.sin(a) * R]} r={0.018} color="#d9dde0" metal />
          })}
        </group>
      ))}
    </group>
  )
}

function Model({ part }) {
  const c = part.config || {}
  const d = vpeDims(c)
  const body = c.cor || '#f2f4f5'
  const head = useRef()
  const rotor = useRef()
  useFrame((_, dt) => {
    const L = liveOf(part.id)
    const rpm = L?.rpm || 0
    if (rotor.current) rotor.current.rotation.x += ((rpm * 2 * Math.PI) / 60) * Math.min(dt, 0.1)
    if (head.current) {
      const target = ((L?.osc ?? 0) * Math.PI) / 180
      head.current.rotation.y += (target - head.current.rotation.y) * Math.min(1, dt * 8)
    }
  })
  const blade = geo('vpeBlade', () => new THREE.SphereGeometry(1, 16, 10))
  const bladeMat = mat('#8fc8ef', 0, 0.25, { transparent: true, opacity: 0.8 })
  const colH = d.hub - 0.55
  return (
    <group>
      {/* base, bornes e coluna */}
      <Cyl r={d.base} r2={d.base * 1.05} h={0.3} pos={[0, 0.15, 0]} color={body} rough={0.4} seg={36} />
      <Cyl r={d.base * 0.55} r2={d.base * 0.7} h={0.25} pos={[0, 0.42, 0]} color={body} rough={0.4} seg={28} />
      <Box size={[0.4, 0.3, 1.0]} pos={[-1.15, 0.2, 0]} color="#e9e9e4" />
      {/* botões de velocidade na base */}
      {[-0.3, 0, 0.3].map((z, i) => (
        <Box key={z} size={[0.25, 0.12, 0.22]} pos={[d.base * 0.62, 0.36, z]} color={i === 0 ? '#3b82f6' : '#9ca3af'} />
      ))}
      <Cyl r={0.2} h={colH * 0.55} pos={[0, 0.5 + (colH * 0.55) / 2, 0]} color={body} rough={0.4} seg={16} />
      <Cyl r={0.13} h={colH * 0.5} pos={[0, 0.5 + colH * 0.55 + (colH * 0.45) / 2, 0]} color="#c7ccd0" metal={0.8} rough={0.3} seg={14} />
      {/* cabeça que oscila em torno da coluna */}
      <group ref={head} position={[0, d.hub, 0]}>
        <Cyl r={0.22} h={0.6} pos={[-0.35, -0.35, 0]} color={body} seg={14} />
        {/* motor */}
        <mesh position={[-0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow geometry={geo('vpeMotor', () => new THREE.CapsuleGeometry(0.55, 0.7, 6, 18))} material={mat(body, 0, 0.35)} />
        <Cyl r={0.2} h={0.25} pos={[-1.55, 0.45, 0]} color="#9ca3af" seg={12} />
        {/* hélice */}
        <group ref={rotor} position={[0.25, 0, 0]}>
          <Cyl r={0.32} h={0.4} pos={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} color={body} rough={0.35} seg={20} />
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[(i * 2 * Math.PI) / 3, 0, 0]}>
              <mesh position={[0, d.R * 0.52, 0]} rotation={[0, 0.5, 0]} scale={[0.05, d.R * 0.44, d.R * 0.3]} geometry={blade} material={bladeMat} />
            </group>
          ))}
        </group>
        <Guard R={d.R} x={0.25} />
        {/* emblema ao centro da grelha */}
        <Cyl r={0.3} h={0.06} pos={[0.65, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#3b82f6" metal={0.4} rough={0.3} seg={20} />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  const rpm = Math.abs(live?.rpm || 0)
  if (rpm < 10) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#93c5fd" fontFamily="monospace" pointerEvents="none">
      {rpm} rpm
    </text>
  )
}

export default { type: 'ventoinhaPe', Model, Overlay2D }
