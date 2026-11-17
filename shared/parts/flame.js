// Sensor de chama por infravermelho (fototransístor 760–1100 nm) em módulo com comparador.
import { analogModuleDef } from './_analogModule.js'

export default analogModuleDef({
  type: 'flame',
  name: 'Sensor de chama IR',
  short: 'Chama',
  description:
    'Fototransístor sensível ao infravermelho de uma chama (até ~1 m, ângulo de 60°). AO → A0, GND → GND, VCC → 5V, DO → pino digital. AO BAIXA quanto mais forte/perto está a chama (~1000 sem chama, ~100 com chama a poucos cm). DO: LOW quando deteta chama (abaixo do limiar do trimpot; acende o LED), HIGH sem chama. A luz do sol ou lâmpadas de incandescência também o ativam.',
  order: ['AO', 'GND', 'VCC', 'DO'],
  pinX: -1.4,
  size: [3.9, 1.0, 1.5],
  view2d: { view: 'top', x: [-1.75, 2.15], z: [-0.75, 0.75] },
  interactive: { kind: 'slider', label: 'Radiação IR da chama', unit: '%', min: 0, max: 100, step: 1, default: 0 },
  threshold: 0.5,
})
