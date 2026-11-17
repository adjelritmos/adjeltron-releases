// Garra meArm em MDF (shared/parts/garraMdf.js): o movimento do servo e o agarrar do cubo são do
// engine (def.servo / def.grab). Aqui só a eletrónica do SG90: alimentado com ≥ 4 V, ~6 mA parado
// e ~250 mA a mover — estimado seguindo o impulso no pino SIG à velocidade do servo.
import * as i18n from '../../../../../shared/i18n.js'
export default {
  type: 'garraMdf',
  stamp({ cond, s }) {
    cond('VCC', 'GND', (0.006 + (s.mv ? 0.25 : 0)) / 5)
  },
  update({ vd, set }) {
    const v = vd('VCC', 'GND')
    set('powered', v >= 4 && v <= 7.5)
  },
  step({ s, pulse, dt, invalidate }) {
    const us = pulse('SIG')
    if (us == null || !s.powered) return void (s.mv && ((s.mv = false), invalidate()))
    const target = Math.max(0, Math.min(180, ((us - 544) / (2400 - 544)) * 180))
    const a = s.est ?? target
    const step = 600 * dt
    s.est = Math.abs(target - a) <= step ? target : a + Math.sign(target - a) * step
    const mv = Math.abs(target - a) > 0.3
    if (mv !== !!s.mv) {
      s.mv = mv
      invalidate()
    }
  },
  diagnose({ vd, s, isC, name, issues, part }) {
    const v = vd('VCC', 'GND')
    if (v > 7.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC — o servo SG90 aguenta ~6 V. Danificado!`, `${name}: ${v.toFixed(1)} V on VCC — the SG90 servo handles ~6 V. Damaged!`), parts: [part.id] })
    else if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação (VCC 5 V e GND).`, `${name} has no power (VCC 5 V and GND).`), parts: [part.id] })
    if (!isC('SIG')) issues.push({ level: 'info', msg: i18n.m(`${name}: SIG não está ligado a um pino do Arduino.`, `${name}: SIG is not connected to an Arduino pin.`), parts: [part.id] })
  },
}
