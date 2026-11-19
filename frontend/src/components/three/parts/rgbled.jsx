// LED RGB de cátodo comum: corpo difuso que mistura as três cores.
import { Leg, PITCH, Halo, liveOf, useFrame, useRef, THREE, geo, mergedGeo, mat as kitMat } from '../kit.jsx'

const mix = (l) => (l ? new THREE.Color(l.r || 0, l.g || 0, l.b || 0) : new THREE.Color(0, 0, 0))
// cor vista (canal maior = 1) e nível percetual: um LED com PWM baixo continua bem visível
const seen = (l) => {
  const c = mix(l)
  const m = Math.max(c.r, c.g, c.b)
  return m > 0.02 ? [c.multiplyScalar(1 / m), 0.35 + 0.65 * Math.sqrt(m)] : [c.setRGB(0, 0, 0), 0]
}

// LED de 5 mm em resina difusa: rebordo Ø 5,8 mm com o lado plano (cátodo), cilindro Ø 5 mm e
// cúpula, numa só peça torneada; lá dentro a armação (taça do chip e postes) e as 4 pernas, com o
// cátodo comum (K) mais comprido
const lens = () =>
  geo('led5Lens', () => {
    const pts = [[0.0001, 0], [0.29, 0], [0.29, 0.1], [0.25, 0.1], [0.25, 0.55]]
    for (let k = 1; k <= 8; k++) {
      const a = (k / 8) * (Math.PI / 2)
      pts.push([Math.max(0.0001, 0.25 * Math.cos(a)), 0.55 + 0.25 * Math.sin(a)])
    }
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 32)
    // lado plano do rebordo, do lado do cátodo (−x)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) if (p.getY(i) <= 0.1 + 1e-6 && p.getX(i) < -0.25) p.setX(i, -0.25)
    g.computeVertexNormals()
    return g
  })
// armação vista através da resina: postes das 4 pernas e a taça refletora do chip
const frame = () =>
  mergedGeo('led5Frame', () => [
    ...[-1.5, -0.5, 0.5, 1.5].map((k) => [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [k * 0.1, 0.25, 0], [0, 0, 0], [0.05, 0.3, 0.03]]),
    [geo('led5Cup', () => new THREE.CylinderGeometry(0.07, 0.045, 0.06, 12)), [-0.05, 0.42, 0]],
  ])

function Model({ part }) {
  const mat = useRef()
  const light = useRef()
  useFrame(() => {
    const [c, v] = seen(liveOf(part.id))
    if (mat.current) {
      mat.current.emissive.copy(c)
      mat.current.emissiveIntensity = v ? 0.8 + 2 * v : 0
    }
    if (light.current) {
      light.current.color.copy(c)
      light.current.intensity = v * 5
    }
  })
  const xs = [-1.5, -0.5, 0.5, 1.5].map((k) => k * PITCH)
  return (
    <group>
      {xs.map((x, i) => (
        <Leg key={i} from={[x, 0, 0]} to={[(i - 1.5) * 0.1, 0.5, 0]} />
      ))}
      <group position={[0, 0.5, 0]}>
        <mesh geometry={frame()} material={mat2('#b9bec4')} />
        <mesh geometry={lens()}>
          <meshStandardMaterial ref={mat} color="#f5f5f5" emissive="#000" transparent opacity={0.9} roughness={0.38} toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 1.4, 0]} intensity={0} distance={6} />
      <Halo pos={[0, 0.9, 0]} size={2.2} read={() => seen(liveOf(part.id))[1]} readColor={() => seen(liveOf(part.id))[0]} />
    </group>
  )
}
const mat2 = (c) => kitMat(c, 1, 0.35)

function Overlay2D({ live }) {
  if (!live) return null
  const v = Math.max(live.r || 0, live.g || 0, live.b || 0)
  if (v < 0.02) return null
  const c = `rgb(${Math.round((255 * (live.r || 0)) / v)},${Math.round((255 * (live.g || 0)) / v)},${Math.round((255 * (live.b || 0)) / v)})`
  return <circle r={10 + v * 12} fill={c} opacity={Math.min(0.85, 0.25 + v * 0.6)} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'rgbled', Model, Overlay2D }
