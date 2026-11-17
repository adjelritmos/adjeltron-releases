// Condensador cerâmico de disco: disco cor de laranja-acastanhado com o código (104…) virado
// para a frente (+x), pernas para baixo.
import { Leg, useLabel, PITCH } from '../kit.jsx'
import { cerCode } from '@shared/parts/ceramicCap.js'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

function Model({ part }) {
  const code = cerCode(part.config?.pF ?? 100000)
  const big = (part.config?.pF ?? 100000) >= 1000000
  const label = useLabel([{ text: code, font: 'bold 110px Arial', y: 128 }], 256, 256)
  const r = big ? 0.3 : 0.25
  const yc = 0.3 + r
  return (
    <group>
      {[PITCH, -PITCH].map((z) => (
        <Leg key={z} from={[0, 0, z]} to={[0, yc - r * 0.6, z * 0.6]} r={0.02} />
      ))}
      <mesh position={[0, yc, 0]} rotation={[0, 0, Math.PI / 2]} castShadow scale={[1, 1, 1]}>
        <cylinderGeometry args={[r, r, 0.12, 32]} />
        <meshStandardMaterial color={big ? '#1e5aa8' : '#c46a1e'} roughness={0.55} />
      </mesh>
      <mesh position={[0.062, yc, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[r * 1.5, r * 1.5]} />
        <meshBasicMaterial map={label} transparent color="#1a1a1a" />
      </mesh>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burst) return <Boom info={info} />
  return Math.abs(live.v) > 0.01 ? <Badge info={info} text={`${fmt(live.v, 2)} V`} /> : null
}

export default { type: 'ceramicCap', Model, Overlay2D }
