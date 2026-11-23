// TB6612FNG: 2 pontes H de MOSFET (~0,5 Ω por canal, 0,25 Ω por lado). Por canal:
//   IN1 IN2 = 1 0 → frente (O1 = VM·duty, O2 = 0), 0 1 → trás, 1 1 → travão (ambas a 0 V),
//   0 0 → roda livre (alta impedância). PWM a LOW trava, por isso a tensão média é VM·duty.
//   STBY a LOW (ou VCC < 2,7 V) desliga tudo. 1,2 A contínuos por canal; acima de ~3,2 A
//   (ou muito tempo acima de 1,2 A) a proteção térmica desliga as saídas.
import * as i18n from '../../../../../shared/i18n.js'
const R_SIDE = 0.25
const CH = [
  ['A', 'PWMA', 'AIN1', 'AIN2', 'AO1', 'AO2'],
  ['B', 'PWMB', 'BIN1', 'BIN2', 'BO1', 'BO2'],
]
const INS = ['PWMA', 'AIN1', 'AIN2', 'PWMB', 'BIN1', 'BIN2', 'STBY']
const lv = (s, vd, pin) => s.fr?.[pin] ?? (vd(pin, 'GND.1') >= 2.0 ? 1 : 0)

export default {
  type: 'tb6612',
  stamp({ s, cond, src, vd }) {
    cond('VCC', 'GND.1', s.logic ? 1 / 2500 : 1e-6)
    cond('VM', 'GND.1', 1 / 20000)
    // todas as entradas (e o STBY) têm pull-down interno de 200 kΩ: soltas leem LOW
    for (const pin of INS) cond(pin, 'GND.1', 1 / 200000)
    s.e = null
    if (!s.logic || s.hot || lv(s, vd, 'STBY') < 0.5) return
    const vm = Math.max(0, vd('VM', 'GND.1'))
    // tensões aplicadas (para a corrente em step() usar as mesmas que o solver resolveu)
    s.e = CH.map(([, pwm, in1, in2, o1, o2]) => {
      const a = lv(s, vd, in1) >= 0.5
      const b = lv(s, vd, in2) >= 0.5
      if (!a && !b) return null // roda livre
      const d = a && b ? 0 : lv(s, vd, pwm)
      const e1 = a && !b ? vm * d : 0
      const e2 = b && !a ? vm * d : 0
      src(o1, 'GND.1', e1, R_SIDE)
      src(o2, 'GND.1', e2, R_SIDE)
      return [e1, e2]
    })
  },
  update({ s, vd, set }) {
    const v = vd('VCC', 'GND.1')
    set('logic', v >= 2.7 && v <= 5.6)
    set('sig', INS.map((x) => (s.fr?.[x] != null ? 'p' : vd(x, 'GND.1') >= 2 ? 1 : 0)).join(',') + '|' + Math.round(vd('VM', 'GND.1') * 10))
  },
  step(ctx) {
    const { s, vd, log, invalidate, boardPins } = ctx
    const fr = {}
    for (const pin of INS) {
      const ns = ctx.boardPinsOn(pin)
      const bp = ns.length ? boardPins[ns[0]] : null
      if (bp?.mode === 'OUTPUT') fr[pin] = bp.pwm ? bp.duty : bp.out ? 1 : 0
    }
    const key = JSON.stringify(fr)
    if (key !== s.frKey) {
      s.frKey = key
      s.fr = fr
      invalidate()
    }
    if (!s.logic) return
    // corrente real: pela queda nos MOSFET de cada saída que está a conduzir (com as tensões
    // que o solver usou — senão cada mudança de sentido ou de PWM parecia um pico de dezenas de A)
    s.i = CH.map(([, , , , o1, o2], n) => {
      const e = s.e?.[n]
      return !e || s.hot ? 0 : Math.max(Math.abs(e[0] - vd(o1, 'GND.1')), Math.abs(e[1] - vd(o2, 'GND.1'))) / R_SIDE
    })
    const worst = Math.max(...s.i)
    s.temp = (s.temp ?? 25) + (25 + s.i.reduce((t, i) => t + i * i * 0.5, 0) * 90 - (s.temp ?? 25)) / 3000
    s.overI = worst > 1.25 ? (s.overI || 0) + 1 : 0
    if (s.overI > 500 && !s.warned) {
      s.warned = true
      log(i18n.m(`⚠ TB6612FNG: ${worst.toFixed(2)} A num canal (máx. 1,2 A contínuos). Vai aquecer — para motores maiores use outro driver.`, `⚠ TB6612FNG: ${worst.toFixed(2)} A on a channel (max 1.2 A continuous). It will heat up — for bigger motors use another driver.`), 'warn')
    }
    // pico: só conta se durar (inverter o sentido dá um pico curto, como no real)
    s.peak = worst > 3.2 ? (s.peak || 0) + 1 : 0
    if (!s.hot && (s.temp > 150 || s.peak > 20)) {
      s.hot = true
      s.hotMs = 0
      invalidate()
      log(i18n.m(`🔥 TB6612FNG: ${worst > 3.2 ? `${worst.toFixed(1)} A (máx. 3,2 A de pico)` : '150 °C'} — a proteção desligou as saídas.`, `🔥 TB6612FNG: ${worst > 3.2 ? `${worst.toFixed(1)} A (max 3.2 A peak)` : '150 °C'} — the protection turned off the outputs.`), 'error')
    } else if (s.hot && ++s.hotMs > 2000 && s.temp < 110) {
      s.hot = false
      invalidate()
    }
  },
  output({ s, vd, live }) {
    live.powered = !!s.logic
    live.hot = !!s.hot
    live.stby = lv(s, vd, 'STBY') >= 0.5
    live.out = CH.map(([, , , , o1, o2]) => Math.round(vd(o1, o2) * 10) / 10)
    live.i = (s.i || [0, 0]).map((x) => Math.round(x * 1000) / 1000)
  },
  diagnose({ part, vd, isC, nets, name, issues }) {
    const v = vd('VCC', 'GND.1')
    const vm = vd('VM', 'GND.1')
    if (v > 6) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (lógica, máx. 5,5 V). Danificado! A tensão dos motores vai ao VM.`, `${name}: ${v.toFixed(1)} V on VCC (logic, max 5.5 V). Damaged! The motor voltage goes to VM.`), parts: [part.id] })
    else if (v < 2.7) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação lógica: VCC → 5V (ou 3,3 V) e GND → GND.`, `${name} has no logic power: VCC → 5V (or 3.3 V) and GND → GND.`), parts: [part.id] })
    const used = CH.filter(([, , , , o1, o2]) => isC(o1) || isC(o2))
    if (used.length && vm < 2.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: VM (alimentação dos motores) sem tensão — ligue-o ao + das pilhas (4,5–13,5 V), com o − ao GND comum.`, `${name}: VM (motor supply) has no voltage — connect it to the battery + (4.5–13.5 V), with − to the common GND.`), parts: [part.id] })
    else if (vm > 15) issues.push({ level: 'error', msg: i18n.m(`${name}: ${vm.toFixed(1)} V no VM (máx. 15 V).`, `${name}: ${vm.toFixed(1)} V on VM (max 15 V).`), parts: [part.id] })
    if (used.length && !isC('STBY')) issues.push({ level: 'warn', msg: i18n.m(`${name}: STBY está solto — o driver fica em standby (saídas desligadas). Ligue STBY a 5V ou a um pino a HIGH.`, `${name}: STBY is floating — the driver stays in standby (outputs off). Connect STBY to 5V or to a pin set HIGH.`), parts: [part.id] })
    for (const [k, pwm, in1, in2, o1, o2] of used) {
      if (!isC(pwm)) issues.push({ level: 'warn', msg: i18n.m(`${name}: PWM${k} está solto — sem PWM o motor ${k} não anda. Ligue-o a um pino PWM (velocidade) ou a 5V.`, `${name}: PWM${k} is floating — without PWM motor ${k} does not run. Connect it to a PWM pin (speed) or to 5V.`), parts: [part.id] })
      if (!isC(in1) || !isC(in2)) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${in1}/${in2} (sentido do motor ${k}) por ligar.`, `${name}: ${in1}/${in2} (motor ${k} direction) still to connect.`), parts: [part.id] })
      for (const o of [o1, o2])
        for (const q of nets.partsOnNet(nets.netOf(part.id, o))) if (q.type === 'arduino' || q.type === 'nano' || q.type === 'nanoKeyestudio' || q.type === 'mega') issues.push({ level: 'error', msg: i18n.m(`${name}: a saída ${o} está ligada a um pino do Arduino — as saídas vão ao motor.`, `${name}: output ${o} is connected to an Arduino pin — the outputs go to the motor.`), parts: [part.id] })
    }
  },
}
