// Televisão: resistência equivalente V²/P. Liga acima de 75 % da tensão nominal (desliga
// abaixo de 65 %: a fonte entra em proteção). Ao ligar mostra o logótipo durante 1,2 s.
import { tvTipo } from '../../../../../shared/parts/televisao.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'televisao',
  stamp({ cond, cfg }) {
    const t = tvTipo(cfg)
    cond('1', '2', t.w / (t.v * t.v))
  },
  step({ s, cfg, vd, dt, log }) {
    const t = tvTipo(cfg)
    const v = Math.abs(vd('1', '2'))
    const on = v >= (s.on ? 0.65 : 0.75) * t.v
    if (on && !s.on) s.ligadaMs = 0
    s.on = on
    if (on) s.ligadaMs = (s.ligadaMs || 0) + dt * 1000
    s.overMs = v > 1.4 * t.v ? (s.overMs || 0) + 1 : 0
    if (s.overMs > 300 && !s._warn) {
      s._warn = true
      log(i18n.m(`⚠ Televisão com ${v.toFixed(1)} V (nominal ${t.v} V): a fonte pode queimar.`, `⚠ Television at ${v.toFixed(1)} V (rated ${t.v} V): the power supply may burn out.`), 'warn')
    }
  },
  output({ s, live, cfg, vd }) {
    const t = tvTipo(cfg)
    live.on = !!s.on
    live.boot = s.on ? round(Math.min(1, (s.ligadaMs || 0) / 1200), 100) : 0
    live.i = round(Math.abs(vd('1', '2')) * (t.w / (t.v * t.v)))
  },
  diagnose(ctx) {
    const { part, cfg, isC, name, issues } = ctx
    if (!isC('1') || !isC('2')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um borne à alimentação (pelo relé ou transístor) e o outro ao GND.`, `${name}: connect one terminal to the supply (through the relay or transistor) and the other to GND.`), parts: [part.id] })
    const t = tvTipo(cfg)
    directPinIssue(ctx, ['1', '2'], `${Math.round((t.w / t.v) * 1000)} mA`)
  },
}
