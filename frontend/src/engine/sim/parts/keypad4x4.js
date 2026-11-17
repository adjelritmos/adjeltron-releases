// Teclado de membrana 4×4: a tecla premida liga a sua linha à sua coluna (~150 Ω).
import { KEYPAD_KEYS } from '../../../../../shared/parts/keypad4x4.js'
import * as i18n from '../../../../../shared/i18n.js'

const ROWS = ['R1', 'R2', 'R3', 'R4']
const COLS = ['C1', 'C2', 'C3', 'C4']

function where(key) {
  for (let r = 0; r < 4; r++) {
    const c = KEYPAD_KEYS[r].indexOf(key)
    if (c >= 0) return [r, c]
  }
  return null
}

export default {
  type: 'keypad4x4',
  stamp({ cond, input }) {
    const rc = input.key ? where(input.key) : null
    if (rc) cond(ROWS[rc[0]], COLS[rc[1]], 1 / 150)
  },
  output({ live, input }) {
    live.key = input.key || null
  },
  diagnose({ isC, name, issues, part }) {
    const missing = [...ROWS, ...COLS].filter((p) => !isC(p))
    if (missing.length === 8) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os 8 fios (R1–R4 e C1–C4) a 8 pinos digitais do Arduino.`, `${name}: connect the 8 wires (R1–R4 and C1–C4) to 8 Arduino digital pins.`), parts: [part.id] })
    else if (missing.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: falta ligar ${missing.join(', ')} — as teclas dessa linha/coluna nunca serão lidas.`, `${name}: ${missing.join(', ')} still to connect — the keys on that row/column will never be read.`), parts: [part.id] })
  },
}
