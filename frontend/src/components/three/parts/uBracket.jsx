// Suporte em U de alumínio (chapa de 2,5 mm dobrada, como os dos kits Makeblock/goBILDA): base
// furada (ao longo de z) e duas abas verticais com os cantos de cima boleados, furos M4
// passantes a cada 8 mm e acabamento escovado.
import { plateGeo, wallGeo, addHole, rrectShape, brushedMat, ALU } from './_mechKit.jsx'
import { HOLE, beamLen } from '@shared/parts/_mech.js'
import { UB } from '@shared/parts/uBracket.js'

function Model({ part }) {
  const n = part.config?.holes ?? 4
  const B = beamLen(n) + 1.2
  const H = part.config?.height ?? 2.4
  const T = UB.T
  const zs = Array.from({ length: n }, (_, i) => -beamLen(n) / 2 + i * HOLE)
  const ny = Math.max(1, Math.floor((H - 0.4) / HOLE))
  const ys = Array.from({ length: ny }, (_, i) => H - 0.6 - i * HOLE).filter((y) => y > T + 0.3)
  const m = brushedMat(ALU, 0.85, 0.34)
  const base = plateGeo(`ub${n}`, T, () => {
    const s = rrectShape(-UB.W / 2, -(B / 2 + T), UB.W / 2, B / 2 + T, 0.02)
    for (const z of zs) addHole(s, 0, -z, 0.21)
    return s
  }, 0.02)
  // as abas assentam na base (de y = T até H)
  const wall = wallGeo(`ub${n},${ys.join(':')}`, UB.W, H - T, T, ys.map((y) => [0, y - T]))
  return (
    <group>
      <mesh geometry={base} material={m} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={wall} position={[0, T, s * (B / 2 + T / 2)]} material={m} castShadow receiveShadow />
      ))}
    </group>
  )
}

export default { type: 'uBracket', Model }
