// Placa perfurada de alumínio de 3 mm (como as placas dos kits Makeblock/goBILDA): cantos
// boleados, grelha de furos M4 passantes a cada 8 mm com as arestas chanfradas e acabamento
// escovado.
import { plateGeo, rrectShape, addHole, brushedMat, ALU, gridPts } from './_mechKit.jsx'
import { HOLE } from '@shared/parts/_mech.js'
import { PLATE_T, PLATE_SIZES, plateDims } from '@shared/parts/mechPlate.js'

function Model({ part }) {
  const c = part.config || {}
  const [x, z] = plateDims(c)
  const [nz, nx] = PLATE_SIZES[c.size] || PLATE_SIZES['7x9']
  const g = plateGeo(
    `mechPlate${x},${z},${nx},${nz}`,
    PLATE_T,
    () => {
      const s = rrectShape(-x / 2, -z / 2, x / 2, z / 2, 0.35)
      for (const [px, , pz] of gridPts(nx, nz, HOLE, 0)) addHole(s, px, -pz, 0.21)
      return s
    },
    0.025,
    nx * nz > 100 ? 8 : 12,
  )
  return <mesh geometry={g} material={brushedMat(ALU, 0.85, 0.34)} castShadow receiveShadow />
}

export default { type: 'mechPlate', Model }
