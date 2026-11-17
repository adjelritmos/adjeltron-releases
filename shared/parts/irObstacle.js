// Sensor de obstáculos por infravermelhos FC-51 (LED IR + fotodíodo + LM393).
import { rowZ } from '../geometry.js'

export default {
  type: 'irObstacle',
  name: 'Sensor de obstáculos IR FC-51',
  short: 'Obstáculo IR',
  cat: 'sensor',
  description:
    'Emite infravermelho e deteta o reflexo de um obstáculo à frente (2–30 cm, ajustável no trimpot). OUT → pino digital, GND → GND, VCC → 5V (ou 3,3V). OUT = LOW com obstáculo (acende o LED verde) e HIGH sem nada à frente — saída ativa a LOW, já com pull-up no módulo. Superfícies pretas/foscas refletem pouco e só são vistas mais perto; luz solar forte pode enganá-lo. Na simulação: distância do obstáculo no painel "Controlos", alcance nas propriedades.',
  size: [3.2, 1.0, 1.45],
  pins: rowZ(['OUT', 'GND', 'VCC'], -1.35, 0.3, ['out', 'gnd', 'pwr']),
  config: { range: 10 },
  fields: [{ key: 'range', label: 'Alcance (trimpot)', type: 'range', min: 2, max: 30, step: 1, unit: 'cm' }],
  interactive: { kind: 'slider', label: 'Obstáculo a', unit: 'cm', min: 0, max: 50, step: 0.5, default: 40 },
  view2d: { view: 'top', x: [-1.6, 1.85], z: [-0.75, 0.75] },
}
