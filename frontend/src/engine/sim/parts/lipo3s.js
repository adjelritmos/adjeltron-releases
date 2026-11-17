// LiPo 3S 1500 mAh: fonte Thévenin (3 células, ~25 mΩ) que descarrega com a corrente.
// A fonte usa kind 'lipo' (e não 'bat') porque um drone puxa legitimamente 10–40 A;
// o curto-circuito é detetado aqui (> 120 A).
import { lipoCellVoltage, LIPO } from '../../../../../shared/parts/lipo3s.js'
import * as i18n from '../../../../../shared/i18n.js'

const ocv = (cfg, s) => LIPO.cells * lipoCellVoltage((cfg.charge ?? 100) - ((s.usedAh || 0) / (LIPO.mAh / 1000)) * 100)

export default {
  type: 'lipo3s',
  stamp({ cfg, s, src }) {
    src('+', '-', ocv(cfg, s), LIPO.rint, { kind: 'lipo' })
  },
  step({ cfg, s, vd, dt, live, log }) {
    const v = vd('+', '-')
    const i = (ocv(cfg, s) - v) / LIPO.rint
    s.i = i
    s.usedAh = (s.usedAh || 0) + (Math.max(0, i) * dt) / 3600
    if (i > 120) {
      s.short = (s.short || 0) + 1
      if (s.short === 50) log(i18n.m(`✖ Curto-circuito na LiPo (${i.toFixed(0)} A)! Numa LiPo real os fios derretem e a bateria pode incendiar-se.`, `✖ Short circuit on the LiPo (${i.toFixed(0)} A)! On a real LiPo the wires melt and the battery may catch fire.`), 'error')
    } else s.short = 0
    const cell = v / LIPO.cells
    if (cell < 3.3 && cell > 1 && !s.warnedLow) {
      s.warnedLow = true
      log(i18n.m(`⚠ LiPo a ${cell.toFixed(2)} V por célula (com carga): abaixo de 3,3 V a bateria estraga-se — aterre e carregue-a.`, `⚠ LiPo at ${cell.toFixed(2)} V per cell (under load): below 3.3 V the battery gets damaged — land and charge it.`), 'warn')
    }
    live.hot = s.short > 50
  },
  output({ cfg, s, vd, live }) {
    const v = vd('+', '-')
    live.v = Math.round(v * 100) / 100
    live.i = Math.round((s.i || 0) * 10) / 10
    live.cell = Math.round((v / LIPO.cells) * 100) / 100
    live.charge = Math.max(0, Math.round(((cfg.charge ?? 100) - ((s.usedAh || 0) / (LIPO.mAh / 1000)) * 100) * 10) / 10)
  },
  diagnose({ part, cfg, isC, vd, name, issues }) {
    const i = (ocv(cfg, {}) - vd('+', '-')) / LIPO.rint
    if (i > 120) issues.push({ level: 'error', short: true, msg: i18n.m(`Curto-circuito na ${name}: ${i.toFixed(0)} A! Uma LiPo em curto pode incendiar-se. Verifique as ligações + e −.`, `Short circuit on ${name}: ${i.toFixed(0)} A! A shorted LiPo can catch fire. Check the + and − connections.`), parts: [part.id] })
    if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue a ficha XT60 (+ vermelho, − preto) aos ESC.`, `${name}: connect the XT60 plug (+ red, − black) to the ESCs.`), parts: [part.id] })
    if ((cfg.charge ?? 100) < 20) issues.push({ level: 'warn', msg: i18n.m(`${name} quase vazia (${cfg.charge} %): uma LiPo não deve descer abaixo de ~3,5 V por célula em repouso.`, `${name} almost empty (${cfg.charge} %): a LiPo should not drop below ~3.5 V per cell at rest.`), parts: [part.id] })
  },
}
