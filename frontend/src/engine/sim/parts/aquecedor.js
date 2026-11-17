// Aquecedor de quartzo: resistência R = V²/P entre os bornes 1 e 2. O brilho dos tubos segue
// a potência relativa (P/Pnominal, média com PWM) com inércia térmica τ ≈ 1,5 s. Acima de
// 1,5× a tensão nominal durante 50 ms a resistência funde (circuito aberto).
import { aqTipo } from '../../../../../shared/parts/aquecedor.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'aquecedor',
  stamp({ cond, s, cfg }) {
    const t = aqTipo(cfg)
    cond('1', '2', s.fundido ? 1e-12 : t.w / (t.v * t.v))
  },
  step({ s, cfg, vd, dt, log, invalidate }) {
    const t = aqTipo(cfg)
    const v = s.fundido ? 0 : Math.abs(vd('1', '2'))
    const p = (v / t.v) ** 2
    s.heat = (s.heat || 0) + (p - (s.heat || 0)) * Math.min(1, dt / 1.5)
    s.overMs = v > 1.5 * t.v ? (s.overMs || 0) + 1 : 0
    if (s.overMs >= 50 && !s.fundido) {
      s.fundido = true
      log(i18n.m(`💥 Aquecedor fundido: ${v.toFixed(1)} V numa resistência de ${t.v} V.`, `💥 Heater burned out: ${v.toFixed(1)} V on a ${t.v} V element.`), 'error')
      invalidate()
    }
  },
  output({ s, live, cfg, vd }) {
    const t = aqTipo(cfg)
    live.g = round(s.fundido ? 0 : Math.min(2.25, s.heat || 0), 100)
    live.w = round(s.fundido ? 0 : (Math.abs(vd('1', '2')) ** 2 * t.w) / (t.v * t.v), 100)
    live.fundido = !!s.fundido
  },
  diagnose(ctx) {
    const { part, cfg, isC, name, issues } = ctx
    if (!isC('1') || !isC('2')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um borne à alimentação (pelo relé ou MOSFET) e o outro ao GND.`, `${name}: connect one terminal to the supply (through the relay or MOSFET) and the other to GND.`), parts: [part.id] })
    const t = aqTipo(cfg)
    directPinIssue(ctx, ['1', '2'], `${Math.round((t.w / t.v) * 1000)} mA`)
  },
}
