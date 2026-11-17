// Elo curvo em S/arco (kits de mão e braço robótico em MDF ou acrílico): barra de pontas
// redondas que se curva entre os dois furos, com um furo opcional a meio.
import { materialFields, massOf, frictionOf } from './_materials.js'
import { holeMounts } from './_laser.js'

export const eloCurvoDims = (c) => ({ L: c.length ?? 5, W: c.width ?? 1.2, T: c.thick ?? 0.3, bow: c.curva ?? 0.8, mid: c.meio !== false })
const D = eloCurvoDims
// ponto da linha média (bézier quadrática) em t ∈ [0, 1]: (x, z)
export const curvoAt = (c, t) => {
  const { L, bow } = D(c)
  return [L * t, -2 * bow * t * (1 - t) * 2]
}

export default {
  type: 'eloCurvoMdf',
  name: 'Elo curvo (MDF / acrílico)',
  short: 'Elo curvo',
  cat: 'robot',
  loose: true,
  description:
    'Elo curvo cortado a laser, como os dedos e falanges dos kits de mão robótica e as bielas dos braços em MDF ou acrílico: pontas redondas com um furo em cada ponta e, opcionalmente, um furo a meio da curva. Aparafuse o 1.º furo ao braço de um servo ou a outra peça; na ponta prenda o elo seguinte (dobradiça).',
  size: [6.2, 0.3, 2.4],
  pins: [],
  mech: true,
  config: { length: 5, width: 1.2, thick: 0.3, curva: 0.8, meio: true, material: 'mdf' },
  fields: [
    { key: 'length', label: 'Distância entre furos', type: 'range', min: 2, max: 15, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura', type: 'range', min: 0.6, max: 3, step: 0.1, unit: 'cm' },
    { key: 'curva', label: 'Curvatura', type: 'range', min: 0, max: 3, step: 0.1, unit: 'cm' },
    { key: 'meio', label: 'Furo a meio', type: 'select', options: [[true, 'Sim'], [false, 'Não']] },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.2, max: 0.6, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, D(c).L * D(c).W * 1.15 * D(c).T, 'mdf'),
  friction: frictionOf('mdf'),
  collider: (c) => ({ size: [D(c).L + D(c).W, D(c).T, D(c).W + D(c).bow * 2], pos: [D(c).L / 2, D(c).T / 2, -D(c).bow] }),
  mounts: holeMounts(
    [
      { id: 'end', label: 'furo da ponta', at: (c) => [D(c).L, 0] },
      { id: 'mid', label: 'furo do meio', at: (c) => curvoAt(c, 0.5) },
    ],
    (c) => D(c).T,
    (c) => curvoAt(c, 0.5),
  ),
}
