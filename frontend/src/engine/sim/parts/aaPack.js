// Suporte de 4 pilhas AA (alcalinas: 6 V, ~0,4 Ω no total; NiMH: ~4,8–5,5 V, ~0,15 Ω).
// Curto-circuito (> 6 A) detetado pelo motor geral.
import { aaPackVoltage, AA_RINT } from '../../../../../shared/parts/aaPack.js'
import * as i18n from '../../../../../shared/i18n.js'

const pilhasOf = (cfg) => (cfg.pilhas === 'nimh' ? 'nimh' : 'alcalinas')
const vOf = (cfg) => aaPackVoltage(cfg.charge ?? 90, pilhasOf(cfg))

export default {
  type: 'aaPack',
  stamp({ cfg, src }) {
    src('+', '-', vOf(cfg), AA_RINT[pilhasOf(cfg)], { kind: 'bat' })
  },
  output({ cfg, vd, live }) {
    live.v = Math.round(vd('+', '-') * 100) / 100
    live.i = Math.round(((vOf(cfg) - vd('+', '-')) / AA_RINT[pilhasOf(cfg)]) * 1000) / 1000
  },
  diagnose({ part, isC, name, issues }) {
    if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os dois fios (+ vermelho, − preto).`, `${name}: connect both wires (+ red, − black).`), parts: [part.id] })
  },
}
