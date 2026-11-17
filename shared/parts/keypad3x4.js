// Teclado de membrana 3×4 (telefone): 4 linhas × 3 colunas.
import { rowX } from '../geometry.js'

export const KEYPAD3_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]
export const KEYPAD3_GEOM = { colX: [-1.6, 0, 1.6], rowZ: [-3.6, -1.85, -0.1, 1.65], w: 1.25, d: 1.35 }

export default {
  type: 'keypad3x4',
  name: 'Teclado de membrana 3×4',
  short: 'Teclado 3×4',
  cat: 'input',
  description:
    'Teclado numérico de 12 teclas: cada tecla liga a sua linha (R1–R4) à sua coluna (C1–C3). Ligue os 7 fios a 7 pinos digitais (ex.: R1–R4 → D9–D6, C1–C3 → D5–D3) e use a biblioteca Keypad com ROWS = 4, COLS = 3.',
  size: [5.4, 0.5, 9.6],
  pins: rowX(['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3'], 4.65, 0.1, Array(7).fill('io')),
  interactive: { kind: 'keypad', keys: KEYPAD3_KEYS, geom: KEYPAD3_GEOM },
  lib: {
    header: 'Keypad.h',
    usage:
      "char keys[4][3] = {{'1','2','3'},{'4','5','6'},{'7','8','9'},{'*','0','#'}};\nbyte rowPins[4] = {9, 8, 7, 6};\nbyte colPins[3] = {5, 4, 3};\nKeypad teclado = Keypad(makeKeymap(keys), rowPins, colPins, 4, 3);",
  },
  view2d: { view: 'top', x: [-2.75, 2.75], z: [-4.7, 5.0] },
}
