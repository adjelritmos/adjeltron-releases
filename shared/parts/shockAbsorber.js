// Amortecedor com mola (suspensão de robôs/carros RC): olhal de baixo fixo, haste de cima desliza.
export const SHOCK = { R: 0.55 }
const L = (c) => c.length ?? 7

export default {
  type: 'shockAbsorber',
  name: 'Amortecedor com mola',
  short: 'Amortecedor',
  cat: 'mech',
  description:
    'Amortecedor a óleo com mola helicoidal (tipo carro RC 1:10). O olhal de baixo prende-se à estrutura; o que se prender no olhal de cima pode subir e descer ao longo do eixo, puxado pela mola e travado pelo óleo. Na física é uma junta prismática com mola (rigidez k) e amortecimento (c): suspensões, patas que absorvem a queda, para-choques. Sem física fica no comprimento livre.',
  size: [1.1, 7, 1.1],
  pins: [],
  mech: true,
  config: { length: 7, k: 1.5, c: 0.03 },
  fields: [
    { key: 'length', label: 'Comprimento', type: 'select', options: [[5, '50 mm'], [7, '70 mm'], [10, '100 mm']] },
    { key: 'k', label: 'Rigidez da mola', type: 'range', min: 0.2, max: 6, step: 0.1, unit: 'N/cm' },
    { key: 'c', label: 'Amortecimento', type: 'range', min: 0, max: 0.2, step: 0.01, unit: 'N·s/cm' },
  ],
  mass: 14,
  collider: (c) => ({ size: [1.1, L(c) * 0.55, 1.1], pos: [0, L(c) * 0.275, 0] }),
  mounts: {
    top: {
      pos: (c) => [0, L(c), 0],
      slide: (c) => ({ axis: [0, 1, 0], min: -L(c) * 0.3, max: L(c) * 0.05 }),
      spring: (c) => ({ k: c.k ?? 1.5, c: c.c ?? 0.03 }),
      label: 'olhal de cima (desliza)',
    },
  },
}
