// Veio de aço de 4 mm (eixo) com casquilhos de fixação.
export const AXLE_R = 0.2
const L = (c) => c.length ?? 5

export default {
  type: 'axle',
  name: 'Veio de aço 4 mm',
  short: 'Veio',
  cat: 'mech',
  description:
    'Eixo de aço retificado de 4 mm. Prenda-o ao veio de um motor (ou a um acoplador) para o prolongar, ou a um mancal para fazer um eixo livre; o que se prender nele (engrenagens, polias, rodas) roda com ele. Pontos de fixação na base, a meio e na ponta.',
  size: [0.4, 5, 0.4],
  pins: [],
  mech: true,
  config: { length: 5 },
  fields: [{ key: 'length', label: 'Comprimento', type: 'select', options: [[3, '30 mm'], [5, '50 mm'], [8, '80 mm'], [12, '120 mm'], [20, '200 mm']] }],
  mass: (c) => 7.85 * Math.PI * AXLE_R * AXLE_R * L(c),
  collider: false,
  mounts: {
    base: { pos: [0, 0.4, 0], label: 'junto à base' },
    mid: { pos: (c) => [0, L(c) / 2, 0], label: 'a meio' },
    tip: { pos: (c) => [0, L(c) - 0.4, 0], label: 'junto à ponta' },
    end: { pos: (c) => [0, L(c), 0], label: 'ponta' },
  },
}
