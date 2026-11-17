// LED RGB de cátodo comum (4 pernas): R, K (comum, a mais longa), G, B.
import { PITCH } from '../geometry.js'

export default {
  type: 'rgbled',
  name: 'LED RGB (cátodo comum)',
  short: 'RGB',
  cat: 'output',
  description: 'Três LEDs num só: R, G e B com o cátodo comum (K) ao GND. Uma resistência de 220 Ω por cor. Misture cores com analogWrite.',
  size: [0.6, 1.3, 0.6],
  pins: [
    { id: 'R', label: 'R (vermelho)', pos: [-1.5 * PITCH, 0, 0], kind: 'pass' },
    { id: 'K', label: 'K (−) comum', pos: [-0.5 * PITCH, 0, 0], kind: 'pass' },
    { id: 'G', label: 'G (verde)', pos: [0.5 * PITCH, 0, 0], kind: 'pass' },
    { id: 'B', label: 'B (azul)', pos: [1.5 * PITCH, 0, 0], kind: 'pass' },
  ],
  view2d: { view: 'top', x: [-0.5, 0.5], z: [-0.4, 0.4] },
}
