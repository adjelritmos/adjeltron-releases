// Cadeira: 4 pernas, assento estofado e costas com travessas (costas em −x).
import { RBox, Box } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'

function Model({ part }) {
  const c = part.config || {}
  const col = matColor(c, 'madeira')
  const est = c.estofo || '#b23a3a'
  const s = 1.6
  return (
    <group>
      {[[s, s], [s, -s], [-s, s], [-s, -s]].map(([x, z], i) => (
        <Box key={i} size={[0.25, 3.5, 0.25]} pos={[x, 1.75, z]} color={col} rough={0.55} />
      ))}
      <Box size={[3.6, 0.3, 3.6]} pos={[0, 3.6, 0]} color={col} rough={0.55} />
      <RBox size={[3.4, 0.35, 3.4]} r={0.14} pos={[0.05, 3.92, 0]} color={est} rough={0.85} />
      {[-s, s].map((z) => (
        <Box key={z} size={[0.25, 3.8, 0.25]} pos={[-s, 5.6, z]} color={col} rough={0.55} />
      ))}
      <RBox size={[0.25, 1.1, 3.6]} r={0.08} pos={[-s, 6.9, 0]} color={col} rough={0.5} />
      <Box size={[0.18, 0.35, 3.2]} pos={[-s, 5.4, 0]} color={col} rough={0.55} />
      <Box size={[0.18, 3.2, 0.2]} pos={[0.0, 1.0, 0]} rot={[0, 0, Math.PI / 2]} color={col} rough={0.55} />
    </group>
  )
}

export default { type: 'cadeira', Model }
