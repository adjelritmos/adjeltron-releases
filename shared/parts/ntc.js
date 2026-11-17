// Termístor NTC 10 kΩ (B = 3950): a resistência baixa quando a temperatura sobe.
import { PITCH } from '../geometry.js'

export default {
  type: 'ntc',
  name: 'Termístor NTC 10 kΩ',
  short: 'NTC',
  cat: 'sensor',
  description:
    'Resistência que diminui com a temperatura: 10 kΩ a 25 °C (≈33 kΩ a 0 °C, ≈680 Ω a 100 °C). Faça um divisor: 5V → resistência de 10 kΩ → A0 → NTC → GND. Converta com a equação Beta: R = 10000 / (1023.0 / leitura − 1); T = 1 / (log(R / 10000) / 3950 + 1 / 298.15) − 273.15. Responde à temperatura com algum atraso (massa térmica). Sem polaridade.',
  size: [0.6, 0.7, 0.6],
  pins: [
    { id: '1', pos: [-0.5 * PITCH, 0, 0], kind: 'pass' },
    { id: '2', pos: [0.5 * PITCH, 0, 0], kind: 'pass' },
  ],
  config: { r25: 10000, beta: 3950 },
  fields: [
    { key: 'r25', label: 'R a 25 °C', type: 'select', options: [[10000, '10 kΩ'], [100000, '100 kΩ']] },
    { key: 'beta', label: 'Constante B (K)', type: 'number', min: 2000, max: 5000, step: 10 },
  ],
  interactive: { kind: 'slider', label: 'Temperatura', unit: '°C', min: -20, max: 100, step: 0.5, default: 25 },
  view2d: { view: 'top', x: [-0.4, 0.4], z: [-0.35, 0.35] },
}
