// Veio de aço retificado de 4 mm ao longo de +y (pontas chanfradas) com um anel de fixação
// de alumínio (colar com parafuso sem cabeça M3 de sextavado interior).
import { geo, mat, THREE } from '../kit.jsx'
import { AXLE_R } from '@shared/parts/axle.js'

// veio: perfil girado com chanfro de 0,3 mm nas duas pontas
function shaftGeo(L) {
  return geo(`axle${L}`, () => {
    const r = AXLE_R
    const c = 0.03
    const p = [[0, 0], [r - c, 0], [r, c], [r, L - c], [r - c, L], [0, L]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 18)
  })
}
// colar: anel com chanfros e furo do veio
function collarGeo() {
  return geo('axleCollar', () => {
    const R = 0.45
    const h = 0.35
    const c = 0.04
    const r = AXLE_R + 0.002
    const p = [[r, 0], [R - c, 0], [R, c], [R, h - c], [R - c, h], [r, h], [r, 0]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 28)
  })
}

function Model({ part }) {
  const L = part.config?.length ?? 5
  return (
    <group>
      <mesh geometry={shaftGeo(L)} material={mat('#e3e6e8', 0.95, 0.16)} castShadow />
      <mesh geometry={collarGeo()} position={[0, 0.005, 0]} material={mat('#aab4ba', 0.85, 0.3)} castShadow receiveShadow />
      {/* parafuso sem cabeça (o topo fica rente ao colar, com o sextavado interior) */}
      <mesh position={[0.452, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('axleSet', () => new THREE.CylinderGeometry(0.1, 0.1, 0.01, 14))} material={mat('#2a2c2f', 0.7, 0.4)} />
      <mesh position={[0.458, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('axleSetHex', () => new THREE.CylinderGeometry(0.05, 0.05, 0.004, 6))} material={mat('#050505', 0, 0.9)} />
    </group>
  )
}

export default { type: 'axle', Model }
