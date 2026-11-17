// Termístor NTC: R = R25 · exp(B · (1/T − 1/298,15)). A temperatura do próprio
// termístor segue a do ambiente com constante de tempo de ~1 s (massa térmica).
import { dividerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

const TAU_MS = 1000
const ohms = (t, cfg) => (cfg.r25 ?? 10000) * Math.exp((cfg.beta ?? 3950) * (1 / (t + 273.15) - 1 / 298.15))

export default {
  type: 'ntc',
  stamp({ cond, s, input, cfg }) {
    cond('1', '2', 1 / ohms(s.T ?? input.value ?? 25, cfg))
  },
  step({ s, input, invalidate }) {
    const amb = input.value ?? 25
    if (s.T == null) s.T = amb
    const next = s.T + (amb - s.T) * (1 - Math.exp(-1 / TAU_MS))
    if (Math.abs(next - (s.Tst ?? s.T)) > 0.02) {
      s.Tst = next
      invalidate()
    }
    s.T = Math.abs(next - amb) < 0.005 ? amb : next
  },
  output({ live, s, cfg, input }) {
    const t = s.T ?? input.value ?? 25
    live.temp = Math.round(t * 10) / 10
    live.ohms = Math.round(ohms(t, cfg))
  },
  diagnose: (ctx) => dividerDiagnose(ctx, i18n.m('5V → 10 kΩ → pino analógico, e o NTC desse pino ao GND.', '5V → 10 kΩ → analog pin, and the NTC from that pin to GND.')),
}
