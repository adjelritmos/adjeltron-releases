// LiPo 2S 2200 mAh: fonte Thévenin (2 células, ~30 mΩ) que descarrega com a corrente (como a
// LiPo 3S: kind 'lipo', curto-circuito detetado aqui acima de 100 A).
import { lipoCellVoltage } from '../../../../../shared/parts/lipo3s.js'
import { LIPO2 } from '../../../../../shared/parts/bateriaLipo2s.js'
import * as i18n from '../../../../../shared/i18n.js'

const charge = (cfg, s) => (cfg.charge ?? 100) - ((s.usedAh || 0) / (LIPO2.mAh / 1000)) * 100
const ocv = (cfg, s) => LIPO2.cells * lipoCellVoltage(charge(cfg, s))

export default {
  type: 'bateriaLipo2s',
  stamp({ cfg, s, src }) {
    src('+', '-', ocv(cfg, s), LIPO2.rint, { kind: 'lipo' })
  },
  step({ cfg, s, vd, dt, live, log }) {
    const v = vd('+', '-')
    const i = (ocv(cfg, s) - v) / LIPO2.rint
    s.i = i
    s.usedAh = (s.usedAh || 0) + (Math.max(0, i) * dt) / 3600
    if (i > 100) {
      s.short = (s.short || 0) + 1
      if (s.short === 50) log(i18n.m(`✖ Curto-circuito na LiPo 2S (${i.toFixed(0)} A)! Numa LiPo real os fios derretem e a bateria pode incendiar-se.`, `✖ Short circuit on the 2S LiPo (${i.toFixed(0)} A)! On a real LiPo the wires melt and the battery may catch fire.`), 'error')
    } else s.short = 0
    const cell = v / LIPO2.cells
    if (cell < 3.3 && cell > 1 && !s.warnedLow) {
      s.warnedLow = true
      log(i18n.m(`⚠ LiPo 2S a ${cell.toFixed(2)} V por célula (com carga): abaixo de 3,3 V a bateria estraga-se — desligue e carregue-a.`, `⚠ 2S LiPo at ${cell.toFixed(2)} V per cell (under load): below 3.3 V the battery gets damaged — disconnect and charge it.`), 'warn')
    }
    live.hot = s.short > 50
  },
  output({ cfg, s, vd, live }) {
    const v = vd('+', '-')
    live.v = Math.round(v * 100) / 100
    live.i = Math.round((s.i || 0) * 100) / 100
    live.cell = Math.round((v / LIPO2.cells) * 100) / 100
    live.charge = Math.max(0, Math.round(charge(cfg, s) * 10) / 10)
  },
  diagnose({ part, cfg, isC, vd, name, issues }) {
    const i = (ocv(cfg, {}) - vd('+', '-')) / LIPO2.rint
    if (i > 100) issues.push({ level: 'error', short: true, msg: i18n.m(`Curto-circuito na ${name}: ${i.toFixed(0)} A! Uma LiPo em curto pode incendiar-se. Verifique as ligações + e −.`, `Short circuit on ${name}: ${i.toFixed(0)} A! A shorted LiPo can catch fire. Check the + and − connections.`), parts: [part.id] })
    if (!isC('+') || !isC('-')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue a ficha (+ vermelho, − preto) a um regulador de 5–6 V para os servos e ao VIN da placa.`, `${name}: connect the plug (+ red, − black) to a 5–6 V regulator for the servos and to the board's VIN.`), parts: [part.id] })
    if ((cfg.charge ?? 100) < 20) issues.push({ level: 'warn', msg: i18n.m(`${name} quase vazia (${cfg.charge} %): uma LiPo não deve descer abaixo de ~3,5 V por célula em repouso.`, `${name} almost empty (${cfg.charge} %): a LiPo should not drop below ~3.5 V per cell at rest.`), parts: [part.id] })
  },
}
