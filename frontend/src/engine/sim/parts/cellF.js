// Pilha AA e pilha-botão CR2032: fonte Thévenin (tensão em vazio conforme a carga + resistência
// interna). A CR2032 tem resistência interna alta que sobe quando está gasta — a tensão cai a
// pique com cargas acima de alguns mA (aviso no monitor).
import CELL_DEFS, { aaVoltage, coinVoltage } from '../../../../../shared/parts/cellF.js'
import * as i18n from '../../../../../shared/i18n.js'

function behavior(def) {
  const m = def.cell
  const coin = m.kind === 'coin'
  const voc = (cfg) => (coin ? coinVoltage : aaVoltage)(cfg.charge ?? 90)
  // a resistência interna cresce quando a pilha se gasta
  const rint = (cfg) => m.rint * (1 + 2.5 * Math.pow(1 - (cfg.charge ?? 90) / 100, 2))
  const cur = (cfg, vd) => (voc(cfg) - vd('+', '-')) / rint(cfg)
  return {
    type: def.type,
    stamp({ cfg, src }) {
      src('+', '-', voc(cfg), rint(cfg), { kind: coin ? 'cell' : 'bat' })
    },
    step({ cfg, s, vd, live, log }) {
      const i = cur(cfg, vd)
      s.i = i
      s.over = i > m.imax ? (s.over || 0) + 1 : 0
      if (s.over === 500 && !s.warned) {
        s.warned = true
        log(
          coin
            ? i18n.m(`⚠ A CR2032 está a dar ${(i * 1000).toFixed(0)} mA: a tensão caiu para ${vd('+', '-').toFixed(2)} V (resistência interna ~${rint(cfg).toFixed(0)} Ω). Uma pilha-botão só aguenta poucos mA — e esgota-se em horas.`, `⚠ The CR2032 is supplying ${(i * 1000).toFixed(0)} mA: the voltage dropped to ${vd('+', '-').toFixed(2)} V (internal resistance ~${rint(cfg).toFixed(0)} Ω). A coin cell only handles a few mA — and drains in hours.`)
            : i18n.m(`⚠ A pilha AA está a dar ${i.toFixed(1)} A (${vd('+', '-').toFixed(2)} V): aquece e esgota-se em minutos. Curto-circuito?`, `⚠ The AA cell is supplying ${i.toFixed(1)} A (${vd('+', '-').toFixed(2)} V): it heats up and drains in minutes. Short circuit?`),
          'warn',
        )
      }
      live.hot = !coin && i > 4
    },
    output({ cfg, s, vd, live }) {
      live.v = Math.round(vd('+', '-') * 100) / 100
      live.i = Math.round((s.i ?? cur(cfg, vd)) * 10000) / 10000
    },
    diagnose({ part, cfg, isC, name, issues, vd }) {
      if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue o + e o −.`, `${name}: connect + and −.`), parts: [part.id] })
      const i = cur(cfg, vd)
      if (coin && i > m.imax * 2) issues.push({ level: 'warn', msg: i18n.m(`${name}: a carga pede ~${(i * 1000).toFixed(0)} mA — a tensão cai para ${vd('+', '-').toFixed(1)} V. Uma CR2032 só serve para poucos mA (RTC, sensores em repouso, um LED).`, `${name}: the load draws ~${(i * 1000).toFixed(0)} mA — the voltage drops to ${vd('+', '-').toFixed(1)} V. A CR2032 is only good for a few mA (RTC, idle sensors, one LED).`), parts: [part.id] })
      if (!coin && i > 6) issues.push({ level: 'error', short: true, msg: i18n.m(`Curto-circuito na ${name}: ${i.toFixed(0)} A! Verifique as ligações + e −.`, `Short circuit on ${name}: ${i.toFixed(0)} A! Check the + and − connections.`), parts: [part.id] })
    },
  }
}

export default CELL_DEFS.map(behavior)
