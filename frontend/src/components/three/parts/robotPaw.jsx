// Pata do cão robô: ponteira de borracha moldada numa só peça (bola de 22 mm com a linha do
// molde, pescoço com anéis de vedação e gola que abraça o casquilho) e casquilho de alumínio
// torneado com o chanfro do topo e o perno de aperto M3 sem cabeça.
import { Cyl, geo, mat, THREE } from '../kit.jsx'
import { PAW } from '@shared/parts/robotPaw.js'
import { aluMat } from './_caoKit.jsx'

const R = PAW.r
// perfil de revolução (raio, altura) da borracha: meia bola por baixo, pescoço e gola
function rubberGeo() {
  return geo(`pawRubber${R}`, () => {
    const pts = []
    // bola de baixo até 45° acima do equador (a borracha estreita para o pescoço)
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI / 2 + (i / 14) * (Math.PI * 0.75)
      pts.push([Math.cos(a) * R, R + Math.sin(a) * R])
    }
    const y0 = pts[pts.length - 1][1]
    pts.push([0.58, y0 + 0.1], [0.58, y0 + 0.14], [0.62, y0 + 0.18], [0.62, y0 + 0.26], [0.58, y0 + 0.3], [0.58, y0 + 0.38], [0.5, y0 + 0.42], [0.46, y0 + 0.42])
    return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), 28)
  })
}

function RobotPawModel() {
  const sleeveH = PAW.top - 2.1
  return (
    <group>
      <mesh geometry={rubberGeo()} material={mat('#1c1c1c', 0, 0.9)} castShadow receiveShadow />
      {/* linha de junção do molde à volta da bola */}
      <mesh position={[0, R, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo(`pawSeam${R}`, () => new THREE.TorusGeometry(R, 0.012, 4, 40))} material={mat('#2a2a2a', 0, 0.8)} />
      {/* casquilho de alumínio (entra na gola) com chanfro em cima */}
      <mesh position={[0, 2.1 + sleeveH / 2, 0]} geometry={geo(`pawSleeve${sleeveH}`, () => new THREE.CylinderGeometry(0.45, 0.45, sleeveH, 24))} material={aluMat()} castShadow />
      <Cyl r={0.45} r2={0.4} h={0.05} pos={[0, PAW.top + 0.025, 0]} color="#c9cfd3" metal={0.9} rough={0.3} seg={24} />
      <Cyl r={0.22} h={0.051} pos={[0, PAW.top + 0.026, 0]} color="#101214" rough={0.9} seg={16} />
      {/* perno de aperto (sextavado interior) */}
      <Cyl r={0.1} h={0.02} pos={[0.445, 2.65, 0]} rot={[0, 0, Math.PI / 2]} color="#2b2f33" metal={0.7} rough={0.4} seg={10} />
      <Cyl r={0.045} h={0.022} pos={[0.448, 2.65, 0]} rot={[0, 0, Math.PI / 2]} color="#050505" seg={6} />
    </group>
  )
}

export default { type: 'robotPaw', Model: RobotPawModel }
