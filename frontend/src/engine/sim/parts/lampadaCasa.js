// Candeeiro/lâmpada da casa: resistência fixa R = V²/P entre os bornes 1 e 2. O brilho é a
// potência relativa (P/Pnominal), em média desde a última fotografia (com PWM fica a média).
// Acima de 1,5× a tensão nominal durante 30 ms o filamento/driver funde (circuito aberto).
import { lampTipo } from '../../../../../shared/parts/lampadaCasa.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'lampadaCasa',
  stamp({ cond, s, cfg }) {
    const t = lampTipo(cfg)
    cond('1', '2', s.fundida ? 1e-12 : t.w / (t.v * t.v))
  },
  step({ s, cfg, vd, log, invalidate }) {
    const t = lampTipo(cfg)
    const v = s.fundida ? 0 : Math.abs(vd('1', '2'))
    s.sumB = (s.sumB || 0) + (v / t.v) ** 2
    s.nB = (s.nB || 0) + 1
    s.overMs = v > 1.5 * t.v ? (s.overMs || 0) + 1 : 0
    if (s.overMs >= 30 && !s.fundida) {
      s.fundida = true
      log(i18n.m(`💥 Lâmpada fundida: ${v.toFixed(1)} V numa lâmpada de ${t.v} V (máx. ~${(1.5 * t.v).toFixed(1).replace('.', ',')} V).`, `💥 Lamp burned out: ${v.toFixed(1)} V on a ${t.v} V lamp (max ~${(1.5 * t.v).toFixed(1)} V).`), 'error')
      invalidate()
    }
  },
  output({ s, live, cfg, vd }) {
    const t = lampTipo(cfg)
    const b = s.nB ? s.sumB / s.nB : (Math.abs(vd('1', '2')) / t.v) ** 2
    s.sumB = 0
    s.nB = 0
    live.b = round(s.fundida ? 0 : Math.min(2.25, b), 100)
    live.w = round(live.b * t.w, 100)
    live.fundida = !!s.fundida
  },
  diagnose(ctx) {
    const { part, cfg, isC, name, issues } = ctx
    if (!isC('1') || !isC('2')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um borne à alimentação (pelo relé ou transístor) e o outro ao GND.`, `${name}: connect one terminal to the supply (through the relay or transistor) and the other to GND.`), parts: [part.id] })
    const t = lampTipo(cfg)
    directPinIssue(ctx, ['1', '2'], `${Math.round((t.w / t.v) * 1000)} mA`)
  },
}
