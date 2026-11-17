// Condensador cerâmico: o mesmo modelo companheiro do eletrolítico (capacitor.js) mas sem
// polaridade, sem limite de corrente e com 50 V de tensão máxima.
import { CER_VALUES } from '../../../../../shared/parts/ceramicCap.js'
import * as i18n from '../../../../../shared/i18n.js'

const DT = 0.001
const ESR = 0.05
const VMAX = 50
const capF = (cfg) => (cfg.pF ?? 100000) * 1e-12
const rOf = (cfg) => DT / capF(cfg) + ESR
const label = (cfg) => (CER_VALUES.find((v) => v[0] === (cfg.pF ?? 100000)) || CER_VALUES[5])[2]

export default {
  type: 'ceramicCap',
  stamp({ s, cfg, src }) {
    if (!s.started || s.cracked) return
    src('1', '2', s.vc || 0, rOf(cfg))
  },
  step({ s, cfg, vd, live, log, invalidate }) {
    if (s.cracked) return
    if (!s.started) {
      s.started = true
      s.vc = 0
      invalidate()
      return
    }
    const i = (vd('1', '2') - s.vc) / rOf(cfg)
    const nv = s.vc + (i * DT) / capF(cfg)
    if (Math.abs(nv - s.vc) > 1e-5) invalidate()
    s.vc = nv
    s.ovr = Math.abs(nv) > VMAX * 2 ? (s.ovr || 0) + 1 : 0
    if (s.ovr > 50) {
      s.cracked = true
      live.burst = true
      invalidate()
      log(i18n.m(`💥 O condensador cerâmico de ${label(cfg)} partiu-se: ${Math.abs(nv).toFixed(0)} V (máx. ${VMAX} V).`, `💥 The ${label(cfg)} ceramic capacitor cracked: ${Math.abs(nv).toFixed(0)} V (max ${VMAX} V).`), 'error')
    }
  },
  output({ s, live }) {
    live.v = Math.round((s.vc || 0) * 1000) / 1000
    live.burst = !!s.cracked
  },
  diagnose({ part, isC, name, issues, vd }) {
    const un = ['1', '2'].filter((x) => !isC(x))
    if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name}: terminal ${un[0]} sem ligação.`, `${name}: terminal ${un[0]} not connected.`), parts: [part.id] })
    if (Math.abs(vd('1', '2')) > VMAX) issues.push({ level: 'error', msg: i18n.m(`${name}: ${Math.abs(vd('1', '2')).toFixed(0)} V (máx. ${VMAX} V).`, `${name}: ${Math.abs(vd('1', '2')).toFixed(0)} V (max ${VMAX} V).`), parts: [part.id] })
  },
}
