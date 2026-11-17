// Ventoinha de pé / de mesa: motor DC simplificado (resistência equivalente V/I), velocidade
// proporcional à tensão (com sinal), arranca acima de 30 % da tensão nominal e pára abaixo de
// 18 %; constante de tempo ~0,7 s. A cabeça oscila ±40° (período ~6 s à velocidade nominal).
import { vpeTipo } from '../../../../../shared/parts/ventoinhaPe.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'ventoinhaPe',
  stamp({ cond, cfg }) {
    const t = vpeTipo(cfg)
    cond('+', '-', t.i / t.v)
  },
  step({ s, cfg, vd, dt, log }) {
    const t = vpeTipo(cfg)
    const v = vd('+', '-')
    const moving = Math.abs(s.rpm || 0) > 20
    const target = Math.abs(v) >= (moving ? 0.18 : 0.3) * t.v ? (t.rpm * v) / t.v : 0
    s.rpm = (s.rpm || 0) + (target - (s.rpm || 0)) * Math.min(1, dt / 0.7)
    // oscilação: a cabeça é levada pela própria ventoinha (sem motor de oscilação próprio)
    if (cfg.oscilar !== false && cfg.oscilar !== 'false') s.ph = ((s.ph || 0) + ((2 * Math.PI) / 6) * (Math.abs(s.rpm) / t.rpm) * dt) % (2 * Math.PI)
    s.overMs = Math.abs(v) > 1.4 * t.v ? (s.overMs || 0) + 1 : 0
    if (s.overMs > 500 && !s._warn) {
      s._warn = true
      log(i18n.m(`⚠ Ventoinha com ${Math.abs(v).toFixed(1)} V (nominal ${t.v} V): o motor aquece.`, `⚠ Fan at ${Math.abs(v).toFixed(1)} V (rated ${t.v} V): the motor heats up.`), 'warn')
    }
  },
  output({ s, live, cfg, vd }) {
    const t = vpeTipo(cfg)
    live.rpm = Math.round(s.rpm || 0)
    live.osc = round(40 * Math.sin(s.ph || 0), 10)
    live.i = round(Math.abs(vd('+', '-')) * (t.i / t.v))
  },
  diagnose(ctx) {
    const { part, isC, name, issues, cfg } = ctx
    if (!isC('+') || !isC('-')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue + e − ao relé, transístor/MOSFET ou driver de motor.`, `${name}: connect + and − to the relay, transistor/MOSFET or motor driver.`), parts: [part.id] })
    directPinIssue(ctx, ['+', '-'], `${Math.round(vpeTipo(cfg).i * 1000)} mA`)
  },
}
