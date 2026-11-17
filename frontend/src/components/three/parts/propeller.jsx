// Hélice de 2 pás com torção (cubo na origem, eixo +y) e disco translúcido a alta rotação.
import { Cyl, useFrame, useRef, liveOf } from '../kit.jsx'
import { propR } from '@shared/parts/propeller.js'

function Model({ part }) {
  const c = part.config || {}
  const R = propR(c)
  const dir = c.spin === 'CCW' ? -1 : 1
  const blur = useRef()
  useFrame(() => {
    if (blur.current) blur.current.opacity = Math.min(0.35, Math.abs(liveOf(part.id)?.rpm || 0) / 6000)
  })
  const seg = 8
  const color = c.spin === 'CCW' ? '#212121' : '#e65100'
  return (
    <group>
      <Cyl r={0.6} h={0.8} pos={[0, 0.4, 0]} color={color} rough={0.5} seg={20} />
      <Cyl r={0.25} h={0.82} pos={[0, 0.4, 0]} color="#111" seg={12} />
      {[0, 1].map((b) => (
        <group key={b} rotation={[0, b * Math.PI, 0]}>
          {Array.from({ length: seg }, (_, i) => {
            const t = (i + 0.5) / seg
            const x = 0.5 + t * (R - 0.5)
            const chord = (0.9 + 1.2 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5)) * (1 - 0.65 * t * t) * Math.max(0.6, R / 6.35)
            const twist = dir * (0.55 - 0.4 * t)
            return (
              <mesh key={i} position={[x, 0.45, 0]} rotation={[twist, 0, 0]} castShadow>
                <boxGeometry args={[(R - 0.5) / seg + 0.02, 0.08, chord]} />
                <meshStandardMaterial color={color} roughness={0.45} />
              </mesh>
            )
          })}
        </group>
      ))}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[R, R, 0.02, 48]} />
        <meshStandardMaterial ref={blur} color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default { type: 'propeller', Model }
