// Roda omnidirecional: dois discos com 2 filas de rolos desfasadas; o eixo dos rolos é
// tangente ao aro (deslizam de lado, segundo o eixo da roda).
import { Cyl, geo, mat, THREE } from '../kit.jsx'
import { omniDims } from '@shared/parts/omniWheel.js'

export function rollerGeo(len, rr) {
  return geo(`roller${len},${rr}`, () => {
    const pts = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      pts.push(new THREE.Vector2(rr * (0.62 + 0.38 * Math.sin(t * Math.PI)), (t - 0.5) * len))
    }
    const g = new THREE.LatheGeometry(pts, 14)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const { r, w } = omniDims(part.config || {})
  const rr = r * 0.17
  const N = 10
  const len = (2 * Math.PI * (r - rr)) / N * 0.85
  const rows = [w * 0.3, w * 0.7]
  const rg = rollerGeo(len, rr)
  const rm = mat('#3a3a3a', 0, 0.85, { side: THREE.DoubleSide })
  return (
    <group>
      {rows.map((y, k) => (
        <group key={k}>
          <Cyl r={r - rr * 1.2} h={0.18} pos={[0, y, 0]} color="#eceff1" metal={0.2} rough={0.45} seg={30} />
          {Array.from({ length: N }, (_, i) => {
            const a = ((i + k * 0.5) / N) * Math.PI * 2
            return (
              <group key={i} rotation={[0, -a, 0]}>
                <mesh position={[r - rr, y, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={rg} material={rm} castShadow />
                <mesh position={[r - rr * 1.7, y, 0]}>
                  <boxGeometry args={[rr * 1.2, 0.12, len * 1.05]} />
                  <meshStandardMaterial color="#eceff1" roughness={0.45} />
                </mesh>
              </group>
            )
          })}
        </group>
      ))}
      <Cyl r={0.6} h={w} pos={[0, w / 2, 0]} color="#b0bec5" metal={0.85} rough={0.3} seg={20} />
      <Cyl r={0.2} h={w + 0.02} pos={[0, w / 2, 0]} color="#111" seg={12} />
    </group>
  )
}

export default { type: 'omniWheel', Model }
