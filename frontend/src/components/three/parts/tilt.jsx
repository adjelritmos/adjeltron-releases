// SW-520D: cápsula cilíndrica com duas pernas; inclina-se quando o controlo "Inclinado" está ativo.
import { Cyl, Leg, inputOf, useFrame, useRef } from '../kit.jsx'
import def from '@shared/parts/tilt.js'

function Model({ part }) {
  const body = useRef()
  useFrame(() => {
    if (body.current) body.current.rotation.x = inputOf(part.id).on ? 0.9 : 0
  })
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, 0.3, p.pos[2] * 0.6]} />
      ))}
      <group ref={body} position={[0, 0.3, 0]}>
        <Cyl r={0.29} h={1.15} pos={[0, 0.6, 0]} color="#2e7d32" rough={0.4} />
        <Cyl r={0.3} h={0.08} pos={[0, 0.04, 0]} color="#c9ccd0" metal={0.8} rough={0.3} />
        <Cyl r={0.3} h={0.08} pos={[0, 1.18, 0]} color="#c9ccd0" metal={0.8} rough={0.3} />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  const [x, y] = info.project([0, 0.3, 0])
  return (
    <text x={x} y={y + 14} textAnchor="middle" fontSize={9} fill={live.closed ? '#81c784' : '#9ca3af'} fontFamily="monospace" pointerEvents="none">
      {live.closed ? 'fechado' : 'aberto'}
    </text>
  )
}

export default { type: 'tilt', Model, Overlay2D }
