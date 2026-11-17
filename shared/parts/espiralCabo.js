// Espiral de arrumação de cabos (preta), ao longo de +x a partir da origem. Decorativa: não
// colide nem pesa quase nada.
export const espiralLen = (c) => c?.length ?? 10
export const espiralD = (c) => c?.diameter ?? 0.8

export default {
  type: 'espiralCabo',
  ownDims: true,
  name: 'Espiral de cabos',
  short: 'Espiral',
  cat: 'robot',
  description:
    'Fita em espiral de polietileno preto que junta os cabos dos servos ao longo das pernas e do pescoço (como nos cães robô de alumínio). Só aspeto: não colide nem conta para a física. Escolha o comprimento e o diâmetro e prenda-a onde quiser (ex.: no topo do chassi, a descer para uma perna).',
  size: [10, 0.8, 0.8],
  pins: [],
  mech: true,
  config: { length: 10, diameter: 0.8, pitch: 0.6 },
  fields: [
    { key: 'length', label: 'Comprimento', type: 'range', min: 2, max: 40, step: 0.5, unit: 'cm' },
    { key: 'diameter', label: 'Diâmetro', type: 'range', min: 0.4, max: 2, step: 0.1, unit: 'cm' },
    { key: 'pitch', label: 'Passo da espiral', type: 'range', min: 0.3, max: 1.5, step: 0.05, unit: 'cm' },
  ],
  mass: (c) => 0.25 * espiralLen(c),
  collider: false,
}
