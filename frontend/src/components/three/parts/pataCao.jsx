// Pata do cão robô: duas faces de acrílico transparente que apertam a ponta da canela (com 2
// parafusos) e uma ponteira de borracha preta redonda.
import { geo, mat, THREE, Cyl } from '../kit.jsx'
import { PATA } from '@shared/parts/pataCao.js'
import { plateGeo, Screw } from './_caoKit.jsx'

const ACR = () => mat('#d8f0ff', 0.0, 0.06, { transparent: true, opacity: 0.42, depthWrite: false })
const RUB = () => mat('#151515', 0, 0.92)

// perfil (z, y) da face de acrílico: gota com a ponta redonda em baixo
function clipShape() {
  const s = new THREE.Shape()
  s.moveTo(-0.85, PATA.top)
  s.lineTo(0.85, PATA.top)
  s.quadraticCurveTo(1.15, 2.2, 0.75, 1.55)
  s.absarc(0, 1.55, 0.75, 0, -Math.PI, true)
  s.quadraticCurveTo(-1.15, 2.2, -0.85, PATA.top)
  for (const y of [PATA.attach + 0.1, PATA.attach - 0.7 + 0.1]) {
    const h = new THREE.Path()
    h.absarc(0, y + 0.3, 0.1, 0, Math.PI * 2, true)
    s.holes.push(h)
  }
  return s
}

function Model() {
  const g = plateGeo('pataClip', clipShape, 0.3, 0.06, 16)
  return (
    <group>
      {/* borracha */}
      <mesh position={[0, PATA.r, 0]} geometry={geo(`pataBall${PATA.r}`, () => new THREE.SphereGeometry(PATA.r, 32, 20))} material={RUB()} castShadow receiveShadow />
      <Cyl r={0.95} r2={0.8} h={0.5} pos={[0, PATA.r + 0.75, 0]} color="#1b1b1b" rough={0.9} seg={28} />
      {/* faces de acrílico dos dois lados da canela (a canela está em x ≈ 0) */}
      {[1, -1].map((sx) => (
        <mesh key={sx} geometry={g} material={ACR()} position={[sx > 0 ? 0.435 : -0.135, 0, 0]} rotation={[0, -Math.PI / 2, 0]} renderOrder={2} />
      ))}
      {/* parafusos que atravessam a canela */}
      {[PATA.attach + 0.4, PATA.attach - 0.3].map((y) => (
        <group key={y}>
          <Screw pos={[0.435, y, 0]} rot={[0, 0, -Math.PI / 2]} r={0.15} />
          <Screw pos={[-0.435, y, 0]} rot={[0, 0, Math.PI / 2]} r={0.15} />
        </group>
      ))}
    </group>
  )
}

export default { type: 'pataCao', Model }
