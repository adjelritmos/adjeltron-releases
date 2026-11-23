// Potenciómetro deslizante linear de 10 kΩ (curso de 30 mm) em módulo.
import { rowZ } from '../geometry.js'

export default {
  type: 'slidePot',
  name: 'Potenciómetro deslizante 10 kΩ',
  short: 'Deslizante',
  cat: 'input',
  description:
    'Potenciómetro linear de curso reto (30 mm): VCC → 5V, GND → GND, SIG (cursor) → entrada analógica. SIG vai de 0 V (cursor do lado do GND) a VCC — analogRead de 0 a 1023. Ótimo para mesas de mistura, volumes e controlo de brilho.',
  size: [7.4, 1.2, 1.6],
  pins: rowZ(['GND', 'SIG', 'VCC'], -3.45, 0.3, ['gnd', 'out', 'pwr']),
  interactive: { kind: 'slider', label: 'Posição', unit: '%', min: 0, max: 100, step: 1, default: 50, knob: true, wheelStep: 2 },
  view2d: { view: 'top', x: [-3.75, 3.75], z: [-0.85, 0.85] },
}
