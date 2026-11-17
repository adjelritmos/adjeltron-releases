// Display de 7 segmentos × 4 dígitos (multiplexado): 32 junções LED, segmento a–g/dp
// de cada dígito entre o pino do segmento e o comum do dígito (DIG1–DIG4).
// O brilho é a corrente MÉDIA de cada junção numa janela (~16 ms), como o olho vê:
// com multiplexagem cada dígito só está aceso 1/4 do tempo.
import { VF, missingResistor } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const SEGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP']
const DIGS = ['DIG1', 'DIG2', 'DIG3', 'DIG4']
const KEYS = DIGS.flatMap((_, d) => SEGS.map((g) => `${d}${g}`))

export default {
  type: 'sevenseg4',
  diodes: (p) => {
    const vf = VF[p.config?.color] ?? 1.9
    const anode = p.config?.common === 'anode'
    return DIGS.flatMap((dg, d) => SEGS.map((g) => ({ key: `${d}${g}`, a: anode ? dg : g, k: anode ? g : dg, vf, r: 15 })))
  },
  step({ part, s, circuit, log }) {
    if (!s.acc) Object.assign(s, { acc: new Float64Array(32), n: 0, over: new Float64Array(32) })
    for (let i = 0; i < 32; i++) {
      const c = circuit.diodeCurrent(part, KEYS[i])
      s.acc[i] += Math.max(0, c)
      s.over[i] = c > 0.06 ? s.over[i] + 1 : 0
      if (s.over[i] === 300 && !s.warnedI) {
        s.warnedI = true
        log(i18n.m(`⚠ Display de 4 dígitos: ${(c * 1000).toFixed(0)} mA num segmento — falta a resistência de 220 Ω em série com cada segmento.`, `⚠ 4-digit display: ${(c * 1000).toFixed(0)} mA on a segment — the 220 Ω series resistor on each segment is missing.`), 'warn')
      }
    }
    s.n++
  },
  output({ s, live }) {
    if (!s.acc || !s.n) return
    // ≈ 4 mA de média já parece aceso (12–15 mA com 1/4 do tempo)
    live.seg = DIGS.map((_, d) => SEGS.map((_, g) => Math.round(Math.min(1, s.acc[d * 8 + g] / s.n / 0.004) * 100) / 100))
    s.acc.fill(0)
    s.n = 0
  },
  diagnose({ part, cfg, nets, parts, isC, name, issues }) {
    const anode = cfg.common === 'anode'
    const digs = DIGS.filter((p) => isC(p))
    const segs = SEGS.filter((p) => isC(p))
    if (!digs.length || !segs.length) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DIG1–DIG4 a 4 pinos (${anode ? 'HIGH' : 'LOW'} acende o dígito) e A–G/DP a pinos com 220 Ω cada (${anode ? 'LOW' : 'HIGH'} acende o segmento).`, `${name}: connect DIG1–DIG4 to 4 pins (${anode ? 'HIGH' : 'LOW'} lights the digit) and A–G/DP to pins with 220 Ω each (${anode ? 'LOW' : 'HIGH'} lights the segment).`), parts: [part.id] })
    const bad = missingResistor(nets, parts, part, segs, [])
    if (bad.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: segmento(s) ${bad.join(', ')} sem resistência em série — ponha 220 Ω em cada segmento (não nos comuns, senão o brilho muda com o número de segmentos acesos).`, `${name}: segment(s) ${bad.join(', ')} without a series resistor — put 220 Ω on each segment (not on the commons, otherwise the brightness changes with the number of lit segments).`), parts: [part.id] })
  },
}
