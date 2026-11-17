// Regulador linear fixo de 5 V L7805 (TO-220).
import { to220Pins, to220View, HEATSINK } from './_to220.js'

export default {
  type: 'lm7805',
  name: 'Regulador de tensão 7805 (5 V)',
  short: '7805',
  cat: 'power',
  description:
    'Transforma 7–25 V (pilha de 9 V, transformador de 12 V…) em 5 V fixos, até ~1,5 A. Com as letras viradas para si: IN (1), GND (2), OUT (3). Precisa de pelo menos ~2 V a mais na entrada (dropout): com 6 V de entrada dá só ~4 V. Tudo o que "sobra" vira calor: P = (Vin − 5 V) × I — com 12 V e 0,5 A são 3,5 W, demais sem dissipador (desliga-se sozinho a ~150 °C). Ponha condensadores de 0,33 µF na entrada e 0,1 µF na saída (no real evitam oscilações).',
  size: [0.45, 2.0, 1.0],
  pins: to220Pins([['IN', 'pwr', 'IN (entrada 7–25 V)'], ['GND', 'gnd', 'GND'], ['OUT', 'pwr', 'OUT (5 V)']]),
  config: { heatsink: false },
  fields: [{ key: 'heatsink', label: 'Dissipador', type: 'select', options: HEATSINK }],
  view2d: to220View,
}
