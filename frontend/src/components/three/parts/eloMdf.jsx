// Elo em MDF com ranhura: barra de pontas redondas, furo em cada ponta, ranhura ou fila de furos
// ao meio; origem no 1.º furo (face de baixo), ao longo de +x.
import { THREE } from '../kit.jsx'
import { Mdf, Screw, extrudeXZ, holeCircle, holeSlot } from './_mdfKit.jsx'
import { eloMdfDims } from '@shared/parts/eloMdf.js'

export function eloMdfGeo(c) {
  const { L, W, T, slot, holes } = eloMdfDims(c)
  const key = `elo${L},${W},${c.furo ?? 'ranhura'}`
  return extrudeXZ(key, T, () => {
    const r = W / 2
    const s = new THREE.Shape()
    s.moveTo(0, -r)
    s.lineTo(L, -r)
    s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(0, r)
    s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
    const hr = Math.min(0.17, r * 0.6)
    holeCircle(s, 0, 0, hr)
    holeCircle(s, L, 0, hr)
    if (slot) holeSlot(s, slot.x0, slot.x1, 0, slot.w)
    for (const x of holes) holeCircle(s, x, 0, Math.min(0.15, r * 0.45))
    return s
  })
}

function Model({ part }) {
  const c = part.config || {}
  const { L, T } = eloMdfDims(c)
  return (
    <group>
      <Mdf geometry={eloMdfGeo(c)} cfg={c} />
      {/* parafuso de latão no furo da ponta (articulação com a peça seguinte) */}
      <Screw pos={[L, T, 0]} len={T + 0.3} />
    </group>
  )
}

export default { type: 'eloMdf', Model }
