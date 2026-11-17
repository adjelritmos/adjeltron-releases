// Humidade do solo capacitivo v1.2: AOUT vem de um regulador de 3,3 V e de um TLC555;
// seco ≈ 2,8 V, encharcado ≈ 1,25 V (quase independente de VCC acima de 3,4 V).
import { modulePower, powerDiagnose } from './_util.js'
import { noise } from './_groupG.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'soilCapacitive',
  stamp({ cond, src, s, input, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1 / 1000) // ~5 mA
    if (!s.powered) return
    const h = Math.max(0, Math.min(100, input.value ?? 30))
    const vreg = Math.min(3.3, vd('VCC', 'GND') - 0.1)
    s.ao = ((2.8 - 0.0155 * h) * vreg) / 3.3 + (s.n || 0)
    src('AOUT', 'GND', s.ao, 1000)
  },
  update: (ctx) => modulePower(ctx, 3.3, 5.5, 6.5),
  step({ s, invalidate, timeUs }) {
    if (timeUs % 20000 === 0 && s.powered) {
      s.n = noise(0.006)
      invalidate()
    }
  },
  output({ s, live, input }) {
    live.powered = !!s.powered && !s.damaged
    live.hum = input.value ?? 30
    live.ao = Math.round((s.ao ?? 0) * 1000) / 1000
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { vmax: 5.5 })
    if (!isC('AOUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue AOUT a uma entrada analógica (A0…A5).`, `${name}: connect AOUT to an analog input (A0…A5).`), parts: [part.id] })
  },
}
