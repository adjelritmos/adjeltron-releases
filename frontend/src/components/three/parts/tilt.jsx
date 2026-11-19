// SW-520D: cápsula cilíndrica de Ø 6 × 12 mm (manga verde, base vedada a epóxi preto por onde
// saem as duas pernas estanhadas, anel cravado e tampa metálica abaulada); inclina-se quando o
// controlo "Inclinado" está ativo.
import { Leg, inputOf, useFrame, useRef, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import def from '@shared/parts/tilt.js'

const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))
// manga verde (ligeiramente cónica) e as peças metálicas (anel de baixo + tampa abaulada)
const sleeveGeo = () => geo('tilt:sleeve', () => new THREE.LatheGeometry(v2([[0.27, 0.1], [0.29, 0.12], [0.29, 1.04], [0.275, 1.06]]), 28))
const metalGeo = () =>
  mergedGeo('tilt:metal', () => [
    [new THREE.LatheGeometry(v2([[0.26, 0], [0.3, 0.01], [0.3, 0.12], [0.27, 0.13]]), 28), [0, 0, 0]],
    [new THREE.LatheGeometry(v2([[0.27, 1.04], [0.3, 1.05], [0.3, 1.12], [0.26, 1.16], [0.16, 1.18], [0, 1.185]]), 28), [0, 0, 0]],
  ])

function Model({ part }) {
  const body = useRef()
  useFrame(() => {
    if (body.current) body.current.rotation.x = inputOf(part.id).on ? 0.9 : 0
  })
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[0, 0.3, p.pos[2] * 0.8]} r={0.025} color={METAL.tin} />
      ))}
      <group ref={body} position={[0, 0.3, 0]}>
        {/* base vedada (epóxi preto) */}
        <mesh position={[0, 0.005, 0]} geometry={geo('tilt:seal', () => new THREE.CylinderGeometry(0.255, 0.255, 0.012, 24))} material={mat('#111111', 0, 0.35)} />
        <mesh geometry={sleeveGeo()} material={mat('#2e7d32', 0, 0.38)} castShadow />
        <mesh geometry={metalGeo()} material={mat('#c9ccd0', 1, 0.28)} castShadow />
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
