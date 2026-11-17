// Motor DC 130 com hélice. Modelo com força contraeletromotriz dentro do plugin:
// eletricamente é uma fonte ke·ω em série com R (enrolamento); a corrente que o
// circuito deixar passar dá o binário, que acelera o rotor contra o atrito e o ar.
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const KE = 0.0024 // V·s/rad (= kt em N·m/A)
const R = 2.5 // Ω
const J = 4e-7 // kg·m² (rotor + hélice)
const I0 = 0.1 // A de atrito (escovas, chumaceiras)
const DRAG = 2.5e-10 // N·m/(rad/s)² — resistência do ar na hélice
const RPM = 60 / (2 * Math.PI)

export default {
  type: 'dcMotor',
  stamp({ s, src }) {
    if (s.burned) return
    src('+', '-', s.emf || 0, R)
  },
  step({ s, vd, dt, live, invalidate, log }) {
    if (s.burned) {
      s.w = (s.w || 0) * 0.995
      s.angle = (s.angle || 0) + s.w * dt
      return
    }
    const w = s.w || 0
    const i = (vd('+', '-') - (s.emf || 0)) / R
    s.i = i
    let torque = KE * i - DRAG * w * Math.abs(w)
    const fric = KE * I0
    if (Math.abs(w) < 2 && Math.abs(KE * i) <= fric) s.w = 0 // atrito estático: não arranca
    else {
      torque -= Math.sign(w || i) * fric
      s.w = w + (torque / J) * dt
    }
    s.angle = ((s.angle || 0) + s.w * dt) % (2 * Math.PI * 1000)
    const emf = KE * s.w
    if (Math.abs(emf - (s.emf || 0)) > 0.004) {
      s.emf = emf
      invalidate()
    }
    // sobrecarga: veio bloqueado com tensão alta aquece o enrolamento
    s.heat = Math.max(0, (s.heat || 0) + (i * i * R - 2.5) * dt)
    if (s.heat > 6 && !s.warned) {
      s.warned = true
      log(i18n.m(`⚠ O motor 130 está a aquecer (${Math.abs(i).toFixed(1)} A). É um motor de 3–6 V: baixe a tensão ou não o deixe bloqueado.`, `⚠ The 130 motor is heating up (${Math.abs(i).toFixed(1)} A). It is a 3–6 V motor: lower the voltage or do not leave it stalled.`), 'warn')
    }
    if (s.heat > 20) {
      s.burned = true
      live.burned = true
      invalidate()
      log(i18n.m('💥 O enrolamento do motor 130 queimou por sobreaquecimento (demasiada corrente durante muito tempo).', '💥 The 130 motor winding burned out from overheating (too much current for too long).'), 'error')
    }
  },
  output({ s, vd, live }) {
    live.rpm = Math.round((s.w || 0) * RPM)
    live.angle = Math.round(((s.angle || 0) % (2 * Math.PI)) * 1000) / 1000
    live.i = Math.round((s.burned ? 0 : (vd('+', '-') - (s.emf || 0)) / R) * 1000) / 1000
    live.v = Math.round(vd('+', '-') * 100) / 100
  },
  diagnose({ part, isC, nets, name, issues, vd }) {
    if (!isC('+') || !isC('-')) issues.push({ level: 'warn', msg: i18n.m(`${name} com terminais por ligar.`, `${name} has unconnected terminals.`), parts: [part.id] })
    for (const t of ['+', '-']) {
      const pins = boardIoOnNet(nets, nets.netOf(part.id, t))
      if (pins.length) {
        issues.push({ level: 'error', msg: i18n.m(`${name} ligado diretamente ao pino ${pins[0]}: o motor pede ~1 A a arrancar e o pino só dá 40 mA (pode queimar). Use um transístor 2N2222 ou um MOSFET IRLZ44N e pilhas.`, `${name} connected directly to pin ${pins[0]}: the motor draws ~1 A at startup and the pin only gives 40 mA (it may burn out). Use a 2N2222 transistor or an IRLZ44N MOSFET and batteries.`), parts: [part.id] })
        break
      }
    }
    const v = Math.abs(vd('+', '-'))
    if (v > 7.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${v.toFixed(1)} V aos terminais — é um motor de 3–6 V, vai aquecer e gastar as escovas.`, `${name}: ${v.toFixed(1)} V on the terminals — it is a 3–6 V motor, it will heat up and wear the brushes.`), parts: [part.id] })
  },
}
