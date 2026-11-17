// ESC de 30 A: lê o impulso de servo em SIG (1000–2000 µs), arma com ~1 s de sinal
// mínimo, e entrega o acelerador (0–1) ao motor brushless ligado a A/B/C.
// O motor (sim/parts/brushless.js) lê s.throttle / s.vb deste estado e devolve
// s.iLoad (A), que o ESC puxa da bateria (B+/B−). O BEC dá 5 V / 2 A no pino 5V.
import * as i18n from '../../../../../shared/i18n.js'
const ARM_US = 1080 // abaixo disto conta como "mínimo" para armar
const START_US = 1040 // acima disto o motor roda
const ARM_S = 1.0

export const escThrottle = (us) => Math.max(0, Math.min(1, (us - START_US) / (2000 - START_US)))

export default {
  type: 'esc',
  stamp({ s, cond, src }) {
    cond('B+', 'B-', 1 / 2000) // eletrónica em repouso (~6 mA)
    if ((s.vb || 0) >= 5.8) src('5V', 'GND', 5.0, 0.08, { kind: 'buck' }) // BEC
    if (s.iLoad > 0.05) cond('B+', 'B-', s.iLoad / Math.max(1, s.vb || 1))
  },
  update({ s, vd, set }) {
    const vb = Math.round(vd('B+', 'B-') * 10) / 10
    set('vb', vb)
    set('powered', vb >= 5.8)
  },
  step(ctx) {
    const { s, dt, live, log, invalidate, part } = ctx
    if (!s.powered) {
      Object.assign(s, { mode: 'off', armT: 0, highT: 0, throttle: 0 })
      if (s.iLoad) {
        s.iLoad = 0
        invalidate()
      }
      return
    }
    if (!s.mode || s.mode === 'off') Object.assign(s, { mode: 'wait', armT: 0, highT: 0, lostT: 0, throttle: 0 })
    const us = ctx.pulse('SIG')
    s.us = us ?? 0
    if (us == null) {
      // sem sinal: o motor pára; ao fim de 1 s volta a precisar de armar
      s.throttle = 0
      s.lostT += dt
      if (s.mode === 'armed' && s.lostT > 1) {
        s.mode = 'wait'
        log(`⚠ ${part.id}: o ESC perdeu o sinal e desarmou (motor parado).`, 'warn')
      }
    } else {
      s.lostT = 0
      if (s.mode === 'armed') s.throttle = escThrottle(us)
      else if (us < ARM_US) {
        s.mode = 'arming'
        s.armT += dt
        s.highT = 0
        if (s.armT >= ARM_S) {
          s.mode = 'armed'
          log(`♪ ${part.id}: ESC armado (bip-bip) — pronto a acelerar.`, 'ok')
        }
      } else {
        // sinal alto antes de armar: proteção, o motor não arranca
        s.armT = 0
        s.highT += dt
        s.mode = 'wait'
        if (s.highT > 0.6 && !s.warnedArm) {
          s.warnedArm = true
          log(i18n.m(`⚠ ${part.id}: o ESC não arma — ao ligar a bateria o sinal tem de estar no mínimo (~1000 µs) durante ~1 s. Faça esc.writeMicroseconds(1000) e espere antes de acelerar.`, `⚠ ${part.id}: the ESC does not arm — when the battery is connected the signal must be at minimum (~1000 µs) for ~1 s. Call esc.writeMicroseconds(1000) and wait before throttling up.`), 'warn')
        }
      }
    }
    if (s.mode !== 'armed') s.throttle = 0
    // o motor atualiza s.iLoad; pede novo cálculo elétrico se a corrente mudou bastante
    if (Math.abs((s.iLoad || 0) - (s.iSolved || 0)) > 0.25) {
      s.iSolved = s.iLoad || 0
      invalidate()
    }
    live.mode = s.mode
  },
  output({ s, live }) {
    live.mode = s.mode || 'off'
    live.us = Math.round(s.us || 0)
    live.throttle = Math.round((s.throttle || 0) * 1000) / 1000
    live.i = Math.round((s.iLoad || 0) * 10) / 10
    live.vb = s.vb || 0
  },
  diagnose({ part, isC, vd, name, issues }) {
    const vb = vd('B+', 'B-')
    if (!isC('B+') || !isC('B-')) issues.push({ level: 'warn', msg: i18n.m(`${name}: ligue B+ / B− à bateria LiPo (2–4S).`, `${name}: connect B+ / B− to the LiPo battery (2–4S).`), parts: [part.id] })
    else if (vb > 17.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vb.toFixed(1)} V na entrada — este ESC aceita no máximo 4S (16,8 V). Queimado!`, `${name}: ${vb.toFixed(1)} V at the input — this ESC accepts at most 4S (16.8 V). Burned out!`), parts: [part.id] })
    else if (vb > 0 && vb < 5.8) issues.push({ level: 'warn', msg: i18n.m(`${name}: só ${vb.toFixed(1)} V na bateria — o ESC precisa de pelo menos 2S (~7 V).`, `${name}: only ${vb.toFixed(1)} V on the battery — the ESC needs at least 2S (~7 V).`), parts: [part.id] })
    if (!isC('SIG')) issues.push({ level: 'info', msg: i18n.m(`${name}: SIG por ligar (pino com Servo.h ou canal do PCA9685).`, `${name}: SIG not connected (pin with Servo.h or a PCA9685 channel).`), parts: [part.id] })
    const ph = ['A', 'B', 'C'].filter((p) => isC(p))
    if (ph.length && ph.length < 3) issues.push({ level: 'warn', msg: i18n.m(`${name}: só ${ph.length} das 3 fases ligadas — um motor brushless precisa de A, B e C.`, `${name}: only ${ph.length} of the 3 phases connected — a brushless motor needs A, B and C.`), parts: [part.id] })
  },
}
