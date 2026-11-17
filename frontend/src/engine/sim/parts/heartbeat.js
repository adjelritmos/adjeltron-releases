// Sensor de pulso (fotopletismografia): OUT = VCC/2 + onda com um pico por batimento.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

// forma de onda de um batimento (fase 0..1): pico sistólico + onda dicrótica
function ppg(ph) {
  const g = (x, m, w) => Math.exp(-(((x - m) / w) ** 2))
  return g(ph, 0.12, 0.06) + 0.35 * g(ph, 0.38, 0.07) - 0.12
}

export default {
  type: 'heartbeat',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 0.004 / 5)
    if (s.powered) src('OUT', 'GND', (s.frac ?? 0.5) * vd('VCC', 'GND'), 470)
  },
  update: (ctx) => modulePower(ctx, 3.0, 5.6, 6.5),
  step({ s, input, invalidate }) {
    const bpm = input.value ?? 72
    let f = 0.5
    if (bpm > 0) {
      s.ph = ((s.ph ?? 0) + bpm / 60 / 1000) % 1
      s.beat = Math.max(0, ppg(s.ph))
      f = 0.5 + 0.16 * ppg(s.ph)
    } else s.beat = 0
    if (Math.abs(f - (s.frac ?? 0.5)) > 0.001) {
      s.frac = f
      invalidate()
    }
  },
  output({ s, live, input }) {
    live.powered = !!s.powered && !s.damaged
    live.beat = live.powered ? Math.round((s.beat ?? 0) * 100) / 100 : 0
    live.bpm = input.value ?? 72
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx)
    if (!isC('OUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue OUT a uma entrada analógica (A0).`, `${name}: connect OUT to an analog input (A0).`), parts: [part.id] })
  },
}
