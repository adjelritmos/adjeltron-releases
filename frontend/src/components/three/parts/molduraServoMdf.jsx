// Moldura de servo cortada a laser: placa de cantos boleados com o recorte do corpo do servo e
// os furos dos parafusos das orelhas.
import { THREE } from '../kit.jsx'
import { extrudeXZ, holeCircle, rrect, Mdf } from './_mdfKit.jsx'
import { molduraDims } from '@shared/parts/molduraServoMdf.js'

function shape(c) {
  const { s: sv, X, Z } = molduraDims(c)
  const s = rrect(new THREE.Shape(), -X / 2, -Z / 2, X / 2, Z / 2, 0.25)
  s.holes.push(rrect(new THREE.Path(), -sv.L / 2 - 0.02, -sv.W / 2 - 0.02, sv.L / 2 + 0.02, sv.W / 2 + 0.02, 0.05))
  for (const sx of [-1, 1]) holeCircle(s, sx * sv.screw, 0, 0.1)
  // furos de fixação nos cantos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (Z > sv.W + 1.0) holeCircle(s, sx * (X / 2 - 0.35), sz * (Z / 2 - 0.3), 0.13)
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { X, Z, T } = molduraDims(c)
  return <Mdf geometry={extrudeXZ(`moldura:${c.servo || 'sg90'}:${X}:${Z}`, T, () => shape(c))} pos={[0, 0, 0]} cfg={c} />
}

export default { type: 'molduraServoMdf', Model }
