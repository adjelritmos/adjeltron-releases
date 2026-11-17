// Mini breadboard de 170 pontos (17 colunas × 10 filas, sem trilhos de alimentação), 47 × 35 mm.
import { PITCH } from '../geometry.js'

export const BBM_COLS = 17
const ROWS = 'abcdefghij'
const rowZ = (r) => (r < 5 ? -0.381 - (4 - r) * PITCH : 0.381 + (r - 5) * PITCH)
const colX = (c) => (c - 9) * PITCH

const pins = []
for (let c = 1; c <= BBM_COLS; c++) for (let r = 0; r < 10; r++) pins.push({ id: `${c}${ROWS[r]}`, pos: [colX(c), 0.85, rowZ(r)], kind: 'bb' })
const internal = []
for (let c = 1; c <= BBM_COLS; c++) {
  internal.push('abcde'.split('').map((r) => `${c}${r}`))
  internal.push('fghij'.split('').map((r) => `${c}${r}`))
}

export default {
  type: 'breadboardMini',
  name: 'Mini breadboard (170 pontos)',
  short: 'Mini BB',
  cat: 'proto',
  breadboard: true,
  description:
    'Breadboard pequena de 170 furos: 17 colunas, cada uma com duas metades de 5 furos ligados (a–e e f–j), separadas pelo canal central onde encaixam os circuitos integrados. Não tem trilhos de alimentação — use uma coluna para o 5V e outra para o GND. Cola-se em cima de um robô ou de uma caixa.',
  size: [4.7, 0.85, 3.5],
  pins,
  internal,
  mounts: { top: { pos: [0, 0.85, 0], plane: true, label: 'em cima' } },
  view2d: { view: 'top', x: [-2.36, 2.36], z: [-1.76, 1.76] },
}
