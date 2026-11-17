// Bloco com material à escolha (origem no centro da face de baixo).
import { RBox } from '../kit.jsx'
import { partColor } from './_matKit.jsx'
import { matOf } from '@shared/parts/_materials.js'

function Model({ part }) {
  const c = part.config || {}
  const s = [c.x ?? 6, c.y ?? 2, c.z ?? 6]
  const m = matOf(c, 'madeira')
  const r = Math.min(0.12, ...s.map((v) => v / 4))
  return <RBox size={s} r={r} pos={[0, s[1] / 2, 0]} color={partColor(c, 'madeira')} metal={m.metal} rough={m.rough} />
}

export default { type: 'bloco', Model }
