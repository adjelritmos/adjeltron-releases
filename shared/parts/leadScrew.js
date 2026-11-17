// Eixo linear com fuso trapezoidal T8, duas guias de 8 mm e carro (para NEMA 17).
export const LS = { AY: 2.2, BLOCK: 1.2, CAR: 5, CAR_TOP: 3.6, W: 6 }
export const lsLen = (c) => c.length ?? 30
export const lsTravel = (c) => lsLen(c) / 2 - LS.BLOCK - LS.CAR / 2 - 2.3 // não bate no acoplador

export default {
  type: 'leadScrew',
  name: 'Eixo linear com fuso T8 (NEMA 17)',
  short: 'Fuso T8',
  cat: 'mech',
  description:
    'Mesa linear de impressora 3D/CNC: fuso trapezoidal T8 entre dois blocos, duas guias de 8 mm e um carro com porca de latão. Monte um motor de passo NEMA 17 no ponto "motor" (fica alinhado com o fuso): cada volta do motor avança o carro o passo do fuso (8 mm no T8×8; 2 mm no T8×2, mais lento mas com mais força e resolução: 0,01 mm por passo). Com o fuso T8×8 e 200 passos/volta são 25 passos por mm. Prenda o que quiser mover no carro (outro eixo linear para fazer um plotter XY, uma caneta, uma garra). O carro pára nos fins de curso (e avisa).',
  size: [34, 3.6, 6],
  pins: [],
  mech: true,
  config: { length: 30, lead: 0.8 },
  fields: [
    { key: 'length', label: 'Comprimento', type: 'select', options: [[20, '20 cm (curso 8 cm)'], [30, '30 cm (curso 18 cm)'], [40, '40 cm (curso 28 cm)']] },
    { key: 'lead', label: 'Fuso', type: 'select', options: [[0.8, 'T8×8 (8 mm por volta)'], [0.2, 'T8×2 (2 mm por volta)']] },
  ],
  mass: (c) => 250 + 9 * lsLen(c),
  collider: (c) => [
    { size: [LS.BLOCK, 3.4, LS.W], pos: [-lsLen(c) / 2 + LS.BLOCK / 2, 1.7, 0] },
    { size: [LS.BLOCK, 3.4, LS.W], pos: [lsLen(c) / 2 - LS.BLOCK / 2, 1.7, 0] },
    { size: [lsLen(c) - 2 * LS.BLOCK, 0.8, 4.8], pos: [0, LS.AY, 0] },
    // acoplador do motor (redondo: roda sem mudar); o carro desliza e não tem colisor fixo
    { size: [2.0, 1.9, 1.9], pos: [-lsLen(c) / 2 + LS.BLOCK + 1.1, LS.AY, 0] },
  ],
  drive: (c) => ({ kind: 'screw', mount: 'motor', slide: 'carriage', lead: c.lead ?? 0.8 }),
  mounts: {
    carriage: { pos: [0, LS.CAR_TOP, 0], slide: (c) => ({ axis: [1, 0, 0], min: -lsTravel(c), max: lsTravel(c) }), plane: true, label: 'carro (desliza)' },
    // NEMA 17 deitado do lado de −x, com o veio (y do motor) segundo +x, no eixo do fuso
    motor: { pos: (c) => [-lsLen(c) / 2 - 4.0, LS.AY, 0], rot: [0, 0, -90], slot: 'nema17', label: 'motor (NEMA 17)' },
    base: { pos: [0, 0, 0], rot: [180, 0, 0], plane: true, label: 'por baixo' },
  },
}
