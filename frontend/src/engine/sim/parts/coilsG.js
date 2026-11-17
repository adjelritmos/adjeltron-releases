// Cargas eletromecânicas do grupo G:
//  - solenoide JF-0530B: bobina de 8,3 Ω (0,6 A a 5 V). O êmbolo recolhe com ≥ 0,3 A
//    (~10 ms) e a mola devolve-o abaixo de 0,15 A (~15 ms). Aquece com uso contínuo.
//    Sem díodo de roda livre, o pico ao desligar é avisado.
//  - motor de vibração de moeda: ~40 Ω equivalentes (75 mA a 3 V), arranca com ≥ 0,8 V,
//    12 000 rpm a 3 V (τ ≈ 40 ms); acima de 4,5 V aquece.
import { boardIoOnNet } from './group-c-util.js'
import { hasFlyback } from './relayG.js'
import * as i18n from '../../../../../shared/i18n.js'

const R_SOL = 8.3

function directPinDiag({ part, nets, name, issues }, amps) {
  for (const t of ['+', '-']) {
    const pins = boardIoOnNet(nets, nets.netOf(part.id, t))
    if (pins.length) {
      issues.push({ level: 'error', msg: i18n.m(`${name} ligado diretamente ao pino ${pins[0]}: pede ~${amps} e um pino só dá 40 mA (pode queimar). Use um transístor/MOSFET ou um relé, com um díodo 1N4007 em paralelo.`, `${name} connected directly to pin ${pins[0]}: it draws ~${amps} and a pin only gives 40 mA (it may burn out). Use a transistor/MOSFET or a relay, with a 1N4007 diode in parallel.`), parts: [part.id] })
      return true
    }
  }
  return false
}

export const solenoid = {
  type: 'solenoid',
  stamp({ cond }) {
    cond('+', '-', 1 / R_SOL)
  },
  step({ s, vd, dt, log, part, circuit }) {
    const i = Math.abs(vd('+', '-')) / R_SOL
    const target = s.pulled ? i > 0.15 : i > 0.3
    if (target !== s.pulled) {
      if (!target && (s.iPrev || 0) > 0.3 && !s._warnFly && !hasFlyback(circuit.nets, part, '+', '-')) {
        s._warnFly = true
        log(i18n.m('⚠ Solenoide: a corrente foi cortada sem díodo em paralelo — o pico de tensão da bobina pode queimar o MOSFET/transístor. Ponha um 1N4007 entre + e − (cátodo no +).', '⚠ Solenoid: the current was cut without a parallel diode — the coil voltage spike may burn out the MOSFET/transistor. Put a 1N4007 between + and − (cathode to +).'), 'warn')
      }
      s.pulled = target
    }
    s.x = Math.max(0, Math.min(1, (s.x || 0) + (s.pulled ? dt / 0.01 : -dt / 0.015)))
    s.heat = Math.max(0, (s.heat || 0) + (i * i * R_SOL - 0.6) * dt)
    if (s.heat > 40 && !s._warnHot) {
      s._warnHot = true
      log(i18n.m('🔥 Solenoide a aquecer: muito tempo ligado seguido. Use impulsos curtos (ou um solenoide de serviço contínuo).', '🔥 Solenoid heating up: on for too long continuously. Use short pulses (or a continuous-duty solenoid).'), 'warn')
    }
    s.iPrev = i
  },
  output({ s, live, vd }) {
    live.x = Math.round((s.x || 0) * 100) / 100
    live.pulled = !!s.pulled
    live.i = Math.round((Math.abs(vd('+', '-')) / R_SOL) * 1000) / 1000
  },
  diagnose(ctx) {
    const { part, isC, nets, name, issues, vd } = ctx
    if (!isC('+') || !isC('-')) return issues.push({ level: 'warn', msg: i18n.m(`${name} com fios por ligar.`, `${name} has unconnected wires.`), parts: [part.id] })
    if (directPinDiag(ctx, '0,6 A')) return
    if (!hasFlyback(nets, part, '+', '-')) issues.push({ level: 'warn', msg: i18n.m(`${name}: falta o díodo de roda livre — ponha um 1N4007 entre + e − (cátodo/risco no +) para o pico ao desligar não queimar o transístor.`, `${name}: the flyback diode is missing — put a 1N4007 between + and − (cathode/stripe to +) so the spike when turning off does not burn out the transistor.`), parts: [part.id] })
    const v = Math.abs(vd('+', '-'))
    if (v > 7) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v.toFixed(1)} V na bobina de 5 V — aquece depressa.`, `${name}: ${v.toFixed(1)} V on the 5 V coil — it heats up quickly.`), parts: [part.id] })
  },
}

const R_VIB = 40
export const vibrationMotor = {
  type: 'vibrationMotor',
  stamp({ cond }) {
    cond('+', '-', 1 / R_VIB)
  },
  step({ s, vd, dt, log }) {
    const v = Math.abs(vd('+', '-'))
    const target = v >= 0.8 || (s.rpm > 1000 && v > 0.5) ? (12000 * v) / 3 : 0
    s.rpm = (s.rpm || 0) + (target - (s.rpm || 0)) * Math.min(1, dt / 0.04)
    s.heat = Math.max(0, (s.heat || 0) + (v > 4.5 ? dt : -dt))
    if (s.heat > 5 && !s._warn) {
      s._warn = true
      log(i18n.m(`⚠ Motor de vibração com ${v.toFixed(1)} V (máx. ~3,7 V): aquece e gasta-se depressa. Use 3,3 V ou uma resistência em série.`, `⚠ Vibration motor at ${v.toFixed(1)} V (max ~3.7 V): it heats up and wears out quickly. Use 3.3 V or a series resistor.`), 'warn')
    }
  },
  output({ s, live, vd }) {
    live.rpm = Math.round(s.rpm || 0)
    live.i = Math.round((Math.abs(vd('+', '-')) / R_VIB) * 1000) / 1000
  },
  diagnose(ctx) {
    const { part, isC, name, issues } = ctx
    if (!isC('+') || !isC('-')) return issues.push({ level: 'warn', msg: i18n.m(`${name} com fios por ligar.`, `${name} has unconnected wires.`), parts: [part.id] })
    directPinDiag(ctx, '75–125 mA')
  },
}
