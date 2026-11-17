// Marcador rotativo: contactos para GND (~1 Ω) em DIAL (fora do repouso) e PULSE (impulsos).
// Para cada algarismo (k = 1…10 impulsos): o dedo roda o disco até ao batente (~0,15 s +
// 25 ms por furo), larga-o e a mola trá-lo de volta a 10 impulsos/s (30° por impulso);
// PULSE fecha durante 40 ms de cada impulso de 100 ms; DIAL abre 60 ms depois do último.
import { DIALER_DIGITS } from '../../../../../shared/parts/rotaryDialer.js'
import * as i18n from '../../../../../shared/i18n.js'

const SLOT = 100 // ms por impulso
const CLOSED = [30, 70] // parte fechada (LOW) de cada impulso
const GAP = 300 // pausa mínima entre algarismos

export default {
  type: 'rotaryDialer',
  stamp({ cond, s }) {
    cond('DIAL', 'GND', s.dial ? 1 : 1e-10)
    cond('PULSE', 'GND', s.pulse ? 1 : 1e-10)
  },
  step({ s, input, invalidate, timeUs }) {
    if (!s.q) Object.assign(s, { q: [], ph: null, t: 0, angle: 0, number: '', rest: 0 })
    const key = input.key ?? null
    if (key !== s.lastKey) {
      if (key != null && DIALER_DIGITS.includes(String(key))) s.q.push(String(key))
      s.lastKey = key
    }
    let dial = false
    let pulse = false
    if (!s.ph && s.q.length && timeUs / 1000 >= s.rest) {
      const d = s.q.shift()
      const n = DIALER_DIGITS.indexOf(d) + 1
      Object.assign(s, { ph: 'wind', t: 0, n, digit: d, wind: 150 + n * 25 })
    }
    if (s.ph === 'wind') {
      s.t++
      dial = true
      s.angle = Math.min(1, s.t / s.wind) * (s.n + 1) * 30
      if (s.t >= s.wind) Object.assign(s, { ph: 'ret', t: 0 })
    } else if (s.ph === 'ret') {
      s.t++
      dial = true
      const k = s.t % SLOT
      pulse = s.t < s.n * SLOT && k >= CLOSED[0] && k < CLOSED[1]
      s.angle = Math.max(0, (s.n + 1) * 30 * (1 - s.t / ((s.n + 1) * SLOT)))
      if (s.t >= (s.n + 1) * SLOT) {
        s.number = (s.number + s.digit).slice(-14)
        Object.assign(s, { ph: null, angle: 0, rest: timeUs / 1000 + GAP })
        dial = false
      }
    }
    if (dial !== !!s.dial || pulse !== !!s.pulse) {
      s.dial = dial
      s.pulse = pulse
      invalidate()
    }
  },
  output({ live, s }) {
    live.angle = Math.round((s.angle || 0) * 10) / 10
    live.dialing = !!s.ph
    live.digit = s.ph ? s.digit : null
    live.number = s.number || ''
    live.pulse = !!s.pulse
  },
  diagnose({ isC, name, issues, part }) {
    if (!isC('GND')) issues.push({ level: 'warn', msg: i18n.m(`${name}: GND por ligar — DIAL e PULSE são contactos para o GND.`, `${name}: GND not connected — DIAL and PULSE are contacts to GND.`), parts: [part.id] })
    if (!isC('DIAL') || !isC('PULSE')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DIAL e PULSE a dois pinos digitais (pinMode INPUT_PULLUP).`, `${name}: connect DIAL and PULSE to two digital pins (pinMode INPUT_PULLUP).`), parts: [part.id] })
  },
}
