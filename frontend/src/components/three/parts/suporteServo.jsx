// Suporte multifunções de servo: base furada, duas paredes onde assentam as abas do servo.
import { Box } from '../kit.jsx'
import { Holes } from './_mechKit.jsx'
import { partColor } from './_matKit.jsx'
import { matOf } from '@shared/parts/_materials.js'
import { supDims } from '@shared/parts/suporteServo.js'

function Model({ part }) {
  const c = part.config || {}
  const { T, X, Z, Hw } = supDims(c)
  const m = matOf(c, 'alu')
  const col = partColor(c, 'alu')
  const P = { color: col, metal: m.metal, rough: m.rough }
  const baseHoles = [-1, 0, 1].flatMap((i) => [[i * 0.8, T / 2, -Z + 0.45], [i * 0.8, T / 2, Z - 0.45]])
  const wallHoles = [-1, 1].flatMap((sx) => [[sx * (X - T / 2), Hw * 0.4, -0.5], [sx * (X - T / 2), Hw * 0.4, 0.5]])
  return (
    <group>
      <Box size={[2 * X, T, 2 * Z]} pos={[0, T / 2, 0]} {...P} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box size={[T, Hw, 2 * Z]} pos={[sx * (X - T / 2), Hw / 2, 0]} {...P} />
          {/* aba dobrada onde assenta a aba do servo */}
          <Box size={[0.5, T, 2 * Z]} pos={[sx * (X - T - 0.25), Hw - T / 2, 0]} {...P} />
        </group>
      ))}
      <Holes pts={baseHoles} r={0.16} h={T + 0.02} />
      <Holes pts={wallHoles} r={0.16} h={T + 0.02} axis="x" />
    </group>
  )
}

export default { type: 'suporteServo', Model }
