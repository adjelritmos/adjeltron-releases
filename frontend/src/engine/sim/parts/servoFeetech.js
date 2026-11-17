// Servo Feetech do pato robô: servo posicional (def.servo: o motor do engine segue o impulso no
// SIG, como o SG90). Aqui só a alimentação (6–8,4 V da bateria 2S; aceita desde 4,5 V) e o consumo.
import * as i18n from '../../../../../shared/i18n.js'
const servoDiag = ({ vd, s, isC, name, issues, part }) => {
  const v = vd('VCC', 'GND')
  if (v > 8.8) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC — o servo aguenta até 8,4 V. Danificado!`, `${name}: ${v.toFixed(1)} V on VCC — the servo handles up to 8.4 V. Damaged!`), parts: [part.id] })
  else if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação (VCC 6–8,4 V e GND).`, `${name} has no power (VCC 6–8.4 V and GND).`), parts: [part.id] })
  if (!isC('SIG')) issues.push({ level: 'info', msg: i18n.m(`${name}: SIG não está ligado a um pino nem a um PCA9685.`, `${name}: SIG is not connected to a pin or to a PCA9685.`), parts: [part.id] })
}

export default {
  type: 'servoFeetech',
  stamp({ cond, s }) {
    cond('VCC', 'GND', (0.01 + (s.mv ? 0.3 : 0)) / 7.4)
  },
  update({ vd, set }) {
    const v = vd('VCC', 'GND')
    set('powered', v >= 4.5 && v <= 8.8)
  },
  step({ s, pulse, dt, invalidate }) {
    const us = pulse('SIG')
    if (us == null || !s.powered) return void (s.mv && ((s.mv = false), invalidate()))
    const target = Math.max(0, Math.min(180, ((us - 544) / (2400 - 544)) * 180))
    const a = s.est ?? target
    const step = 500 * dt
    s.est = Math.abs(target - a) <= step ? target : a + Math.sign(target - a) * step
    const mv = Math.abs(target - a) > 0.3
    if (mv !== !!s.mv) {
      s.mv = mv
      invalidate()
    }
  },
  diagnose: servoDiag,
}
