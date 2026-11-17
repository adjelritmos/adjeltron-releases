// Interruptor de inclinação SW-520D (esfera metálica): fechado na vertical, aberto inclinado.
import { rowZ } from '../geometry.js'

export default {
  type: 'tilt',
  name: 'Sensor de inclinação SW-520D',
  short: 'Tilt',
  cat: 'sensor',
  description:
    'Interruptor com esferas metálicas: na vertical as esferas fecham o contacto entre as duas pernas; inclinado (>45°) ou virado ao contrário, abre. Uma perna ao GND, a outra a um pino digital com pinMode(pino, INPUT_PULLUP): LOW = direito, HIGH = inclinado. As esferas saltitam alguns milissegundos ao mudar (use debounce). Sem polaridade. Clique na peça para inclinar.',
  size: [0.6, 1.6, 0.6],
  pins: rowZ(['1', '2'], 0, 0, ['pass', 'pass']),
  interactive: { kind: 'toggle', label: 'Inclinado' },
  view2d: { view: 'front', z: [-0.45, 0.45], y: [-0.1, 1.7] },
}
