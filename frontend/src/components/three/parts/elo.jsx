// Elo de pontas redondas (acrílico, PLA, alumínio…): origem no 1.º furo, ao longo de +x.
import { partMat, stadiumGeo } from './_matKit.jsx'
import { eloDims } from '@shared/parts/elo.js'

function Model({ part }) {
  const c = part.config || {}
  const { L, W, T } = eloDims(c)
  const holes = c.mid ? [0, L / 2, L] : [0, L]
  return <mesh geometry={stadiumGeo(L, W, T, holes, Math.min(0.2, W * 0.2))} material={partMat(c, 'acrilico')} castShadow receiveShadow />
}

export default { type: 'elo', Model }
