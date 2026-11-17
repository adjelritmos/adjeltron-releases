// Sofá: base estofada, almofadas de assento e de costas (uma por lugar), braços boleados e pés
// de madeira (costas em −x).
import { RBox, Cyl } from '../kit.jsx'
import { sofaDims } from '@shared/parts/sofa.js'

function Model({ part }) {
  const c = part.config || {}
  const { l } = sofaDims(c)
  const f = c.tecido || '#5c6f7f'
  const arm = 1.4
  const inner = l - 2 * arm
  const n = Math.max(1, Math.round(inner / 5))
  const cw = inner / n
  return (
    <group>
      {[[3.2, l / 2 - 0.6], [3.2, -l / 2 + 0.6], [-3.2, l / 2 - 0.6], [-3.2, -l / 2 + 0.6]].map(([x, z], i) => (
        <Cyl key={i} r={0.22} r2={0.16} h={0.7} pos={[x, 0.35, z]} color="#5a3b22" rough={0.5} seg={10} />
      ))}
      <RBox size={[7.5, 1.6, l]} r={0.3} pos={[0, 1.5, 0]} color={f} rough={0.9} />
      <RBox size={[1.8, 4.6, l]} r={0.45} pos={[-2.85, 4.3, 0]} color={f} rough={0.9} />
      {[-1, 1].map((s) => (
        <RBox key={s} size={[7.5, 2.6, arm]} r={0.5} pos={[0, 3.3, s * (l / 2 - arm / 2)]} color={f} rough={0.9} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <RBox size={[5.4, 1.2, cw - 0.12]} r={0.4} pos={[0.8, 2.85, -inner / 2 + (i + 0.5) * cw]} color={f} rough={0.92} />
          <RBox size={[1.4, 3.2, cw - 0.15]} r={0.5} pos={[-1.6, 4.6, -inner / 2 + (i + 0.5) * cw]} rot={[0, 0, 0.12]} color={f} rough={0.92} />
        </group>
      ))}
      {/* almofadas soltas nos cantos */}
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.9, 2.2, 2.2]} r={0.4} pos={[-0.7, 4.3, s * (inner / 2 - 1.3)]} rot={[s * 0.3, 0, 0.25]} color={c.almofadas || '#d9c8a9'} rough={0.95} />
      ))}
    </group>
  )
}

export default { type: 'sofa', Model }
