// Hélice de ventoinha: cubo com n pás em forma de folha, inclinadas (pitch). Roda com o veio
// do motor onde está presa (o grupo do ponto de fixação já roda); eixo +y.
import { geo, mat, THREE } from '../kit.jsx'
import { fanDims } from '@shared/parts/heliceVentoinha.js'

// pá: folha larga na ponta, estreita junto ao cubo (forma plana no plano XZ, ao longo de +x)
function bladeGeo(r, hub) {
  return geo(`fanBlade${r},${hub}`, () => {
    const L = r - hub * 0.6
    const w = Math.min(r * 0.62, (2 * Math.PI * r) / 5)
    const s = new THREE.Shape()
    s.moveTo(0, -w * 0.18)
    s.bezierCurveTo(L * 0.45, -w * 0.55, L * 0.95, -w * 0.5, L, 0)
    s.bezierCurveTo(L * 0.95, w * 0.5, L * 0.45, w * 0.45, 0, w * 0.18)
    s.lineTo(0, -w * 0.18)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 16 })
    g.translate(0, 0, -0.04)
    g.rotateX(-Math.PI / 2) // forma no plano XZ
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const { n, r, pitch, hub } = fanDims(c)
  const color = c.color || '#29b6f6'
  const m = mat(color, 0, 0.45, { side: THREE.DoubleSide })
  return (
    <group>
      {/* cubo */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[hub * 0.85, hub, 1.2, 28]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[hub * 0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {/* pás: cada uma rodada à volta do eixo e inclinada (pitch) à volta do seu comprimento */}
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[0, (i / n) * Math.PI * 2, 0]}>
          <group position={[hub * 0.6, 0.6, 0]} rotation={[(pitch * Math.PI) / 180, 0, 0]}>
            <mesh geometry={bladeGeo(r, hub)} material={m} castShadow />
          </group>
        </group>
      ))}
    </group>
  )
}

export default { type: 'heliceVentoinha', Model }
