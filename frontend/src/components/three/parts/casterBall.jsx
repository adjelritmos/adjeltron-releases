// Roda livre de esfera (tipo CY-15A/CY-25A): flange oval de aço estampado com 2 furos (na
// origem), copo cilíndrico com a borda revirada que prende a esfera e esfera de aço cromado a
// crescer para +y.
import { geo, mat, THREE } from '../kit.jsx'
import { plateGeo, addHole, brushedMat } from './_mechKit.jsx'
import { casterDims } from '@shared/parts/casterBall.js'

const STEEL = '#c3c9ce'

// flange oval (estádio) de largura base × base·0,55, furos nas pontas
function flangeShape(base) {
  const w = base * 0.55
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-base / 2 + r, -r)
  s.lineTo(base / 2 - r, -r)
  s.absarc(base / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(-base / 2 + r, r)
  s.absarc(-base / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  for (const sx of [-1, 1]) addHole(s, sx * (base / 2 - r), 0, Math.min(0.17, r * 0.4))
  return s
}
// copo: perfil girado (parede, ombro e lábio revirado à volta da esfera)
function cupGeo(r, by) {
  return geo(`casterCup${r},${by}`, () => {
    const R = r * 1.08
    const p = [
      [0, 0.15],
      [R, 0.15],
      [R, by - r * 0.15],
      [R * 0.98, by + r * 0.05],
      [r * 0.9, by + r * 0.42],
      [r * 0.84, by + r * 0.4],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 32)
  })
}

function Model({ part }) {
  const { h, r, base } = casterDims(part.config || {})
  const by = h - r
  return (
    <group>
      <mesh geometry={plateGeo(`caster${base}`, 0.15, () => flangeShape(base), 0.02)} material={brushedMat(STEEL, 0.8, 0.36)} castShadow receiveShadow />
      <mesh geometry={cupGeo(r, by)} material={mat(STEEL, 0.85, 0.3, { side: THREE.DoubleSide })} castShadow receiveShadow />
      {/* esfera de aço cromado (espelhada) */}
      <mesh position={[0, by, 0]} castShadow geometry={geo('casterBallSph', () => new THREE.SphereGeometry(1, 28, 18))} scale={[r, r, r]} material={mat('#eef1f3', 1, 0.08)} />
    </group>
  )
}

export default { type: 'casterBall', Model }
