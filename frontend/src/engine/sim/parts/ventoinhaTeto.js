// Ventoinha de teto: motor DC simplificado (resistência equivalente V/I), velocidade
// proporcional à tensão (com sinal: inverte com a polaridade), arranca acima de 25 % da tensão
// nominal e pára abaixo de 15 %; constante de tempo ~0,8 s (inércia das pás).
import { fanTipo } from '../../../../../shared/parts/ventoinhaTeto.js'
import { directPinIssue, round } from './_casa.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'ventoinhaTeto',
  stamp({ cond, cfg }) {
    const t = fanTipo(cfg)
    cond('+', '-', t.i / t.v)
  },
  step({ s, cfg, vd, dt, log }) {
    const t = fanTipo(cfg)
    const v = vd('+', '-')
    const moving = Math.abs(s.rpm || 0) > 5
    const target = Math.abs(v) >= (moving ? 0.15 : 0.25) * t.v ? (t.rpm * v) / t.v : 0
    s.rpm = (s.rpm || 0) + (target - (s.rpm || 0)) * Math.min(1, dt / 0.8)
    s.overMs = Math.abs(v) > 1.4 * t.v ? (s.overMs || 0) + 1 : 0
    if (s.overMs > 500 && !s._warn) {
      s._warn = true
      log(i18n.m(`⚠ Ventoinha de teto com ${Math.abs(v).toFixed(1)} V (nominal ${t.v} V): o motor aquece.`, `⚠ Ceiling fan at ${Math.abs(v).toFixed(1)} V (rated ${t.v} V): the motor heats up.`), 'warn')
    }
  },
  output({ s, live, cfg, vd }) {
    const t = fanTipo(cfg)
    live.rpm = Math.round(s.rpm || 0)
    live.i = round(Math.abs(vd('+', '-')) * (t.i / t.v))
  },
  diagnose(ctx) {
    const { part, isC, name, issues, cfg } = ctx
    if (!isC('+') || !isC('-')) return issues.push({ level: 'info', msg: i18n.m(`${name}: ligue + e − ao relé, transístor ou driver de motor.`, `${name}: connect + and − to the relay, transistor or motor driver.`), parts: [part.id] })
    directPinIssue(ctx, ['+', '-'], `${Math.round(fanTipo(cfg).i * 1000)} mA`)
  },
}
