// Teclado de membrana 4×4: matriz de 4 linhas × 4 colunas (cada tecla liga uma linha a uma coluna).
import { rowX } from '../geometry.js'

export const KEYPAD_KEYS = [
  ['1', '2', '3', 'A'],
  ['4', '5', '6', 'B'],
  ['7', '8', '9', 'C'],
  ['*', '0', '#', 'D'],
]
// geometria das teclas (cm, referencial local; vista de cima)
export const KEYPAD_GEOM = { colX: [-2.4, -0.8, 0.8, 2.4], rowZ: [-3.6, -1.85, -0.1, 1.65], w: 1.25, d: 1.35 }

export default {
  type: 'keypad4x4',
  name: 'Teclado de membrana 4×4',
  short: 'Teclado',
  cat: 'input',
  description:
    'Matriz de 16 teclas: carregar numa tecla liga a sua linha (R1–R4) à sua coluna (C1–C4). Ligue os 8 fios a 8 pinos digitais (ex.: R1–R4 → D9–D6, C1–C4 → D5–D2) e use a biblioteca Keypad, que varre a matriz: põe uma coluna de cada vez a LOW e lê as linhas com pull-up. Não precisa de alimentação nem de resistências.',
  size: [7.0, 0.5, 9.6],
  pins: rowX(['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'], 4.65, 0.1, Array(8).fill('io')),
  // geom: posição das teclas (o clique na vista 3D escolhe a tecla debaixo do rato)
  interactive: { kind: 'keypad', keys: KEYPAD_KEYS, geom: KEYPAD_GEOM },
  lib: {
    header: 'Keypad.h',
    usage:
      "const byte ROWS = 4, COLS = 4;\nchar keys[ROWS][COLS] = {{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};\nbyte rowPins[ROWS] = {9, 8, 7, 6};\nbyte colPins[COLS] = {5, 4, 3, 2};\nKeypad teclado = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);\n// no loop():\nchar k = teclado.getKey();\nif (k) Serial.println(k);",
  },
  view2d: { view: 'top', x: [-3.55, 3.55], z: [-4.7, 5.0] },
}
