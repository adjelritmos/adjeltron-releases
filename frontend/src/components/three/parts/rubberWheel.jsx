// Roda com pneu de borracha: aro de plástico com raios e pneu com piso (eixo +y).
import { Cyl, geo, mat, THREE } from '../kit.jsx'
import { wheelDims } from '@shared/parts/rubberWheel.js'
import { DiscWheel } from './_discWheel.jsx'
import { extrudeXZ } from './_mdfKit.jsx'

function tyreGeo(r, w) {
  return geo(`tyre${r},${w}`, () => {
    // perfil (r, y) do pneu girado à volta de y, com sulcos
    const pts = []
    const ri = r * 0.72
    const N = 24
    pts.push(new THREE.Vector2(ri, 0.05))
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const y = 0.05 + t * (w - 0.1)
      const bulge = Math.sin(t * Math.PI) * 0.06
      const groove = i % 6 === 3 ? -0.08 : 0
      pts.push(new THREE.Vector2(r - 0.08 + bulge + groove, y))
    }
    pts.push(new THREE.Vector2(ri, w - 0.05))
    const g = new THREE.LatheGeometry(pts, 48)
    g.computeVertexNormals()
    return g
  })
}

// jante de brinquedo: disco com 8 janelas curvas (os raios rodam em espiral) e cubo saliente
function toyRimShape(R) {
  const s = new THREE.Shape()
  s.absarc(0, 0, R, 0, Math.PI * 2, false)
  const n = 8
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const h = new THREE.Path()
    const P = (rr, aa) => [Math.cos(aa) * rr, Math.sin(aa) * rr]
    const twist = 0.35
    const w0 = 0.2
    const w1 = 0.42
    const r0 = R * 0.34
    const r1 = R * 0.86
    h.moveTo(...P(r0, a - w0 / 2))
    h.quadraticCurveTo(...P((r0 + r1) / 2, a + twist - w1 / 2), ...P(r1, a + twist * 1.4 - w1 / 2))
    h.absarc(0, 0, r1, a + twist * 1.4 - w1 / 2, a + twist * 1.4 + w1 / 2, false)
    h.quadraticCurveTo(...P((r0 + r1) / 2, a + twist + w1 / 2), ...P(r0, a + w0 / 2))
    h.absarc(0, 0, r0, a + w0 / 2, a - w0 / 2, true)
    s.holes.push(h)
  }
  return s
}

function ToyWheel({ r, w, rim }) {
  const R = r * 0.7
  return (
    <group>
      <mesh geometry={tyreGeo(r, w)} material={mat('#1c1c1c', 0, 0.92, { side: THREE.DoubleSide })} castShadow receiveShadow />
      {/* piso: blocos em V (como os pneus de brinquedo) */}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2
        return [-1, 1].map((sd) => (
          <mesh key={`${i}${sd}`} position={[Math.cos(a) * (r - 0.03), w / 2 + sd * w * 0.2, Math.sin(a) * (r - 0.03)]} rotation={[sd * 0.5, -a, 0]}>
            <boxGeometry args={[0.1, w * 0.32, 0.2]} />
            <meshStandardMaterial color="#141414" roughness={0.95} />
          </mesh>
        ))
      })}
      {/* aro interior e jante de raios curvos na face de fora */}
      {/* aro (casca) e fundo escuro recuado: vê-se através das janelas da jante */}
      <mesh geometry={geo(`toyRimShell${R},${w}`, () => new THREE.CylinderGeometry(R, R, w * 0.9, 40, 1, true))} position={[0, w / 2, 0]} material={mat(rim, 0, 0.45, { side: THREE.DoubleSide })} />
      <Cyl r={R} h={0.05} pos={[0, w * 0.25, 0]} color="#151515" rough={0.6} seg={40} />
      <mesh geometry={extrudeXZ(`toyRim${R}`, 0.22, () => toyRimShape(R))} position={[0, w * 0.93 - 0.22, 0]} material={mat(rim, 0, 0.45)} castShadow receiveShadow />
      <Cyl r={R * 0.3} h={w * 0.98} pos={[0, w * 0.49, 0]} color={rim} rough={0.45} seg={24} />
      <Cyl r={0.2} h={w + 0.02} pos={[0, w / 2, 0]} color="#0d0d0d" seg={12} />
    </group>
  )
}

function Model({ part }) {
  const { r, w } = wheelDims(part.config || {})
  if (part.config?.style === 'brinquedo') return <ToyWheel r={r} w={w} rim={part.config?.color && part.config.color !== '#263238' ? part.config.color : '#ff8a1d'} />
  const rim = part.config?.color || '#263238'
  const spokes = 6
  if (part.config?.style === 'disco') return <DiscWheel R={r} W={w} color={part.config?.color && part.config.color !== '#263238' ? part.config.color : '#e53935'} />
  return (
    <group>
      <mesh geometry={tyreGeo(r, w)} material={mat('#1c1c1c', 0, 0.92, { side: THREE.DoubleSide })} castShadow receiveShadow />
      {/* tacos do piso */}
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * (r - 0.03), w / 2, Math.sin(a) * (r - 0.03)]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.1, w * 0.7, 0.25]} />
            <meshStandardMaterial color="#141414" roughness={0.95} />
          </mesh>
        )
      })}
      {/* aro */}
      <Cyl r={r * 0.72} h={w * 0.55} pos={[0, w / 2, 0]} color={rim} rough={0.5} seg={36} />
      <Cyl r={r * 0.62} h={w * 0.58} pos={[0, w / 2, 0]} color="#111" rough={0.6} seg={36} />
      {Array.from({ length: spokes }, (_, i) => (
        <group key={`s${i}`} position={[0, w * 0.75, 0]} rotation={[0, (i / spokes) * Math.PI * 2, 0]}>
          <mesh position={[r * 0.36, 0, 0]}>
            <boxGeometry args={[r * 0.6, w * 0.25, 0.25]} />
            <meshStandardMaterial color={rim} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Cyl r={0.55} h={w} pos={[0, w / 2, 0]} color={rim} rough={0.5} seg={20} />
      <Cyl r={0.2} h={w + 0.02} pos={[0, w / 2, 0]} color="#0d0d0d" seg={12} />
    </group>
  )
}

export default { type: 'rubberWheel', Model }
