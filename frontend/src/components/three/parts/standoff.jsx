// Espaçador hexagonal de latão M3 (5 mm entre faces, pontas chanfradas, rosca interior) com
// parafuso M3 de cabeça cilíndrica Phillips niquelado no topo.
import { geo, mat, THREE } from '../kit.jsx'
import { BRASS } from './_mechKit.jsx'

// prisma de 6 faces com o chanfro de 30° nas duas pontas e o furo roscado
function hexGeo(h) {
  return geo(`standoffHex${h}`, () => {
    const R = 0.317
    const c = 0.035
    const p = [[0.13, 0], [R * 0.86, 0], [R, c], [R, h - c], [R * 0.86, h], [0.13, h], [0.13, 0]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 6)
  })
}
// cabeça do parafuso: cilindro com o topo boleado
function headGeo() {
  return geo('standoffHead', () => {
    const p = [[0, 0], [0.27, 0], [0.28, 0.02], [0.28, 0.13], [0.24, 0.18], [0, 0.19]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 20)
  })
}

function Model({ part }) {
  const h = part.config?.height ?? 1
  return (
    <group>
      <mesh geometry={hexGeo(h)} material={mat(BRASS, 0.85, 0.3)} castShadow receiveShadow />
      <mesh position={[0, h, 0]} geometry={headGeo()} material={mat('#c9ced3', 0.9, 0.28)} castShadow />
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} position={[0, h + 0.175, 0]} rotation={[0, a, 0]} geometry={geo('standoffX', () => new THREE.BoxGeometry(0.26, 0.04, 0.05))} material={mat('#3a3d40', 0.5, 0.5)} />
      ))}
    </group>
  )
}

export default { type: 'standoff', Model }
