// Sensor de gás MQ-2 (GPL, butano, metano, fumo) em módulo com comparador.
import { analogModuleDef } from './_analogModule.js'

export default analogModuleDef({
  type: 'mq2',
  name: 'Sensor de gás MQ-2',
  short: 'MQ-2',
  description:
    'Deteta gás combustível e fumo (200–10000 ppm). VCC → 5V, GND → GND, AO → A0 (mais gás → valor maior; ar limpo ≈ 100), DO → pino digital: LOW quando a concentração passa o limiar do trimpot (acende o LED), HIGH sem gás. Atenção: o aquecedor interno consome ~150 mA — alimente a partir do pino 5V (nunca de um pino digital, que só dá 40 mA). Quando liga, as leituras vêm altas durante uns segundos até o aquecedor estabilizar.',
  order: ['VCC', 'GND', 'DO', 'AO'],
  pinX: -1.4,
  size: [3.3, 2.0, 2.3],
  view2d: { view: 'top', x: [-1.75, 1.7], z: [-1.15, 1.15] },
  interactive: { kind: 'slider', label: 'Gás (GPL)', unit: 'ppm', min: 0, max: 10000, step: 10, default: 0 },
  threshold: 0.4,
})
