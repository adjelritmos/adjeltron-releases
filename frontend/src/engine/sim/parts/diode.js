// Díodo retificador 1N4007: uma junção (0,7 V, 0,1 Ω). 1 A em contínuo, 30 A de pico.
import * as i18n from '../../../../../shared/i18n.js'
export default {
  type: 'diode',
  diodes: () => [{ key: 'd', a: 'A', k: 'K', vf: 0.7, r: 0.1 }],
  step({ s, circuit, part, live, log, burn }) {
    if (s.x_d) return
    const i = circuit.diodeCurrent(part, 'd')
    s.over = i > 1.5 ? (s.over || 0) + (i > 30 ? 1000 : 1) : 0
    if (s.over > 1000) {
      burn('d')
      live.burned = true
      log(i18n.m(`💥 O díodo 1N4007 queimou (${i.toFixed(1)} A; máx. 1 A). Está diretamente aos terminais da bateria?`, `💥 The 1N4007 diode burned out (${i.toFixed(1)} A; max 1 A). Is it directly across the battery terminals?`), 'error')
    }
  },
  output({ live, avgCurrent, s }) {
    live.i = s.x_d ? 0 : Math.round(Math.max(0, avgCurrent('d')) * 1000) / 1000
  },
  diagnose({ part, isC, name, issues, vd }) {
    const un = ['A', 'K'].filter((x) => !isC(x))
    if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name}: perna ${un[0]} sem ligação.`, `${name}: leg ${un[0]} not connected.`), parts: [part.id] })
    const i = (vd('A', 'K') - 0.7) / 0.1
    if (i > 2) issues.push({ level: 'error', msg: i18n.m(`${name} em condução direta com ~${Math.min(99, i).toFixed(0)} A: está montado ao contrário? Como díodo de proteção (flyback) o cátodo (risco) vai ao +.`, `${name} forward-conducting ~${Math.min(99, i).toFixed(0)} A: is it mounted backwards? As a protection (flyback) diode the cathode (stripe) goes to +.`), parts: [part.id] })
  },
}
