// LED RGB de cátodo comum: corpo difuso que mistura as três cores.
import { Leg, Cyl, PITCH, Halo, liveOf, useFrame, useRef, THREE } from '../kit.jsx'

const mix = (l) => (l ? new THREE.Color(l.r || 0, l.g || 0, l.b || 0) : new THREE.Color(0, 0, 0))
// cor vista (canal maior = 1) e nível percetual: um LED com PWM baixo continua bem visível
const seen = (l) => {
  const c = mix(l)
  const m = Math.max(c.r, c.g, c.b)
  return m > 0.02 ? [c.multiplyScalar(1 / m), 0.35 + 0.65 * Math.sqrt(m)] : [c.setRGB(0, 0, 0), 0]
}

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
        <Leg key={i} from={[x, 0, 0]} to={[x * 0.5, i === 1 ? 0.5 : 0.45, 0]} />
      ))}
      <Cyl r={0.29} h={0.1} pos={[0, 0.5, 0]} color="#f2f2f2" opacity={0.9} />
      <Cyl r={0.25} h={0.45} pos={[0, 0.77, 0]} color="#f2f2f2" opacity={0.9} />
      <mesh position={[0, 0.99, 0]}>
        <sphereGeometry args={[0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={mat} color="#f5f5f5" emissive="#000" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.4, 0]} intensity={0} distance={6} />
      <Halo pos={[0, 0.9, 0]} size={2.2} read={() => seen(liveOf(part.id))[1]} readColor={() => seen(liveOf(part.id))[0]} />
    </group>
  )
}

function Overlay2D({ live }) {
  if (!live) return null
  const v = Math.max(live.r || 0, live.g || 0, live.b || 0)
  if (v < 0.02) return null
  const c = `rgb(${Math.round((255 * (live.r || 0)) / v)},${Math.round((255 * (live.g || 0)) / v)},${Math.round((255 * (live.b || 0)) / v)})`
  return <circle r={10 + v * 12} fill={c} opacity={Math.min(0.85, 0.25 + v * 0.6)} filter="url(#glow)" pointerEvents="none" />
}

export default { type: 'rgbled', Model, Overlay2D }
