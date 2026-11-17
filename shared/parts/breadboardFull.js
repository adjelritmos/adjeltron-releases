// Breadboard completa de 830 pontos (63 colunas × 10 filas + 4 trilhos de 50 furos), 16,5 × 5,5 cm.
// Mesmo passo, filas e trilhos que a meia breadboard (shared/components.js), só mais comprida.
import { PITCH } from '../geometry.js'

export const BBF = { COLS: 63, RAIL: 50 }
const ROWS = 'abcdefghij'
const rowZ = (r) => (r < 5 ? -0.381 - (4 - r) * PITCH : 0.381 + (r - 5) * PITCH)
export const bbfColX = (c) => (c - 32) * PITCH
// furo k (0–49) de um trilho: grupos de 5 com um espaço entre grupos
export const bbfRailX = (k) => (k + Math.floor(k / 5) - 29) * PITCH
export const BBF_RAIL_Z = { tn: -2.413, tp: -2.159, bp: 2.159, bn: 2.413 }

const pins = []
for (let c = 1; c <= BBF.COLS; c++) for (let r = 0; r < 10; r++) pins.push({ id: `${c}${ROWS[r]}`, pos: [bbfColX(c), 0.85, rowZ(r)], kind: 'bb' })
for (const rail of ['tn', 'tp', 'bp', 'bn'])
  for (let k = 0; k < BBF.RAIL; k++) pins.push({ id: `${rail}.${k + 1}`, label: `${rail.endsWith('p') ? '+' : '−'} ${k + 1}`, pos: [bbfRailX(k), 0.85, BBF_RAIL_Z[rail]], kind: rail.endsWith('p') ? 'bbp' : 'bbn' })
const internal = []
for (let c = 1; c <= BBF.COLS; c++) {
  internal.push('abcde'.split('').map((r) => `${c}${r}`))
  internal.push('fghij'.split('').map((r) => `${c}${r}`))
}
for (const rail of ['tn', 'tp', 'bp', 'bn']) internal.push(Array.from({ length: BBF.RAIL }, (_, k) => `${rail}.${k + 1}`))

export default {
  type: 'breadboardFull',
  name: 'Breadboard completa (830 pontos)',
  short: 'Breadboard 830',
  cat: 'proto',
  breadboard: true,
  description:
    'Breadboard grande de 830 furos (16,5 × 5,5 cm): 63 colunas, cada uma com duas metades de 5 furos ligados (a–e e f–j) separadas pelo canal central, e 4 trilhos de alimentação de 50 furos a todo o comprimento (+ vermelho e − azul, em cima e em baixo). Cabe um ESP32, vários circuitos integrados e muitos componentes.',
  size: [16.5, 0.85, 5.5],
  pins,
  internal,
  mounts: { top: { pos: [0, 0.85, 0], plane: true, label: 'em cima' } },
  view2d: { view: 'top', x: [-8.25, 8.25], z: [-2.75, 2.75] },
}
