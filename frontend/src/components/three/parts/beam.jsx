// Barra perfurada de alumínio 12 × 3 mm (como as barras dos kits Makeblock/goBILDA): chapa
// recortada com cantos boleados, furos M4 passantes a cada 8 mm com a aresta chanfrada e
// acabamento escovado. Origem no 1.º furo, ao longo de +x.
import { plateGeo, rrectShape, addHole, brushedMat, ALU } from './_mechKit.jsx'
import { HOLE, beamLen } from '@shared/parts/_mech.js'
import { BEAM } from '@shared/parts/beam.js'

function beamShape(n) {
  const L = beamLen(n)
  const s = rrectShape(-BEAM.W / 2, -BEAM.W / 2, L + BEAM.W / 2, BEAM.W / 2, 0.3)
  for (let i = 0; i < n; i++) addHole(s, i * HOLE, 0, 0.21)
  return s
}

function Model({ part }) {
  const n = part.config?.holes ?? 7
  return <mesh geometry={plateGeo(`beam${n}`, BEAM.T, () => beamShape(n), 0.03)} material={brushedMat(ALU, 0.85, 0.34)} castShadow receiveShadow />
}

export default { type: 'beam', Model }
