// LED RGB de cátodo comum: três junções com tensões diretas diferentes.
import * as i18n from '../../../../../shared/i18n.js'
const COLORS = [
  ['r', 'R', 2.0],
  ['g', 'G', 3.0],
  ['b', 'B', 3.0],
]

export default {
  type: 'rgbled',
  diodes: () => COLORS.map(([key, a, vf]) => ({ key, a, k: 'K', vf, r: 12 })),
  step({ part, s, circuit, live, log, burn }) {
    // >50 mA durante >150 ms queima essa cor, como no LED simples
    for (const [key] of COLORS) {
      const i = circuit.diodeCurrent(part, key)
      s[`over_${key}`] = i > 0.05 ? (s[`over_${key}`] || 0) + 1 : 0
      if (s[`over_${key}`] > 150 && !s[`x_${key}`]) {
        burn(key)
        live.burned = { ...(live.burned || {}), [key]: true }
        log(i18n.m(`💥 A cor ${key.toUpperCase()} do LED RGB queimou (${(i * 1000).toFixed(0)} mA). Use 220 Ω em cada cor.`, `💥 The ${key.toUpperCase()} color of the RGB LED burned out (${(i * 1000).toFixed(0)} mA). Use 220 Ω on each color.`), 'error')
      }
    }
  },
  output({ live, avgCurrent }) {
    // brilho 0..1 por cor (≈15 mA = brilho total)
    for (const [key] of COLORS) live[key] = Math.round(Math.min(1, Math.max(0, avgCurrent(key)) / 0.015) * 100) / 100
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('K')) issues.push({ level: 'info', msg: i18n.m(`${name}: o cátodo comum (K) não está ligado ao GND.`, `${name}: the common cathode (K) is not connected to GND.`), parts: [part.id] })
  },
}
