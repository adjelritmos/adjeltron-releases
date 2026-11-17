// Bobina: modelo companheiro de Euler implícito com dt = 1 ms. Em série: resistência do fio
// (DCR) + L. i(n+1) = (v12 + (L/dt)·i(n)) / (DCR + L/dt) → fonte Thévenin src(2, 1, (L/dt)·i,
// DCR + L/dt). Em paralelo ~1 kΩ (perdas do núcleo/capacidade entre espiras): ao cortar a
// corrente de repente aparece o pico de tensão i × 1 kΩ (como no real, sem díodo de roda
// livre). Acima da corrente de saturação a indutância cai para 1/10.
// Diagnóstico estático (antes do 1.º passo): em contínuo é só a resistência do fio.
import { indSpec } from '../../../../../shared/parts/inductor.js'
import { diodeAcross } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const DT = 0.001
const GP = 1e-3

const spec = (cfg) => {
  const [uH, dcr, isat] = indSpec(cfg.uH ?? 1000)
  return { L: uH * 1e-6, dcr, isat }
}
const Leff = (s, sp) => (Math.abs(s.il || 0) > sp.isat ? sp.L * 0.1 : sp.L)

export default {
  type: 'inductor',
  stamp({ s, cfg, src, cond }) {
    const sp = spec(cfg)
    cond('1', '2', GP)
    if (!s.started) return cond('1', '2', 1 / sp.dcr)
    const lr = Leff(s, sp) / DT
    src('2', '1', lr * (s.il || 0), sp.dcr + lr)
  },
  step({ s, cfg, vd, live, log, invalidate }) {
    const sp = spec(cfg)
    if (!s.started) {
      s.started = true
      s.il = 0
      invalidate()
      return
    }
    const lr = Leff(s, sp) / DT
    const v = vd('1', '2')
    const ni = (v + lr * (s.il || 0)) / (sp.dcr + lr)
    if (Math.abs(ni - (s.il || 0)) > 1e-6) invalidate()
    s.il = ni
    s.v = v
    if (Math.abs(v) > 30) {
      s.spike = Math.max(s.spike || 0, Math.abs(v))
      if (!s.warnedSpike) {
        s.warnedSpike = true
        log(i18n.m(`⚡ Pico de ${Math.abs(v).toFixed(0)} V na bobina ao cortar a corrente! Sem díodo de roda livre (1N4007/1N5819 em paralelo, cátodo no +) este pico estraga o transístor que a comanda.`, `⚡ ${Math.abs(v).toFixed(0)} V spike on the coil when cutting the current! Without a flyback diode (1N4007/1N5819 in parallel, cathode to +) this spike damages the transistor driving it.`), 'warn')
      }
    }
    if (Math.abs(ni) > sp.isat * 1.05 && !s.warnedSat) {
      s.warnedSat = true
      log(i18n.m(`⚠ A bobina saturou: ${Math.abs(ni * 1000).toFixed(0)} mA, acima dos ${(sp.isat * 1000).toFixed(0)} mA de saturação — o núcleo deixa de "guardar" energia e a indutância cai muito.`, `⚠ The inductor saturated: ${Math.abs(ni * 1000).toFixed(0)} mA, above the ${(sp.isat * 1000).toFixed(0)} mA saturation current — the core stops "storing" energy and the inductance drops sharply.`), 'warn')
    }
  },
  output({ s, live }) {
    live.i = Math.round((s.il || 0) * 10000) / 10000
    live.v = Math.round((s.v || 0) * 100) / 100
    live.sat = !!s.warnedSat
  },
  diagnose({ part, cfg, isC, name, issues, vd, nets }) {
    const un = ['1', '2'].filter((x) => !isC(x))
    if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name}: terminal ${un[0]} sem ligação.`, `${name}: terminal ${un[0]} not connected.`), parts: [part.id] })
    const sp = spec(cfg)
    const i = Math.abs(vd('1', '2')) / sp.dcr
    if (i > sp.isat * 1.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: em contínuo passam ~${i >= 1 ? `${i.toFixed(1)} A` : `${(i * 1000).toFixed(0)} mA`} (é só fio: ${sp.dcr} Ω) — acima da saturação (${(sp.isat * 1000).toFixed(0)} mA) e aquece. Falta uma resistência em série?`, `${name}: at DC about ${i >= 1 ? `${i.toFixed(1)} A` : `${(i * 1000).toFixed(0)} mA`} flows (it is just wire: ${sp.dcr} Ω) — above saturation (${(sp.isat * 1000).toFixed(0)} mA) and it heats up. Missing a series resistor?`), parts: [part.id] })
    const a = nets.netOf(part.id, '1')
    const b = nets.netOf(part.id, '2')
    const switched = [a, b].some((n) => nets.partsOnNet(n).some((q) => /npn|mosfet|bc5|2n|fet|irf|fqp|pwr2n/i.test(q.type)))
    if (switched && !diodeAcross(nets, a, b)) issues.push({ level: 'info', msg: i18n.m(`${name}: comandada por um transístor e sem díodo de roda livre em paralelo — ao desligar aparece um pico de tensão alto.`, `${name}: driven by a transistor and without a parallel flyback diode — turning it off produces a high voltage spike.`), parts: [part.id] })
  },
}
