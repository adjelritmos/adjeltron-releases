// Hélice de 2 pás para um veio que roda (impulso calculado da rotação do veio).
export const PROP_SIZES = { 3: 3.81, 5: 6.35, 7: 8.89, 10: 12.7 } // polegadas → raio (cm)
export const propR = (c) => PROP_SIZES[c.inches ?? 5] ?? 6.35

export default {
  type: 'propeller',
  name: 'Hélice de 2 pás',
  short: 'Hélice',
  cat: 'mech',
  description:
    'Hélice de plástico de 2 pás (3", 5", 7" ou 10") para prender no veio de um motor. Empurra ao longo do eixo do veio com um impulso que cresce com o quadrado da rotação (T ≈ 0,1 × ρ × n² × D⁴): uma hélice de 5" a 1000 rpm dá só ~10 mN, a 20 000 rpm ~4 N. Uma hélice CW empurra para o lado do cubo quando roda no sentido horário vista de cima; ao contrário quase não empurra. Na física aplica a força e o binário de reação.',
  size: [12.7, 0.8, 1.6],
  pins: [],
  mech: true,
  config: { inches: 5, spin: 'CW' },
  fields: [
    { key: 'inches', label: 'Tamanho', type: 'select', options: [[3, '3" (76 mm)'], [5, '5" (127 mm)'], [7, '7" (178 mm)'], [10, '10" (254 mm)']] },
    { key: 'spin', label: 'Sentido', type: 'select', options: [['CW', 'CW (horário, visto do cubo)'], ['CCW', 'CCW (anti-horário)']] },
  ],
  mass: (c) => 1 + 0.25 * propR(c),
  collider: false,
  thrust: { axis: [0, 1, 0], pos: [0, 0.4, 0] },
}
