// Barra de 10 LEDs: 10 junções Ai → Ki independentes.
import { VF, missingResistor } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const N = 10
const IDX = Array.from({ length: N }, (_, i) => i + 1)
// versão "mista": 5 verdes, 3 amarelos, 2 vermelhos
const MIXED = ['green', 'green', 'green', 'green', 'green', 'yellow', 'yellow', 'yellow', 'red', 'red']
export const barColor = (cfg, i) => (cfg?.color === 'mixed' ? MIXED[i] : cfg?.color || 'red')

export default {
  type: 'bargraph',
  diodes: (p) => IDX.map((n) => ({ key: `L${n}`, a: `A${n}`, k: `K${n}`, vf: VF[barColor(p.config, n - 1)] ?? 2, r: 15 })),
  step({ part, s, circuit, live, log, burn }) {
    for (const n of IDX) {
      const key = `L${n}`
      const i = circuit.diodeCurrent(part, key)
      s[`over_${key}`] = i > 0.05 ? (s[`over_${key}`] || 0) + 1 : 0
      if (s[`over_${key}`] > 150 && !s[`x_${key}`]) {
        burn(key)
        s[`d_${key}`] = false // (o solver não volta a ligar uma junção queimada)
        live.burned = { ...(live.burned || {}), [n]: true }
        log(i18n.m(`💥 O LED ${n} da barra queimou (${(i * 1000).toFixed(0)} mA). Use 220 Ω em cada LED.`, `💥 LED ${n} of the bar burned out (${(i * 1000).toFixed(0)} mA). Use 220 Ω on each LED.`), 'error')
      }
    }
  },
  output({ live, avgCurrent }) {
    live.b = IDX.map((n) => Math.round(Math.min(1, Math.max(0, avgCurrent(`L${n}`)) / 0.012) * 100) / 100)
  },
  diagnose({ part, nets, parts, isC, name, issues }) {
    const used = IDX.filter((n) => isC(`A${n}`) || isC(`K${n}`))
    if (!used.length) return
    const half = used.filter((n) => isC(`A${n}`) !== isC(`K${n}`))
    if (half.length) issues.push({ level: 'info', msg: i18n.m(`${name}: LED(s) ${half.join(', ')} só com uma perna ligada (Ax ao pino com 220 Ω, Kx ao GND).`, `${name}: LED(s) ${half.join(', ')} with only one leg connected (Ax to the pin with 220 Ω, Kx to GND).`), parts: [part.id] })
    const bad = []
    for (const n of used) if (missingResistor(nets, parts, part, [`A${n}`], [`K${n}`]).length || missingResistor(nets, parts, part, [`K${n}`], [`A${n}`]).length) bad.push(n)
    if (bad.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: LED(s) ${bad.join(', ')} sem resistência em série — queimam com o pino a 5 V. Use 220 Ω por LED.`, `${name}: LED(s) ${bad.join(', ')} without a series resistor — they burn out with the pin at 5 V. Use 220 Ω per LED.`), parts: [part.id] })
  },
}
