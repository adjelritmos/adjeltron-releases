// Zener 5,1 V (1N4733A): direto como um díodo (0,7 V); inverso prende a 5,1 V à corrente de
// ensaio da folha de dados (Izt = 49 mA) com ~5 Ω de resistência dinâmica (máx. 7 Ω) — por isso
// o joelho do modelo fica em 5,1 V − 49 mA × 5 Ω ≈ 4,86 V (com poucos mA lê-se ~4,9 V, como no real). Duas junções em antiparalelo. Máx. 1 W.
import * as i18n from '../../../../../shared/i18n.js'
const RZ = 5
const VK = 5.1 - 0.049 * RZ
export default {
  type: 'zener',
  diodes: () => [
    { key: 'f', a: 'A', k: 'K', vf: 0.7, r: 0.5 },
    { key: 'z', a: 'K', k: 'A', vf: VK, r: RZ },
  ],
  step({ s, circuit, part, vd, live, log, burn }) {
    if (s.x_f) return
    const p = Math.abs(vd('A', 'K')) * (circuit.diodeCurrent(part, 'f') + circuit.diodeCurrent(part, 'z'))
    s.over = p > 1.2 ? (s.over || 0) + 1 : 0
    if (s.over > 800) {
      burn('f')
      burn('z')
      live.burned = true
      log(i18n.m(`💥 O zener queimou (${p.toFixed(1)} W; máx. 1 W). Ponha uma resistência em série para limitar a corrente.`, `💥 The zener burned out (${p.toFixed(1)} W; max 1 W). Put a series resistor to limit the current.`), 'error')
    }
  },
  output({ s, vd, live, circuit, part }) {
    live.v = Math.round(vd('K', 'A') * 100) / 100
    live.iz = s.x_f ? 0 : Math.round(circuit.diodeCurrent(part, 'z') * 1000) / 1000
  },
  diagnose({ part, isC, name, issues, vd }) {
    const un = ['A', 'K'].filter((x) => !isC(x))
    if (un.length === 1) issues.push({ level: 'info', msg: i18n.m(`${name}: perna ${un[0]} sem ligação.`, `${name}: leg ${un[0]} not connected.`), parts: [part.id] })
    const v = vd('K', 'A')
    const i = v > VK ? (v - VK) / RZ : v < -0.7 ? (-v - 0.7) / 0.5 : 0
    if (i * Math.abs(v) > 1) issues.push({ level: 'error', msg: i18n.m(`${name}: ~${(i * Math.abs(v)).toFixed(1)} W (máx. 1 W) — falta a resistência em série?`, `${name}: ~${(i * Math.abs(v)).toFixed(1)} W (max 1 W) — missing the series resistor?`), parts: [part.id] })
  },
}
