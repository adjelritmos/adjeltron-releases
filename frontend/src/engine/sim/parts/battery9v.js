// Pilha de 9 V: fonte Thévenin com resistência interna ~1,5 Ω.
import { battery9vVoltage } from '../../../../../shared/parts/battery9v.js'
import * as i18n from '../../../../../shared/i18n.js'

const RINT = 1.5

export default {
  type: 'battery9v',
  stamp({ cfg, src }) {
    src('+', '-', battery9vVoltage(cfg.charge ?? 90), RINT, { kind: 'bat' })
  },
  step({ cfg, s, vd, live, log }) {
    const i = (battery9vVoltage(cfg.charge ?? 90) - vd('+', '-')) / RINT
    s.i = i
    // a pilha de 9 V dá no máx. ~6 A em curto: a deteção geral (> 6 A) quase nunca a apanha
    s.short = i > 3 ? (s.short || 0) + 1 : 0
    if (s.short === 300) log(i18n.m(`✖ Curto-circuito na pilha de 9 V (${i.toFixed(1)} A): vai aquecer e esgotar-se em minutos. Verifique as ligações + e −.`, `✖ Short circuit on the 9 V battery (${i.toFixed(1)} A): it will heat up and drain in minutes. Check the + and − connections.`), 'error')
    live.hot = s.short > 300
  },
  output({ s, vd, live }) {
    live.v = Math.round(vd('+', '-') * 100) / 100
    live.i = Math.round((s.i || 0) * 1000) / 1000
  },
  diagnose({ part, cfg, isC, name, issues, vd }) {
    const i = (battery9vVoltage(cfg.charge ?? 90) - vd('+', '-')) / RINT
    if (i > 3 && i <= 6) issues.push({ level: 'error', short: true, msg: i18n.m(`Curto-circuito na ${name}: ${i.toFixed(1)} A! A pilha aqueceria. Verifique as ligações + e −.`, `Short circuit on ${name}: ${i.toFixed(1)} A! The battery would heat up. Check the + and − connections.`), parts: [part.id] })
    if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os dois fios (+ vermelho, − preto).`, `${name}: connect both wires (+ red, − black).`), parts: [part.id] })
  },
}
