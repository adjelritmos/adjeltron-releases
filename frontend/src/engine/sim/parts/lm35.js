// LM35: Vout = 10 mV/°C (fonte de baixa impedância), consumo ~60 µA, precisa de ≥4 V.
// Só com alimentação positiva não consegue dar tensões negativas (≈0 V abaixo de 2 °C).
// Ligado ao contrário, a junção do substrato conduz (centenas de mA) e queima.
import { clamp } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'lm35',
  stamp({ cond, src, s, input, vd }) {
    if (s.damaged) return cond('VS', 'GND', 1e-9)
    cond('VS', 'GND', 1 / 83000)
    if (s.rev) src('GND', 'VS', 0.7, 10, { kind: 'lm35rev' })
    if (s.powered) {
      const vs = vd('VS', 'GND')
      src('VOUT', 'GND', clamp((input.value ?? 25) * 0.01, 0, Math.max(0, vs - 1.5)), 20)
    }
  },
  update({ vd, set, s }) {
    const v = vd('VS', 'GND')
    set('powered', !s.damaged && v >= 4 && v <= 30)
    set('rev', !s.damaged && v < -0.6)
    set('vs', Math.round(v * 10))
  },
  step({ s, log, invalidate }) {
    s.revMs = s.rev && !s.damaged ? (s.revMs || 0) + 1 : 0
    if (s.revMs > 800) {
      s.damaged = true
      s.rev = false
      s.powered = false
      invalidate()
      log(i18n.m('💥 O LM35 estava ligado ao contrário (+Vs e GND trocados): aqueceu e queimou. Face plana para si: +Vs à esquerda, GND à direita.', '💥 The LM35 was connected backwards (+Vs and GND swapped): it heated up and burned out. Flat face toward you: +Vs on the left, GND on the right.'), 'error')
    }
  },
  output({ live, s, input }) {
    Object.assign(live, { temp: input.value ?? 25, powered: !!s.powered, damaged: !!s.damaged, hot: !!s.rev })
  },
  diagnose({ vd, isC, s, name, issues, part }) {
    const v = vd('VS', 'GND')
    if (v < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name} ligado ao contrário: +Vs e GND trocados — aquece e queima! Com a face plana virada para si: +Vs (esquerda), Vout (meio), GND (direita).`, `${name} connected backwards: +Vs and GND swapped — it heats up and burns out! With the flat face toward you: +Vs (left), Vout (middle), GND (right).`), parts: [part.id] })
    else if (!s.powered) issues.push({ level: 'warn', msg: v > 0.5 ? i18n.m(`${name}: só ${v.toFixed(1)} V em +Vs — precisa de pelo menos 4 V (use o pino 5V).`, `${name}: only ${v.toFixed(1)} V on +Vs — it needs at least 4 V (use the 5V pin).`) : i18n.m(`${name} sem alimentação: +Vs → 5V e GND → GND.`, `${name} has no power: +Vs → 5V and GND → GND.`), parts: [part.id] })
    if (!isC('VOUT')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue Vout (perna do meio) a uma entrada analógica (ex.: A0).`, `${name}: connect Vout (middle leg) to an analog input (e.g. A0).`), parts: [part.id] })
  },
}
