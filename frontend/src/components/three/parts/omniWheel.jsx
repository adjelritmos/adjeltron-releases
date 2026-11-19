// Roda omnidirecional dupla (como as omni de 48/60 mm dos kits): dois discos de plástico
// injetado com raios e nervuras, cada um com uma fila de rolos de borracha em barril (as duas
// filas desfasadas meio passo), os rolos presos por pinos de aço; cubo de alumínio com furo e
// parafuso de aperto. O eixo dos rolos é tangente ao aro (deslizam de lado, segundo o eixo da
// roda).
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { plateGeo, addHole, aroundY } from './_mechKit.jsx'
import { omniDims } from '@shared/parts/omniWheel.js'

// rolo em barril (eixo y, centrado), com as pontas rebaixadas onde entra o suporte
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

// disco de plástico: aro com os encaixes dos rolos, janelas entre os raios e furo do cubo
function discShape(R, N, k) {
  const s = new THREE.Shape()
  s.absarc(0, 0, R, 0, Math.PI * 2, false)
  const nw = 5
  for (let i = 0; i < nw; i++) {
    const a0 = (i / nw) * Math.PI * 2 + 0.25 + k * 0.3
    const a1 = a0 + (Math.PI * 2) / nw - 0.5
    const h = new THREE.Path()
    h.absarc(0, 0, R * 0.72, a0, a1, false)
    h.absarc(0, 0, R * 0.36, a1, a0, true)
    s.holes.push(h)
  }
  addHole(s, 0, 0, 0.2)
  return s
}

function Model({ part }) {
  const { r, w } = omniDims(part.config || {})
  const rr = r * 0.17
  const N = 10
  const len = ((2 * Math.PI * (r - rr)) / N) * 0.85
  const rows = [w * 0.3, w * 0.7]
  const discR = r - rr * 1.2
  const plastic = mat('#eceff1', 0, 0.42)
  // rolos das duas filas numa só malha; pinos e suportes noutras
  const rollers = mergedGeo(`omniRol${r},${w}`, () => {
    const g = rollerGeo(len, rr)
    return rows.flatMap((y, k) =>
      Array.from({ length: N }, (_, i) => {
        const [p, q] = aroundY(-((i + k * 0.5) / N) * Math.PI * 2, [r - rr, y, 0], [Math.PI / 2, 0, 0])
        return [g, p, q]
      }),
    )
  })
  const brackets = mergedGeo(`omniBr${r},${w}`, () => {
    const b = geo('mkUnitBox', () => new THREE.BoxGeometry(1, 1, 1))
    return rows.flatMap((y, k) =>
      Array.from({ length: N }, (_, i) => {
        const a = -((i + k * 0.5 + 0.5) / N) * Math.PI * 2
        const [p, q] = aroundY(a, [r - rr * 1.25, y, 0])
        return [b, p, q, [rr * 1.3, 0.16, rr * 0.55]]
      }),
    )
  })
  const pins = mergedGeo(`omniPin${r},${w}`, () => {
    const c = geo('omniPinC', () => new THREE.CylinderGeometry(0.035, 0.035, 1, 8))
    return rows.flatMap((y, k) =>
      Array.from({ length: N }, (_, i) => {
        const [p, q] = aroundY(-((i + k * 0.5) / N) * Math.PI * 2, [r - rr, y, 0], [Math.PI / 2, 0, 0])
        return [c, p, q, [1, len + rr * 0.9, 1]]
      }),
    )
  })
  return (
    <group>
      {rows.map((y, k) => (
        <mesh key={k} geometry={plateGeo(`omniDisc${discR},${k}`, 0.18, () => discShape(discR, N, k), 0.02, 24)} position={[0, y - 0.09, 0]} material={plastic} castShadow receiveShadow />
      ))}
      <mesh geometry={brackets} material={plastic} castShadow />
      <mesh geometry={rollers} material={mat('#2e2e2e', 0, 0.85, { side: THREE.DoubleSide })} castShadow />
      <mesh geometry={pins} material={mat('#c9ced2', 0.9, 0.3)} />
      {/* cubo de alumínio (anel com o furo do veio) e parafuso de aperto */}
      <mesh position={[0, w / 2, 0]} geometry={geo(`omniHub${w}`, () => new THREE.LatheGeometry([[0.2, -w / 2], [0.6, -w / 2], [0.6, w / 2], [0.2, w / 2], [0.2, -w / 2]].map(([a, b]) => new THREE.Vector2(a, b)), 28))} material={mat('#b0bec5', 0.85, 0.3)} castShadow />
      <mesh position={[0.6, w * 0.85, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo('omniSet', () => new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12))} material={mat('#2a2c2f', 0.7, 0.4)} />
    </group>
  )
}

export default { type: 'omniWheel', Model }
