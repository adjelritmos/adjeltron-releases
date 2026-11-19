// Cantoneira em L de alumínio (chapa de 2,5 mm dobrada): aba horizontal ao longo de +x e aba
// vertical em x = −0,6, com furos M4 passantes a cada 8 mm, cantos boleados nas pontas e
// nervura de reforço estampada no canto interior (como as cantoneiras dos kits).
import { geo, THREE } from '../kit.jsx'
import { plateGeo, addHole, brushedMat, ALU } from './_mechKit.jsx'
import { HOLE, beamLen } from '@shared/parts/_mech.js'
import { ANGLE } from '@shared/parts/angleBracket.js'

// aba horizontal: de x = −0,6 + T (depois da dobra) até L + 0,6, furos em 0,4 + i·HOLE
function flatShape(n) {
  const L = beamLen(n)
  const T = ANGLE.T
  const W = ANGLE.W
  const s = new THREE.Shape()
  const x0 = -0.6 + T
  const x1 = L + 0.6
  const r = 0.3
  s.moveTo(x0, -W / 2)
  s.lineTo(x1 - r, -W / 2)
  s.absarc(x1 - r, -W / 2 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x1, W / 2 - r)
  s.absarc(x1 - r, W / 2 - r, r, 0, Math.PI / 2, false)
  s.lineTo(x0, W / 2)
  s.lineTo(x0, -W / 2)
  for (let i = 0; i < n; i++) addHole(s, 0.4 + i * HOLE, 0, 0.21)
  return s
}
// aba vertical (desenhada no plano XZ e depois rodada): de y = 0 (canto exterior da dobra,
// vivo) até L + 0,6 (cantos boleados)
function upShape(n) {
  const L = beamLen(n)
  const W = ANGLE.W
  const r = 0.3
  const y1 = L + 0.6
  const s = new THREE.Shape()
  s.moveTo(0, -W / 2)
  s.lineTo(y1 - r, -W / 2)
  s.absarc(y1 - r, -W / 2 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(y1, W / 2 - r)
  s.absarc(y1 - r, W / 2 - r, r, 0, Math.PI / 2, false)
  s.lineTo(0, W / 2)
  s.lineTo(0, -W / 2)
  for (let i = 0; i < n - 1; i++) addHole(s, L + 0.15 - i * HOLE, 0, 0.21)
  return s
}
// nervura triangular estampada no canto interior (reforço)
function ribGeo() {
  return geo('abRib', () => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(0.45, 0)
    s.quadraticCurveTo(0.1, 0.1, 0, 0.45)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 })
    g.translate(0, 0, -0.11)
    return g
  })
}

function Model({ part }) {
  const n = part.config?.holes ?? 3
  const T = ANGLE.T
  const m = brushedMat(ALU, 0.85, 0.34)
  return (
    <group>
      <mesh geometry={plateGeo(`abFlat${n}`, T, () => flatShape(n), 0.025)} material={m} castShadow receiveShadow />
      {/* aba vertical: forma (x → y) rodada à volta de z, face exterior em x = −0,6 */}
      <mesh geometry={plateGeo(`abUp${n}`, T, () => upShape(n), 0.025)} position={[-0.6 + T, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m} castShadow receiveShadow />
      {/* nervuras de reforço junto às arestas, sem tapar os furos */}
      <mesh geometry={ribGeo()} position={[-0.6 + T, T, 0]} material={m} castShadow />
    </group>
  )
}

export default { type: 'angleBracket', Model }
