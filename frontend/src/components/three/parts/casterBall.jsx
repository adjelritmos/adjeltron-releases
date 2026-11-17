// Roda livre de esfera: flange de fixação (na origem), corpo e esfera de aço a crescer para +y.
import { Cyl, Box } from '../kit.jsx'
import { casterDims } from '@shared/parts/casterBall.js'

function Model({ part }) {
  const { h, r, base } = casterDims(part.config || {})
  const by = h - r
  return (
    <group>
      <Box size={[base, 0.15, base * 0.55]} pos={[0, 0.075, 0]} color="#37474f" metal={0.6} rough={0.4} />
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.15} h={0.17} pos={[s * (base / 2 - 0.35), 0.08, 0]} color="#111" seg={10} />
      ))}
      <Cyl r={r * 1.18} r2={r * 1.05} h={by} pos={[0, by / 2 + 0.05, 0]} color="#37474f" metal={0.6} rough={0.4} seg={24} />
      <mesh position={[0, by, 0]} castShadow>
        <sphereGeometry args={[r, 24, 16]} />
        <meshStandardMaterial color="#e6e8ea" metalness={0.55} roughness={0.15} />
      </mesh>
    </group>
  )
}

export default { type: 'casterBall', Model }
