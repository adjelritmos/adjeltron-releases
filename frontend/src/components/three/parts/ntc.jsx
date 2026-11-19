// Termístor NTC MF52 (10 kΩ): gota de epóxi preto brilhante (Ø ~2,8 mm) em forma de lágrima,
// com o colo a envolver as pernas de cobre esmaltado.
import { THREE, geo, mat, PITCH } from '../kit.jsx'
import { Wires } from './_dip.jsx'

// lágrima: perfil de revolução (colo em baixo, cabeça arredondada em cima)
const beadGeo = () =>
  geo('ntcBead', () => {
    const p = [[0.001, 0], [0.05, 0.005], [0.075, 0.04], [0.12, 0.1], [0.145, 0.16], [0.148, 0.2], [0.135, 0.25], [0.1, 0.29], [0.05, 0.31], [0.001, 0.315]]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 24)
    g.scale(1, 1, 0.82)
    g.computeVertexNormals()
    return g
  })

function Model() {
  return (
    <group>
      <Wires id="ntcLegs" r={0.02} color="#b8692f" metal={0.75} rough={0.32} lines={[-0.5, 0.5].map((k) => [[k * PITCH, 0, 0], [k * PITCH, 0.25, 0], [k * 0.05, 0.48, 0], [k * 0.05, 0.56, 0]])} />
      <mesh position={[0, 0.44, 0]} geometry={beadGeo()} material={mat('#121212', 0, 0.18)} castShadow />
    </group>
  )
}

export default { type: 'ntc', Model }
