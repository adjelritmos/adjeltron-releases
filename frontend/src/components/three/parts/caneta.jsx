// Caneta (marcador de feltro): tampa de trás na origem, corpo ao longo de +y e ponta em
// y = comprimento. Corpo de revolução em polipropileno branco (ligeiramente abaulado), tampa de
// trás com estrias na cor da tinta, faixa da etiqueta com a cor, zona de agarrar com anéis,
// cone cinzento à frente e a ponta de feltro da cor da tinta.
import { Cyl, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { penLen } from '@shared/parts/caneta.js'

const V = (r, y) => new THREE.Vector2(r, y)

// perfil do corpo (de y = 0,9, fim da tampa, até ao início do cone)
function bodyGeo(body) {
  return geo(`penBody${body}`, () => {
    const pts = [V(0.4, 0), V(0.42, 0.04)]
    const n = 10
    for (let i = 1; i < n; i++) {
      const t = i / n
      pts.push(V(0.42 + 0.012 * Math.sin(t * Math.PI), t * body))
    }
    pts.push(V(0.42, body - 0.04), V(0.4, body))
    return new THREE.LatheGeometry(pts, 28)
  })
}
// tampa de trás (perfil de revolução com os chanfros)
const capGeo = () =>
  geo('penCap', () => new THREE.LatheGeometry([V(0, 0), V(0.42, 0), V(0.47, 0.06), V(0.48, 0.8), V(0.45, 0.88), V(0.42, 0.9)], 28))
// estrias da tampa (nervuras longitudinais, uma malha)
const ribGeo = () =>
  mergedGeo('penRibs', () => {
    const b = geo('penRib', () => new THREE.BoxGeometry(0.05, 0.6, 0.06).translate(0.475, 0, 0))
    return Array.from({ length: 12 }, (_, k) => [b, [0, 0.45, 0], [0, (k / 12) * Math.PI * 2, 0]])
  })
// cone da frente (0,55 de altura): do corpo até à ponteira
const coneGeo = () => geo('penCone', () => new THREE.LatheGeometry([V(0.4, 0), V(0.41, 0.05), V(0.36, 0.2), V(0.2, 0.45), V(0.13, 0.55), V(0, 0.55)], 24))

function Model({ part }) {
  const c = part.config || {}
  const L = penLen(c)
  const ink = c.color || '#1565c0'
  const body = Math.max(0.5, L - 1.6)
  return (
    <group>
      {/* tampa de trás na cor da tinta */}
      <mesh geometry={capGeo()} material={mat(ink, 0, 0.4)} castShadow />
      <mesh geometry={ribGeo()} material={mat(ink, 0, 0.45)} />
      {/* corpo branco, faixa da etiqueta e anéis da zona de agarrar */}
      <mesh geometry={bodyGeo(body)} material={mat('#f1f2f0', 0, 0.35)} position={[0, 0.9, 0]} castShadow />
      {body > 2.5 && <Cyl r={0.437} h={Math.min(2.2, body * 0.3)} pos={[0, 0.9 + body * 0.38, 0]} color={ink} rough={0.35} seg={28} />}
      {body > 3 &&
        [0, 1, 2, 3].map((i) => <Cyl key={i} r={0.44} h={0.06} pos={[0, 0.9 + body - 0.5 - i * 0.18, 0]} color="#c8ccd0" rough={0.5} seg={24} />)}
      {/* cone da frente e a ponta de feltro */}
      <mesh geometry={coneGeo()} material={mat('#b8bec3', 0, 0.4)} position={[0, L - 0.7, 0]} castShadow />
      <Cyl r={0.1} r2={0.05} h={0.16} pos={[0, L - 0.08, 0]} color={ink} rough={0.85} seg={12} />
    </group>
  )
}

export default { type: 'caneta', Model }
