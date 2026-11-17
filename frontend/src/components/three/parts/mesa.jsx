// Mesa: tampo com rebordo boleado, saia e 4 pernas ligeiramente afuniladas.
import { RBox, Box, Cyl } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { mesaDims } from '@shared/parts/mesa.js'

function Model({ part }) {
  const c = part.config || {}
  const { l, w, h, t } = mesaDims(c)
  const col = matColor(c, 'madeira')
  const lh = h - t
  const ix = l / 2 - 0.45
  const iz = w / 2 - 0.45
  return (
    <group>
      <RBox size={[l, t, w]} r={0.1} pos={[0, h - t / 2, 0]} color={col} rough={0.45} />
      <Box size={[l - 0.8, 0.6, 0.12]} pos={[0, h - t - 0.3, iz]} color={col} rough={0.6} />
      <Box size={[l - 0.8, 0.6, 0.12]} pos={[0, h - t - 0.3, -iz]} color={col} rough={0.6} />
      <Box size={[0.12, 0.6, w - 0.8]} pos={[ix, h - t - 0.3, 0]} color={col} rough={0.6} />
      <Box size={[0.12, 0.6, w - 0.8]} pos={[-ix, h - t - 0.3, 0]} color={col} rough={0.6} />
      {[[ix, iz], [ix, -iz], [-ix, iz], [-ix, -iz]].map(([x, z], i) => (
        <Cyl key={i} r={0.2} r2={0.14} h={lh} pos={[x, lh / 2, z]} color={col} rough={0.55} seg={12} />
      ))}
    </group>
  )
}

export default { type: 'mesa', Model }
