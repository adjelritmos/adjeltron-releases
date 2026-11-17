// Fotorresistência: R = R10 · (lux/10)^(−γ), em paralelo com ~1 MΩ (escuro).
// Resposta com atraso: ~20 ms a escurecer→iluminar, ~30 ms ao contrário.
import { LDR_MODELS } from '../../../../../shared/parts/ldr.js'
import { dividerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

function target(lux, model) {
  const [r10, g] = LDR_MODELS[model] || LDR_MODELS.GL5528
  const rl = lux > 0 ? Math.max(60, r10 * Math.pow(lux / 10, -g)) : Infinity
  return 1 / (1 / rl + 1 / 1e6)
}

export default {
  type: 'ldr',
  stamp({ cond, s, input, cfg }) {
    cond('1', '2', 1 / (s.R ?? target(input.value ?? 300, cfg.model)))
  },
  step({ s, input, cfg, invalidate }) {
    const t = target(input.value ?? 300, cfg.model)
    if (s.R == null) s.R = t
    const tau = t < s.R ? 20 : 30
    const ln = Math.log(s.R) + (Math.log(t) - Math.log(s.R)) * (1 - Math.exp(-1 / tau))
    const next = Math.abs(ln - Math.log(t)) < 1e-4 ? t : Math.exp(ln)
    if (Math.abs(next - s.R) / s.R > 0.002) invalidate()
    s.R = next
  },
  output({ live, s, input }) {
    live.lux = input.value ?? 300
    live.ohms = Math.round(s.R ?? 0)
  },
  diagnose: (ctx) => dividerDiagnose(ctx, i18n.m('uma perna ao 5V, a outra ao pino analógico e 10 kΩ desse pino ao GND.', 'one leg to 5V, the other to the analog pin, and 10 kΩ from that pin to GND.')),
}
