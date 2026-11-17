// Roda impressa em 3D tipo disco (como a dos robôs de duas rodas grandes): disco maciço com
// uma coroa de furos redondos, aro um pouco mais grosso e cubo branco. Eixo +y; face de
// dentro em y = 0, a roda cresce para +y (largura W).
import { geo, mat, THREE } from '../kit.jsx'

function discGeo(R, T, holes) {
  return geo(`disc${R},${T},${holes}`, () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, R, 0, Math.PI * 2, false)
    const rr = R * 0.58 // raio da coroa de furos
    const hr = holes ? Math.min(R * 0.17, (Math.PI * rr) / holes / 1.6) : 0
    for (let i = 0; i < holes; i++) {
      const a = (i / holes) * Math.PI * 2
      const h = new THREE.Path()
      h.absarc(Math.cos(a) * rr, Math.sin(a) * rr, hr, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const hub = new THREE.Path()
    hub.absarc(0, 0, 0.25, 0, Math.PI * 2, true)
    s.holes.push(hub)
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 40 })
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}
function rimGeo(R, W) {
  return geo(`discRim${R},${W}`, () => {
    const g = new THREE.CylinderGeometry(R, R, W, 64, 1, true)
    g.translate(0, W / 2, 0)
    return g
  })
}

// pneu de borracha (anel com piso) por fora do aro: o diâmetro total continua a ser 2R
function tireGeo(R, W, t) {
  return geo(`discTire${R},${W},${t}`, () => {
    const pts = []
    const ri = R - t
    const N = 16
    pts.push(new THREE.Vector2(ri, 0.04))
    for (let i = 0; i <= N; i++) {
      const k = i / N
      const y = 0.04 + k * (W - 0.08)
      pts.push(new THREE.Vector2(R - 0.05 + Math.sin(k * Math.PI) * 0.05, y))
    }
    pts.push(new THREE.Vector2(ri, W - 0.04))
    const g = new THREE.LatheGeometry(pts, 64)
    g.computeVertexNormals()
    return g
  })
}

export function DiscWheel({ R, W, color = '#e53935', holes = 8, tire = true }) {
  const T = Math.min(0.5, W * 0.4) // espessura do disco
  const t = tire ? Math.min(0.45, R * 0.12) : 0 // espessura do pneu
  const Rr = R - t // raio do aro (plástico)
  const m = mat(color, 0, 0.5)
  return (
    <group>
      {/* aro (banda à volta) e disco furado no meio da largura */}
      <mesh geometry={rimGeo(Rr, W)} material={mat(color, 0, 0.5, { side: THREE.DoubleSide })} castShadow receiveShadow />
      <mesh geometry={discGeo(Rr - 0.05, T, holes)} material={m} position={[0, (W - T) / 2, 0]} castShadow receiveShadow />
      {tire && (
        <group>
          <mesh geometry={tireGeo(R, W, t)} material={mat('#1b1b1b', 0, 0.92, { side: THREE.DoubleSide })} castShadow receiveShadow />
          {/* tacos do piso */}
          {Array.from({ length: Math.round(R * 6) }, (_, i) => {
            const a = (i / Math.round(R * 6)) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * (R - 0.02), W / 2, Math.sin(a) * (R - 0.02)]} rotation={[0, -a, 0]}>
                <boxGeometry args={[0.1, W * 0.75, 0.22]} />
                <meshStandardMaterial color="#121212" roughness={0.95} />
              </mesh>
            )
          })}
        </group>
      )}
      {/* cubo branco com parafusos */}
      <mesh position={[0, W / 2, 0]} castShadow>
        <cylinderGeometry args={[0.75, 0.75, W + 0.2, 28]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.45} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.45, W + 0.12, Math.sin(a) * 0.45]}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 10]} />
            <meshStandardMaterial color="#9e9e9e" metalness={0.6} roughness={0.35} />
          </mesh>
        )
      })}
    </group>
  )
}
