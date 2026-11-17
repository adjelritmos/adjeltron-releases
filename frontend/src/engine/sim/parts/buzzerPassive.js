// Buzzer passivo: sem oscilador interno. Só produz som com uma onda quadrada
// vinda de tone() no pino ligado ao + (ou ao −). Impedância média ~400 Ω.
import { boardPinIds } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const HOLD_US = 50000 // 50 ms

export default {
  type: 'buzzerPassive',
  stamp({ cond }) {
    cond('+', '-', 1 / 400)
  },
  step({ s, vd, boardPins, boardPinsOn, timeUs }) {
    let f = 0
    for (const side of ['+', '-']) {
      for (const n of boardPinsOn(side)) {
        const p = boardPins[n]
        if (p.mode === 'OUTPUT' && p.tone > 0) f = p.tone
      }
    }
    // o circuito tem de fechar: há tensão (média) aos terminais?
    if (f && Math.abs(vd('+', '-')) < 1) f = 0
    s.freq = f
    if (f) {
      s.lastF = f
      s.lastUs = timeUs
    }
  },
  // um tone() curto (ex.: tone(8, 1000, 20)) podia acabar antes da fotografia seguinte e não se
  // ouvir: mantém-se a última frequência mais HOLD_US depois de calar
  output({ s, live, timeUs }) {
    live.freq = s.freq || (s.lastF && timeUs - s.lastUs < HOLD_US ? s.lastF : 0)
  },
  diagnose({ part, isC, nets, parts, name, issues }) {
    if (!isC('+') || !isC('-')) {
      issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue + a um pino digital (ex.: 8) e − ao GND.`, `${name}: connect + to a digital pin (e.g. 8) and − to GND.`), parts: [part.id] })
      return
    }
    const plus = boardPinIds(nets, parts, part.id, '+')
    if (plus.includes('5V') || plus.includes('VIN')) issues.push({ level: 'info', msg: i18n.m(`${name}: com tensão constante um buzzer passivo não apita (só dá um estalido). Ligue + a um pino digital e use tone().`, `${name}: with a constant voltage a passive buzzer does not beep (it only clicks). Connect + to a digital pin and use tone().`), parts: [part.id] })
  },
}
