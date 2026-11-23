// Campainha ding-dong: bobina (resistência V²/P). Atrai o martelo acima de 60 % da tensão
// nominal ("ding") e larga-o abaixo de 40 % ("dong"), se a tensão se mantiver ~10 ms. live.ding / live.dong contam as
// pancadas (o 3D toca o som e mexe o martelo quando mudam).
import { campTipo } from '../../../../../shared/parts/campainha.js'
import { directPinIssue } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

const MOVE_MS = 10

export default {
  type: 'campainha',
  stamp({ cond, cfg }) {
    const t = campTipo(cfg)
    cond('1', '2', t.w / (t.v * t.v))
  },
  step({ s, cfg, vd }) {
    const t = campTipo(cfg)
    const v = Math.abs(vd('1', '2'))
    const want = v >= (s.on ? 0.4 : 0.6) * t.v
    // o núcleo/martelo tem inércia (~10 ms de curso): os ressaltos de 1–2 ms do botão não dão pancadas
    s.moveMs = want !== !!s.on ? (s.moveMs || 0) + 1 : 0
    if (s.moveMs < MOVE_MS) return
    s.moveMs = 0
    if (want) s.ding = (s.ding || 0) + 1
    else s.dong = (s.dong || 0) + 1
    s.on = want
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
