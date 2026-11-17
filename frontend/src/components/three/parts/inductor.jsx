// Bobina radial de núcleo de ferrite ("drum core"): discos de ferrite cinzento-escuro com o
// enrolamento de cobre à vista; o valor impresso no topo.
import { Cyl, Leg, useLabel, PITCH } from '../kit.jsx'
import { indSpec } from '@shared/parts/inductor.js'
import { Badge, fmt } from './group-c-ui.jsx'

function Model({ part }) {
  const spec = indSpec(part.config?.uH ?? 1000)
  const label = useLabel([{ text: spec[3].replace(' ', ''), font: 'bold 76px Arial', y: 128 }], 256, 256)
  const y0 = 0.12
  const r = spec[0] >= 10000 ? 0.45 : 0.4
  return (
    <group>
      {[-PITCH, PITCH].map((x) => (
        <Leg key={x} from={[x, 0, 0]} to={[x, y0 + 0.03, 0]} r={0.025} />
      ))}
      <Cyl r={r} h={0.1} pos={[0, y0 + 0.05, 0]} color="#3b3b3d" rough={0.85} seg={32} />
      <Cyl r={r * 0.85} h={0.62} pos={[0, y0 + 0.41, 0]} color="#b06a2c" metal={0.6} rough={0.35} seg={32} />
      {[0.18, 0.3, 0.42, 0.54, 0.66].map((y) => (
        <Cyl key={y} r={r * 0.86} h={0.02} pos={[0, y0 + y, 0]} color="#8a4d1c" metal={0.5} rough={0.4} seg={32} />
      ))}
      <Cyl r={r} h={0.1} pos={[0, y0 + 0.77, 0]} color="#3b3b3d" rough={0.85} seg={32} />
      <mesh position={[0, y0 + 0.821, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[r * 1.5, r * 1.5]} />
        <meshBasicMaterial map={label} transparent color="#e8e8e8" />
      </mesh>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live || Math.abs(live.i) < 0.0005) return null
  return <Badge info={info} text={`${fmt(live.i * 1000, 0)} mA`} color={live.sat ? '#f59e0b' : '#f5f5f5'} />
}

export default { type: 'inductor', Model, Overlay2D }
