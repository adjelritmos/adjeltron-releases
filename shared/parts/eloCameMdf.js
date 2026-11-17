// Elo de came / biela com rasgo (kits de mão robótica em acrílico ou MDF): barra larga com uma
// bossa redonda numa ponta, rasgo comprido ao meio (o pino de outra peça desliza nele) e furos.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { holeMounts } from './_laser.js'

export const cameDims = (c) => ({ L: c.length ?? 6, W: c.width ?? 1.6, T: c.thick ?? 0.3 })
const C = cameDims

export default {
  type: 'eloCameMdf',
  name: 'Elo de came com rasgo (MDF / acrílico)',
  short: 'Elo came',
  cat: 'robot',
  loose: true,
  description:
    'Biela larga cortada a laser com uma bossa redonda numa ponta, um rasgo comprido ao meio e furos nas pontas — as peças que transmitem o movimento dos servos aos dedos nos kits de mão robótica. Aparafuse a bossa ao braço do servo; o pino de outra peça corre no rasgo.',
  size: [8, 0.3, 2.4],
  pins: [],
  mech: true,
  config: { length: 6, width: 1.6, thick: 0.3, material: 'acrilicoPapel' },
  fields: [
    { key: 'length', label: 'Distância entre furos', type: 'range', min: 3, max: 15, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura', type: 'range', min: 1, max: 3, step: 0.1, unit: 'cm' },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.2, max: 0.6, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, C(c).L * C(c).W * 0.85 * C(c).T, 'mdf'),
  friction: frictionOf('mdf'),
  collider: (c) => ({ size: [C(c).L + C(c).W * 1.5, C(c).T, C(c).W * 1.5], pos: [C(c).L / 2, C(c).T / 2, 0] }),
  mounts: holeMounts([{ id: 'end', label: 'furo da ponta', at: (c) => [C(c).L, 0] }], (c) => C(c).T, (c) => [C(c).L / 2, 0]),
}
