// Campainha ding-dong: bobina (resistência V²/P). Atrai o martelo acima de 60 % da tensão
// nominal ("ding") e larga-o abaixo de 40 % ("dong"). live.ding / live.dong contam as
// pancadas (o 3D toca o som e mexe o martelo quando mudam).
import { campTipo } from '../../../../../shared/parts/campainha.js'
import { directPinIssue } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'campainha',
  stamp({ cond, cfg }) {
    const t = campTipo(cfg)
    cond('1', '2', t.w / (t.v * t.v))
  },
  step({ s, cfg, vd }) {
    const t = campTipo(cfg)
    const v = Math.abs(vd('1', '2'))
    const on = v >= (s.on ? 0.4 : 0.6) * t.v
    if (on && !s.on) s.ding = (s.ding || 0) + 1
    if (!on && s.on) s.dong = (s.dong || 0) + 1
    s.on = on
  },
  output({ s, live }) {
    live.on = !!s.on
    live.ding = s.ding || 0
    live.dong = s.dong || 0
  },
  diagnose(ctx) {
    const { part, cfg, isC, name, issues } = ctx
    if (!isC('1') || !isC('2')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue um borne à alimentação (botão, relé ou transístor) e o outro ao GND.`, `${name}: connect one terminal to the supply (button, relay or transistor) and the other to GND.`), parts: [part.id] })
    const t = campTipo(cfg)
    directPinIssue(ctx, ['1', '2'], `${Math.round((t.w / t.v) * 1000)} mA`)
  },
}
