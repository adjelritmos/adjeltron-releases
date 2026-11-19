// Suporte multifunções de servo (chapa de alumínio de 2,5 mm dobrada, dos kits de bípedes e
// braços): base com 6 furos, duas paredes com 2 furos cada e, no topo das paredes, as abas
// dobradas para dentro onde assentam (e se aparafusam) as abas do servo. Arestas chanfradas.
import { plateGeo, addHole, rrectShape } from './_mechKit.jsx'
import { partMat } from './_matKit.jsx'
import { supDims } from '@shared/parts/suporteServo.js'

function Model({ part }) {
  const c = part.config || {}
  const { T, X, Z, Hw } = supDims(c)
  const M = partMat(c, 'alu')
  const base = plateGeo(`supBase${X},${Z},${T}`, T, () => {
    const s = rrectShape(-X, -Z, X, Z, 0.04)
    for (const i of [-1, 0, 1]) for (const z of [-Z + 0.45, Z - 0.45]) addHole(s, i * 0.8, -z, 0.16)
    // rasgo central (passagem do cabo e do parafuso do eixo do outro lado)
    addHole(s, 0, 0, 0.3)
    return s
  }, 0.02)
  // parede: chapa de pé (espessura segundo x); forma x ∈ [−Hw, 0] → altura 0..Hw
  const wall = plateGeo(`supWall${Hw},${Z},${T}`, T, () => {
    const s = rrectShape(-Hw, -Z, 0, Z, 0.02)
    for (const z of [-0.5, 0.5]) addHole(s, -Hw * 0.4, z, 0.16)
    return s
  }, 0.02)
  // aba dobrada (0,5 de largura) com os 2 furos dos parafusos do servo
  const tab = plateGeo(`supTab${Z},${T}`, T, () => {
    const s = rrectShape(-0.25, -Z, 0.25, Z, 0.08)
    for (const z of [-0.5, 0.5]) addHole(s, 0, z, 0.1)
    return s
  }, 0.02)
  return (
    <group>
      <mesh geometry={base} material={M} castShadow receiveShadow />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh geometry={wall} position={[sx * (X - T / 2) - T / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={M} castShadow receiveShadow />
          <mesh geometry={tab} position={[sx * (X - T - 0.25), Hw - T, 0]} material={M} castShadow receiveShadow />
        </group>
      ))}
    </group>
  )
}

export default { type: 'suporteServo', Model }
