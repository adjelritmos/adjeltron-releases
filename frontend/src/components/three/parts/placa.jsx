// Placa/chapa de cantos arredondados, com furação opcional de 8 mm (origem no centro de baixo).
import { partMat } from './_matKit.jsx'
import { roundRectGeo } from './_matKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const L = c.l ?? 12
  const W = c.w ?? 10
  const T = c.t ?? 0.3
  const holes = []
  if (c.holes) {
    const nx = Math.floor((L - 0.8) / 0.8)
    const nz = Math.floor((W - 0.8) / 0.8)
    for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) holes.push([(i - nx / 2) * 0.8, (k - nz / 2) * 0.8])
  }
  return <mesh geometry={roundRectGeo(L, W, T, 0.5, holes, 0.2)} material={partMat(c, 'acrilico')} castShadow receiveShadow />
}

export default { type: 'placa', Model }
