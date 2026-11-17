// Potenciómetro rotativo: A–W = R·f(posição), W–B = R·(1 − f). Curva B linear; curva A
// logarítmica (áudio: 10 % da resistência a meio curso).
import * as i18n from '../../../../../shared/i18n.js'
const curve = (taper, x) => (taper === 'A' ? (Math.pow(10, 2 * x) - 1) / 99 : x)

const pos = (cfg, input) => Math.max(0, Math.min(1, (input.value ?? cfg.value ?? 50) / 100))

export default {
  type: 'potRotativo',
  stamp({ cfg, input, cond }) {
    const R = Number(cfg.ohms) || 10000
    const f = curve(cfg.taper, pos(cfg, input))
    cond('A', 'W', 1 / (R * f + 1))
    cond('W', 'B', 1 / (R * (1 - f) + 1))
  },
  step({ cfg, input, s, invalidate }) {
    const p = pos(cfg, input)
    if (p !== s.p) {
      s.p = p
      invalidate()
    }
  },
  output({ cfg, input, live }) {
    live.pos = pos(cfg, input)
  },
  diagnose({ part, isC, name, issues }) {
    if (!isC('W')) issues.push({ level: 'info', msg: i18n.m(`${name}: o terminal do meio (W, cursor) é a saída — ligue-o a um pino analógico (A0…).`, `${name}: the middle terminal (W, wiper) is the output — connect it to an analog pin (A0…).`), parts: [part.id] })
  },
}
