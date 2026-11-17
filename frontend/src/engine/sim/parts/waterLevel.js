// Nível de água: as pistas submersas formam com a resistência do módulo um divisor.
// S ≈ VCC × 0,65 × (nível/40)^0,7 (a resistência cai depressa nos primeiros mm).
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'waterLevel',
  stamp({ cond, src, s, input, vd }) {
    if (s.damaged) return cond('+', '-', 1e-9)
    cond('+', '-', 1 / 5000) // LED de alimentação
    if (!s.powered) return
    const lv = Math.max(0, Math.min(40, input.value ?? 0))
    s.ao = vd('+', '-') * 0.65 * Math.pow(lv / 40, 0.7)
    src('S', '-', s.ao, lv > 0 ? 2000 : 100000)
  },
  update: (ctx) => modulePower(ctx, 2.0, 5.5, 6.5, '+', '-'),
  output({ s, live, input }) {
    live.powered = !!s.powered && !s.damaged
    live.mm = input.value ?? 0
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5, pos: '+', neg: '-', label: i18n.m('+ → 5V (ou um pino digital) e − → GND', '+ → 5V (or a digital pin) and − → GND') })
    if (!isC('S')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue S a uma entrada analógica (A0…A5).`, `${name}: connect S to an analog input (A0…A5).`), parts: [part.id] })
  },
}
