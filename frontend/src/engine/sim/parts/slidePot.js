// Potenciómetro deslizante linear 10 kΩ: divisor VCC–SIG–GND segundo a posição do cursor.
import * as i18n from '../../../../../shared/i18n.js'
const R = 10000

export default {
  type: 'slidePot',
  stamp({ cond, input }) {
    const f = Math.max(0, Math.min(1, (input.value ?? 50) / 100))
    cond('GND', 'SIG', 1 / (R * f + 30))
    cond('SIG', 'VCC', 1 / (R * (1 - f) + 30))
  },
  output({ live, input, vd }) {
    live.pos = input.value ?? 50
    live.v = Math.round(vd('SIG', 'GND') * 100) / 100
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('VCC') || !isC('GND')) issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue VCC → 5V e GND → GND (os extremos da pista), senão SIG não dá uma tensão definida.`, `${name}: connect VCC → 5V and GND → GND (the ends of the track), otherwise SIG does not give a defined voltage.`), parts: [part.id] })
    else if (!isC('SIG')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue SIG (cursor) a uma entrada analógica (A0…A5).`, `${name}: connect SIG (wiper) to an analog input (A0…A5).`), parts: [part.id] })
  },
}
