// Argolas cortadas a laser (kit de braço em MDF): anel grande com cauda e furo pequeno (forquilha
// do pulso, olhal da pinça) ou anel oval de dois furos (espaçador / guia).
import { materialFields, massOf, frictionOf } from './_materials.js'
import { holeMounts } from './_laser.js'

export const argolaDims = (c) => ({ forma: c.forma ?? 'argola', D: c.ring ?? 2, L: c.length ?? 3, W: c.width ?? 1, T: c.thick ?? 0.3 })
const A = argolaDims

export default {
  type: 'eloArgolaMdf',
  name: 'Argola / anel oval (MDF / acrílico)',
  short: 'Argola',
  cat: 'robot',
  loose: true,
  description:
    'Peça cortada a laser com um anel: "argola com cauda" (anel grande com um braço e um furo pequeno na ponta, como os olhais e forquilhas dos kits de braço em MDF) ou "anel oval" (dois furos, para espaçar ou guiar). O anel grande deixa passar um veio, um parafuso grande ou o cabo de um servo.',
  size: [4, 0.3, 2],
  pins: [],
  mech: true,
  config: { forma: 'argola', ring: 2, length: 3, width: 1, thick: 0.3, material: 'mdf' },
  fields: [
    { key: 'forma', label: 'Forma', type: 'select', options: [['argola', 'Argola com cauda'], ['oval', 'Anel oval (2 furos)']] },
    { key: 'ring', label: 'Diâmetro do anel', type: 'range', min: 1, max: 5, step: 0.1, unit: 'cm' },
    { key: 'length', label: 'Distância ao furo da ponta', type: 'range', min: 1, max: 10, step: 0.5, unit: 'cm' },
    { key: 'width', label: 'Largura da cauda', type: 'range', min: 0.5, max: 2.5, step: 0.1, unit: 'cm' },
    { key: 'thick', label: 'Espessura', type: 'range', min: 0.2, max: 0.6, step: 0.1, unit: 'cm' },
    ...materialFields(),
  ],
  mass: (c) => massOf(c, (Math.PI * (A(c).D / 2) ** 2 * 0.7 + A(c).L * A(c).W) * A(c).T, 'mdf'),
  friction: frictionOf('mdf'),
  collider: (c) => ({ size: [A(c).L + A(c).D, A(c).T, A(c).D], pos: [A(c).L / 2, A(c).T / 2, 0] }),
  mounts: holeMounts([{ id: 'end', label: 'furo da ponta', at: (c) => [A(c).L, 0] }], (c) => A(c).T, (c) => [A(c).L / 2, 0]),
}
