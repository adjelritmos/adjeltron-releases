// Roda impressa 3D (disco com furos): ver ./_discWheel.jsx
import { DiscWheel } from './_discWheel.jsx'
import { rodaDims } from '@shared/parts/rodaImpressa.js'
import { matColor } from '@shared/parts/_materials.js'

function Model({ part }) {
  const c = part.config || {}
  const { r, w, holes, tire } = rodaDims(c)
  return <DiscWheel R={r} W={w} holes={holes} tire={tire} color={matColor(c, 'pla')} />
}

export default { type: 'rodaImpressa', Model }
