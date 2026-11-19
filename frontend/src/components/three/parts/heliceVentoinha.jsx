// Hélice de ventoinha (plástico ABS/PP injetado): cubo cilíndrico com chanfro, cúpula à frente,
// casquilho do veio por trás com nervuras de reforço, e n pás em forma de folha, torcidas (mais
// inclinadas junto ao cubo) e com a raiz alargada. Roda com o veio do motor onde está presa (o
// grupo do ponto de fixação já roda); eixo +y.
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { fanDims } from '@shared/parts/heliceVentoinha.js'

// pá: folha larga na ponta, estreita junto ao cubo (forma plana no plano XZ, ao longo de +x)
function bladeGeo(r, hub) {
  return geo(`fanBlade2${r},${hub}`, () => {
    const L = r - hub * 0.6
    const w = Math.min(r * 0.62, (2 * Math.PI * r) / 5)
    const s = new THREE.Shape()
    s.moveTo(0, -w * 0.2)
    s.bezierCurveTo(L * 0.45, -w * 0.55, L * 0.95, -w * 0.5, L, 0)
    s.bezierCurveTo(L * 0.95, w * 0.5, L * 0.45, w * 0.45, 0, w * 0.2)
    s.lineTo(0, -w * 0.2)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.015, bevelSegments: 1, curveSegments: 16 })
    g.translate(0, 0, -0.03)
    g.rotateX(-Math.PI / 2) // forma no plano XZ
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const z = p.getZ(i)
      // torção ao longo da pá (+10° na raiz, −8° na ponta) e um ligeiro arco (côncava)
      const a = ((10 - 18 * Math.min(1, Math.max(0, x / L))) * Math.PI) / 180
      const yy = y + (z * z) / (w * 3)
      p.setY(i, yy * Math.cos(a) - z * Math.sin(a))
      p.setZ(i, yy * Math.sin(a) + z * Math.cos(a))
    }
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const { n, r, pitch, hub } = fanDims(c)
  const color = c.color || '#29b6f6'
  const m = mat(color, 0, 0.45, { side: THREE.DoubleSide })
  const body = mat(color, 0, 0.4)
  // cubo: cilindro com chanfro em cima, cúpula, casquilho do veio e nervuras (uma só malha)
  const hubG = mergedGeo(`fanHub${hub}`, () => {
    const out = [
      [new THREE.CylinderGeometry(hub * 0.85, hub, 1.1, 28), [0, 0.55, 0]],
      [new THREE.CylinderGeometry(hub * 0.8, hub * 0.85, 0.1, 28), [0, 1.15, 0]],
      [new THREE.SphereGeometry(hub * 0.8, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), [0, 1.2, 0]],
      [new THREE.CylinderGeometry(hub * 0.42, hub * 0.48, 0.12, 20), [0, 0.06, 0]],
    ]
    const rib = new THREE.BoxGeometry(hub * 0.5, 0.5, 0.05)
    for (let i = 0; i < 4; i++) out.push([rib, [0, 0.3, 0], [0, (i * Math.PI) / 2 + Math.PI / 4, 0]])
    return out
  })
  return (
    <group>
      <mesh geometry={hubG} material={body} castShadow />
      {/* furo do veio com o plano (D) visto por trás */}
      <mesh position={[0, -0.001, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo('fanBore', () => new THREE.CircleGeometry(0.12, 16, 0.3, Math.PI * 2 - 0.6))} material={mat('#0b0b0b', 0, 0.9)} />
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
