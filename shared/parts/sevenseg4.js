// Display de 7 segmentos de 4 dígitos multiplexado (5461AS / 5461BS), 12 pinos.
import { PITCH } from '../geometry.js'

const X = (i) => (i - 2.5) * PITCH
// fila de cima (pinos 12 → 7) e de baixo (pinos 1 → 6), vistas da frente
const TOP = ['DIG1', 'A', 'F', 'DIG2', 'DIG3', 'B']
const BOTTOM = ['E', 'D', 'DP', 'C', 'G', 'DIG4']
// filas a 0,6": encaixa nas filas c e g da breadboard
export const SEG4_Z = { top: -0.889, bottom: 0.635 }

export default {
  type: 'sevenseg4',
  name: 'Display 7 segmentos × 4 dígitos',
  short: '7seg ×4',
  cat: 'output',
  description:
    '4 dígitos que partilham os 8 segmentos (A–G, DP): só se acende um dígito de cada vez e o programa alterna-os depressa (multiplexagem, ~5 ms por dígito) para parecerem todos acesos. Cátodo comum: DIG1–DIG4 → pinos do Arduino (LOW acende o dígito), segmentos → pinos com 220 Ω (HIGH acende). Ânodo comum: tudo ao contrário. Funciona com a biblioteca SevSeg.',
  size: [5.0, 0.8, 1.9],
  pins: [
    ...TOP.map((id, i) => ({ id, pos: [X(i), 0, SEG4_Z.top], kind: id.startsWith('DIG') ? 'pass' : 'pass' })),
    ...BOTTOM.map((id, i) => ({ id, pos: [X(i), 0, SEG4_Z.bottom], kind: 'pass' })),
  ],
  config: { color: 'red', common: 'cathode' },
  fields: [
    { key: 'color', label: 'Cor', type: 'select', options: [['red', 'Vermelho'], ['green', 'Verde'], ['blue', 'Azul'], ['yellow', 'Amarelo'], ['white', 'Branco']] },
    { key: 'common', label: 'Tipo', type: 'select', options: [['cathode', 'Cátodo comum (5461AS)'], ['anode', 'Ânodo comum (5461BS)']] },
  ],
  lib: {
    header: 'SevSeg.h',
    usage: 'SevSeg ss;\nbyte digitos[] = {2, 3, 4, 5};\nbyte segs[] = {6, 7, 8, 9, 10, 11, 12, 13};\nss.begin(COMMON_CATHODE, 4, digitos, segs, true);\nss.setNumber(1234);\n// no loop():\nss.refreshDisplay();',
  },
  view2d: { view: 'top', x: [-2.5, 2.5], z: [-1.077, 0.823] },
}
