// Fotorresistência (LDR) de 5 mm: a resistência baixa com a luz.
import { PITCH } from '../geometry.js'

// [R a 10 lux (Ω), gama]
export const LDR_MODELS = { GL5516: [7500, 0.6], GL5528: [10000, 0.7], GL5539: [60000, 0.8] }

export default {
  type: 'ldr',
  name: 'Fotorresistência LDR',
  short: 'LDR',
  cat: 'sensor',
  description:
    'Resistência que depende da luz: ~1 MΩ no escuro, ~10 kΩ com 10 lux (sala escura), menos de 1 kΩ com luz forte. Sozinha não dá uma tensão: faça um divisor — uma perna ao 5V, a outra ao A0 e uma resistência de 10 kΩ do A0 ao GND (mais luz → valor maior). Não tem polaridade.',
  size: [0.6, 0.7, 0.6],
  pins: [
    { id: '1', pos: [-0.5 * PITCH, 0, 0], kind: 'pass' },
    { id: '2', pos: [0.5 * PITCH, 0, 0], kind: 'pass' },
  ],
  config: { model: 'GL5528' },
  fields: [{ key: 'model', label: 'Modelo', type: 'select', options: Object.keys(LDR_MODELS).map((k) => [k, `${k} (${LDR_MODELS[k][0] / 1000} kΩ a 10 lux)`]) }],
  interactive: { kind: 'slider', label: 'Luz', unit: 'lux', min: 0, max: 10000, step: 1, default: 300 },
  view2d: { view: 'top', x: [-0.4, 0.4], z: [-0.35, 0.35] },
}
