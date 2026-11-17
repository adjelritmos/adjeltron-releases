// Micro servos do grupo G.
//  - MG90S: servo posicional (def.servo: o motor do engine segue o Servo.h, como o SG90).
//    Aqui só a alimentação (≥ 4 V) e o consumo: ~6 mA parado, ~250 mA a mover — estimado
//    seguindo o impulso no pino SIG à velocidade do servo.
//  - FS90R: rotação contínua. Impulso de 1500 µs (+ afinação do trimpot) ± 30 µs → parado;
//    o desvio dá a velocidade (máx. com ±400 µs: ~130 rpm a 6 V, ~105 rpm a 4,8 V). Menos de
//    1500 µs (write < 90) roda no sentido horário visto de cima. O veio (mount "horn") roda
//    com live.mountAngle, por isso uma roda presa ao braço anda.
import * as i18n from '../../../../../shared/i18n.js'
const servoDiag = ({ vd, s, isC, name, issues, part }) => {
  const v = vd('VCC', 'GND')
  if (v > 7.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC — o servo aguenta ~6 V. Danificado!`, `${name}: ${v.toFixed(1)} V on VCC — the servo handles ~6 V. Damaged!`), parts: [part.id] })
  else if (!s.powered) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação (VCC 5 V e GND).`, `${name} has no power (VCC 5 V and GND).`), parts: [part.id] })
  if (!isC('SIG')) issues.push({ level: 'info', msg: i18n.m(`${name}: SIG não está ligado a um pino do Arduino.`, `${name}: SIG is not connected to an Arduino pin.`), parts: [part.id] })
}

export const servoMG90 = {
  type: 'servoMG90',
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
  diagnose: servoDiag,
}

const DEAD = 30
const FULL = 400
export const servoFS90R = {
  type: 'servoFS90R',
  stamp({ cond, s }) {
    cond('VCC', 'GND', (0.006 + Math.abs(s.spd || 0) * 0.15) / 5)
  },
  update({ vd, set }) {
    const v = vd('VCC', 'GND')
    set('powered', v >= 4 && v <= 7.5)
  },
  step({ s, cfg, pulse, dt, vd, invalidate }) {
    const us = s.powered ? pulse('SIG') : null
    let want = 0
    if (us != null) {
      const dev = us - (1500 + (cfg.trim || 0))
      if (Math.abs(dev) > DEAD) want = -Math.sign(dev) * Math.min(1, (Math.abs(dev) - DEAD) / (FULL - DEAD))
    }
    const prev = s.spd || 0
    s.spd = prev + (want - prev) * Math.min(1, dt / 0.06) // ~60 ms de aceleração
    if (Math.abs(s.spd) < 1e-3 && want === 0) s.spd = 0
    s.us = us
    const rpmMax = 130 * Math.min(1.1, Math.max(0, vd('VCC', 'GND')) / 6)
    s.rpm = s.spd * rpmMax
    s.ang = ((s.ang || 0) + s.rpm * 6 * dt) % 360000 // graus, + = horário visto de cima
    if (Math.abs(s.spd - (s.lastSpd || 0)) > 0.05) {
      s.lastSpd = s.spd
      invalidate()
    }
  },
  output({ s, live }) {
    live.rpm = Math.round((s.rpm || 0) * 10) / 10
    live.angle = Math.round((s.ang || 0) * 10) / 10
    live.mountAngle = 90 - ((s.ang || 0) % 360)
    live.us = s.us ?? null
    live.powered = !!s.powered
  },
  diagnose: servoDiag,
}
