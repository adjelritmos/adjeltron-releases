// Display de 7 segmentos: 8 LEDs (a–g, dp) com cátodo (ou ânodo) comum.
import { VF, boardPinIds, missingResistor } from './_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

export const SEGS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp']

export default {
  type: 'sevenseg',
  diodes: (p) => {
    const vf = VF[p.config?.color] ?? 1.9
    const anode = p.config?.common === 'anode'
    return SEGS.map((k) => ({ key: k, a: anode ? 'COM.1' : k, k: anode ? k : 'COM.1', vf, r: 15 }))
  },
  step({ part, s, circuit, live, log, burn }) {
    // >50 mA durante >150 ms queima o segmento
    for (const key of SEGS) {
      const i = circuit.diodeCurrent(part, key)
      s[`over_${key}`] = i > 0.05 ? (s[`over_${key}`] || 0) + 1 : 0
      if (s[`over_${key}`] > 150 && !s[`x_${key}`]) {
        burn(key)
        s[`d_${key}`] = false // (o solver não volta a ligar uma junção queimada)
        live.burned = { ...(live.burned || {}), [key]: true }
        log(i18n.m(`💥 O segmento ${key} do display de 7 segmentos queimou (${(i * 1000).toFixed(0)} mA). Use 220 Ω em cada segmento.`, `💥 Segment ${key} of the 7-segment display burned out (${(i * 1000).toFixed(0)} mA). Use 220 Ω on each segment.`), 'error')
      }
    }
  },
  output({ live, avgCurrent }) {
    // brilho 0..1 por segmento (≈12 mA = brilho total)
    live.seg = SEGS.map((k) => Math.round(Math.min(1, Math.max(0, avgCurrent(k)) / 0.012) * 100) / 100)
  },
  diagnose({ part, cfg, nets, parts, isC, name, issues }) {
    const anode = cfg.common === 'anode'
    if (!isC('COM.1') && !isC('COM.2')) {
      issues.push({ level: 'warn', msg: i18n.m(`${name}: nenhum COM ligado. ${anode ? 'No ânodo comum, COM → 5V.' : 'No cátodo comum, COM → GND.'}`, `${name}: no COM connected. ${anode ? 'On common anode, COM → 5V.' : 'On common cathode, COM → GND.'}`), parts: [part.id] })
      return
    }
    const com = boardPinIds(nets, parts, part.id, 'COM.1')
    if (!anode && (com.includes('5V') || com.includes('VIN'))) issues.push({ level: 'error', msg: i18n.m(`${name} é de cátodo comum: COM deve ir ao GND, não ao ${com.includes('5V') ? '5V' : 'VIN'} (nenhum segmento acenderia).`, `${name} is common cathode: COM must go to GND, not to ${com.includes('5V') ? '5V' : 'VIN'} (no segment would light).`), parts: [part.id] })
    if (anode && com.includes('GND.1')) issues.push({ level: 'error', msg: i18n.m(`${name} é de ânodo comum: COM vai ao 5V e os segmentos acendem com LOW.`, `${name} is common anode: COM goes to 5V and the segments light with LOW.`), parts: [part.id] })
    const segs = SEGS.filter((k) => isC(k))
    if (!segs.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue os segmentos a–g a pinos do Arduino (com 220 Ω cada).`, `${name}: connect segments a–g to Arduino pins (with 220 Ω each).`), parts: [part.id] })
    const bad = missingResistor(nets, parts, part, segs, ['COM.1'])
    if (bad.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: segmento(s) ${bad.join(', ')} sem resistência em série — passariam ~80 mA e o segmento queima. Use 220 Ω por segmento.`, `${name}: segment(s) ${bad.join(', ')} without a series resistor — about 80 mA would flow and the segment burns out. Use 220 Ω per segment.`), parts: [part.id] })
  },
}
