// Placa de base cortada a laser (kits de braço / mão robótica): retângulo de cantos boleados com
// furação, e um recorte grande em losango (passa-cabos) ou janelas para 5 servos (palma de uma
// mão robótica), ou lisa só com furos.
import { materialFields, massOf, frictionOf } from './_materials.js'

export const placaBaseDims = (c) => ({ X: c.length ?? 12, Z: c.width ?? 8, T: c.thick ?? 0.3, forma: c.forma ?? 'losango' })
const B = placaBaseDims

export default {
  type: 'placaBaseMdf',
  name: 'Placa de base (MDF / acrílico)',
  short: 'Placa base',
  cat: 'robot',
  loose: true,
  description:
    'Placa cortada a laser com furação nas bordas: com um recorte em losango ao meio (passa-cabos, como a base do kit de braço em MDF), com 5 janelas para servos SG90 (a "palma" de uma mão robótica: um servo por dedo) ou lisa. Aparafuse servos, molduras, suportes e a placa do Arduino por cima.',
  size: [12, 0.3, 8],
  pins: [],
  mech: true,
  config: { forma: 'losango', length: 12, width: 8, thick: 0.3, material: 'mdf' },
  fields: [
    { key: 'forma', label: 'Recorte', type: 'select', options: [['losango', 'Losango ao meio'], ['servos', '5 janelas de servo (palma)'], ['lisa', 'Lisa (só furos)']] },
    { key: 'length', label: 'Comprimento', type: 'range', min: 6, max: 30, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura', type: 'range', min: 4, max: 20, step: 0.5, unit: 'cm' },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.2, max: 0.6, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, B(c).X * B(c).Z * 0.8 * B(c).T, 'mdf'),
  friction: frictionOf('mdf'),
  collider: (c) => ({ size: [B(c).X, B(c).T, B(c).Z], pos: [0, B(c).T / 2, 0] }),
  mounts: {
    top: { pos: (c) => [0, B(c).T, 0], plane: true, label: 'em cima' },
    bottom: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
    edge: { pos: (c) => [B(c).X / 2, B(c).T / 2, 0], rot: [0, 0, -90], label: 'aresta (+x)' },
  },
}
