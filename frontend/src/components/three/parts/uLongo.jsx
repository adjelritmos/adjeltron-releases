// Suporte em U longo: aba de cima no braço do servo (origem no eixo), aba de baixo do outro
// lado do servo e ponte na ponta (+x).
import { Box, Cyl } from '../kit.jsx'
import { Holes } from './_mechKit.jsx'
import { partColor } from './_matKit.jsx'
import { matOf } from '@shared/parts/_materials.js'
import { ulDims } from '@shared/parts/uLongo.js'

function Model({ part }) {
  const c = part.config || {}
  const { T, L, y0, Wp, yc } = ulDims(c)
  const m = matOf(c, 'alu')
  const P = { color: partColor(c, 'alu'), metal: m.metal, rough: m.rough }
  const r = Wp / 2
  const horn = [0, 1, 2, 3].map((k) => [Math.cos((k * Math.PI) / 2) * 0.55, 0, Math.sin((k * Math.PI) / 2) * 0.55])
  return (
    <group>
      {[T / 2, y0 + T / 2].map((y, i) => (
        <group key={i}>
          {/* aba: ponta redonda à volta do eixo + braço até à ponte */}
          <Cyl r={r} h={T} pos={[0, y, 0]} seg={32} {...P} />
          <Box size={[L, T, Wp]} pos={[L / 2, y, 0]} {...P} />
          <Holes pts={horn.map(([x, , z]) => [x, y, z])} r={0.12} h={T + 0.02} />
          <Holes pts={[[0, y, 0]]} r={i ? 0.45 : 0.3} h={T + 0.02} />
        </group>
      ))}
      {/* ponte */}
      <Box size={[T, T - y0, Wp]} pos={[L + T / 2, yc, 0]} {...P} />
      <Holes pts={[[L + T / 2, yc, -0.5], [L + T / 2, yc, 0.5], [L + T / 2, yc + 0.8, 0], [L + T / 2, yc - 0.8, 0]]} r={0.15} h={T + 0.02} axis="x" />
    </group>
  )
}

export default { type: 'uLongo', Model }
