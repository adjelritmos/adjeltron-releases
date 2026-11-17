// Sensor de humidade do solo resistivo (sonda YL-69 + módulo comparador YL-38).
import { analogModuleDef } from './_analogModule.js'

export default analogModuleDef({
  type: 'soilMoisture',
  name: 'Sensor de humidade do solo',
  short: 'Solo',
  description:
    'Sonda de 2 pontas espetada na terra + módulo com comparador. VCC → 5V, GND → GND, AO → A0, DO → pino digital. AO é ALTO com terra seca (~1000) e baixa com terra molhada (~300 em água). DO: HIGH = seco, LOW = húmido (abaixo do limiar do trimpot; acende o LED). Dica real: a sonda corrói com corrente contínua — alimente VCC a partir de um pino digital (consome ~5 mA) e ligue-o só para medir.',
  order: ['VCC', 'GND', 'DO', 'AO'],
  pinX: -4.4,
  size: [9.4, 0.8, 2.1],
  view2d: { view: 'top', x: [-4.75, 4.8], z: [-1.05, 1.05] },
  interactive: { kind: 'slider', label: 'Humidade do solo', unit: '%', min: 0, max: 100, step: 1, default: 30 },
  threshold: 0.6,
})
