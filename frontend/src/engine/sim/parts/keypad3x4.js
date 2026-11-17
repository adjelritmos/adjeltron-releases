// Teclado de membrana 3×4: a tecla premida liga a sua linha à sua coluna (~150 Ω).
import { KEYPAD3_KEYS } from '../../../../../shared/parts/keypad3x4.js'
import * as i18n from '../../../../../shared/i18n.js'

const ROWS = ['R1', 'R2', 'R3', 'R4']
const COLS = ['C1', 'C2', 'C3']

function where(key) {
  for (let r = 0; r < 4; r++) {
    const c = KEYPAD3_KEYS[r].indexOf(key)
    if (c >= 0) return [r, c]
  }
  return null
}

export default {
  type: 'keypad3x4',
  stamp({ cond, input }) {
    const rc = input.key ? where(input.key) : null
    if (rc) cond(ROWS[rc[0]], COLS[rc[1]], 1 / 150)
  },
  output({ live, input }) {
    live.key = input.key || null
  },
  diagnose({ isC, name, issues, part }) {
    const missing = [...ROWS, ...COLS].filter((p) => !isC(p))
    if (missing.length === 7) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os 7 fios (R1–R4 e C1–C3) a 7 pinos digitais do Arduino.`, `${name}: connect the 7 wires (R1–R4 and C1–C3) to 7 Arduino digital pins.`), parts: [part.id] })
    else if (missing.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: falta ligar ${missing.join(', ')} — as teclas dessa linha/coluna nunca serão lidas.`, `${name}: ${missing.join(', ')} still to connect — the keys on that row/column will never be read.`), parts: [part.id] })
  },
}
