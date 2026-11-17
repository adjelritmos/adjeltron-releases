// Cama: estrado de madeira, colchão, edredão dobrado aos pés, almofadas e cabeceira estofada (−x).
import { RBox, Box } from '../kit.jsx'
import { camaDims } from '@shared/parts/cama.js'

function Model({ part }) {
  const c = part.config || {}
  const { l, w, h, n } = camaDims(c)
  const wood = c.estrutura || '#6d4c35'
  const duvet = c.edredao || '#e8edf2'
  const pw = (w - 1.0) / n
  return (
    <group>
      {[[l / 2 - 0.4, w / 2 - 0.4], [l / 2 - 0.4, -w / 2 + 0.4], [-l / 2 + 0.4, w / 2 - 0.4], [-l / 2 + 0.4, -w / 2 + 0.4]].map(([x, z], i) => (
        <Box key={i} size={[0.5, 1.0, 0.5]} pos={[x, 0.5, z]} color={wood} rough={0.5} />
      ))}
      <RBox size={[l, 1.2, w]} r={0.15} pos={[0, 1.6, 0]} color={wood} rough={0.5} />
      <RBox size={[l - 0.4, 1.6, w - 0.4]} r={0.35} pos={[0, 2.95, 0]} color="#f5f3ee" rough={0.9} />
      {/* edredão: cobre 2/3 da cama e dobra no fundo */}
      <RBox size={[l * 0.68, 0.35, w + 0.1]} r={0.15} pos={[l * 0.16, 3.82, 0]} color={duvet} rough={0.95} />
      <RBox size={[0.35, 1.9, w + 0.1]} r={0.15} pos={[l / 2 + 0.02, 2.95, 0]} color={duvet} rough={0.95} />
      <RBox size={[2.2, 0.5, w + 0.12]} r={0.2} pos={[l * 0.16 - l * 0.34 + 1.1, 4.05, 0]} color={duvet} rough={0.95} />
      {Array.from({ length: n }, (_, i) => (
        <RBox key={i} size={[2.4, 0.9, pw - 0.3]} r={0.4} pos={[-l / 2 + 1.8, 4.1, -w / 2 + 0.5 + (i + 0.5) * pw]} rot={[0, 0, 0.25]} color="#ffffff" rough={0.95} />
      ))}
      <RBox size={[0.6, 7.5, w + 0.4]} r={0.25} pos={[-l / 2 - 0.3, 3.75, 0]} color={c.cabeceira || '#8d8f93'} rough={0.95} />
    </group>
  )
}

export default { type: 'cama', Model }
