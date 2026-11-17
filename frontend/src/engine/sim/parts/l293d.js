// L293D: 4 meias-pontes (push-pull) com enable por pares. Como no L298N, as entradas
// contam pela tensão média (PWM): saída = (VCC2 − perdas) × A × EN através de ~1,5 Ω
// por transístor (≈1,4 V perdidos de cada lado a 600 mA). EN a LOW → saídas em alta
// impedância (o motor roda livre). Proteção térmica: com mais de ~0,6 A por canal durante
// segundos o chip aquece e desliga-se (volta quando arrefece).
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const CH = [
  ['EN12', '1A', '1Y'],
  ['EN12', '2A', '2Y'],
  ['EN34', '3A', '3Y'],
  ['EN34', '4A', '4Y'],
]
const R_OUT = 1.5
const V_LOSS = 0.5 // queda fixa dos transístores (além da resistiva)

const INS = ['EN12', 'EN34', '1A', '2A', '3A', '4A']
// fração "ligada" de uma entrada: duty do PWM (ou 0/1) se vier de um pino do Arduino
// (calculada em step()), senão o nível lógico pela tensão (HIGH ≥ 2,3 V)
const frac = (s, vd, pin) => s.fr?.[pin] ?? (vd(pin, 'GND') >= 2.3 ? 1 : 0)

export default {
  type: 'l293d',
  stamp({ s, cond, src, vd }) {
    cond('VCC1', 'GND', s.powered ? 1 / 200 : 1e-6) // ~25 mA de lógica
    cond('VCC2', 'GND', 1 / 1000)
    if (!s.powered || s.hot) return
    const vs = Math.max(0, vd('VCC2', 'GND') - V_LOSS)
    for (const [en, a, y] of CH) {
      const e = frac(s, vd, en)
      if (e < 0.01) continue
      src(y, 'GND', vs * frac(s, vd, a), R_OUT / e)
    }
  },
  update({ s, vd, set }) {
    const v1 = vd('VCC1', 'GND')
    set('powered', v1 >= 4.5 && v1 <= 7)
    // entradas usadas pelas saídas: se mudaram é preciso nova iteração (ver l298n)
    set('sig', INS.map((x) => (s.fr?.[x] != null ? 'p' : vd(x, 'GND') >= 2.3 ? 1 : 0)).join(',') + '|' + Math.round(vd('VCC2', 'GND') * 10))
  },
  step(ctx) {
    const { s, vd, live, log, invalidate, boardPins } = ctx
    // entradas comandadas por pinos do Arduino: duty do PWM ou nível
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
    if (!s.powered) return
    let worst = 0
    const vs = Math.max(0, vd('VCC2', 'GND') - V_LOSS)
    s.i = CH.map(([en, a, y]) => {
      // corrente na saída: tensão em vazio menos a real, sobre a resistência interna
      const e = frac(s, vd, en)
      if (s.hot || e < 0.01) return 0
      const i = (Math.abs(vs * frac(s, vd, a) - vd(y, 'GND')) * e) / R_OUT
      worst = Math.max(worst, i)
      return i
    })
    // modelo térmico simples (DIP-16 no ar: ~1 W de dissipação continua)
    const p = s.i.reduce((a, i) => a + i * i * R_OUT * 2 + i * V_LOSS, 0)
    s.temp = (s.temp ?? 25) + (25 + p * 80 - (s.temp ?? 25)) / 4000 // τ ≈ 4 s
    s.overI = worst > 0.65 ? (s.overI || 0) + 1 : 0 // o arranque (rotor parado) pede mais durante alguns ms
    if (s.overI > 400 && !s.warned) {
      s.warned = true
      log(i18n.m(`⚠ L293D: ${(worst * 1000).toFixed(0)} mA num canal (máx. 600 mA contínuos). O chip vai aquecer — para motores maiores use o L298N.`, `⚠ L293D: ${(worst * 1000).toFixed(0)} mA on a channel (max 600 mA continuous). The chip will heat up — for bigger motors use the L298N.`), 'warn')
    }
    if (!s.hot && s.temp > 150) {
      s.hot = true
      invalidate()
      log(i18n.m('🔥 L293D a 150 °C: a proteção térmica desligou as saídas. Os motores pedem demasiada corrente.', '🔥 L293D at 150 °C: thermal protection turned off the outputs. The motors draw too much current.'), 'error')
    } else if (s.hot && s.temp < 110) {
      s.hot = false
      invalidate()
    }
    live.temp = Math.round(s.temp)
  },
  output({ s, vd, live }) {
    live.powered = !!s.powered
    live.hot = !!s.hot
    live.out = CH.map(([, , y]) => Math.round(vd(y, 'GND') * 10) / 10)
  },
  diagnose({ part, vd, isC, nets, name, issues }) {
    const v1 = vd('VCC1', 'GND')
    const v2 = vd('VCC2', 'GND')
    if (v1 > 7.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v1.toFixed(1)} V no VCC1 (lógica, pino 16; máx. 7 V). Danificado! A tensão dos motores vai ao VCC2 (pino 8).`, `${name}: ${v1.toFixed(1)} V on VCC1 (logic, pin 16; max 7 V). Damaged! The motor voltage goes to VCC2 (pin 8).`), parts: [part.id] })
    else if (v1 < 4.5) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação lógica: VCC1 (pino 16) → 5V e os GND do meio (4, 5, 12, 13) → GND.`, `${name} has no logic power: VCC1 (pin 16) → 5V and the middle GNDs (4, 5, 12, 13) → GND.`), parts: [part.id] })
    const used = CH.filter(([, , y]) => isC(y))
    if (used.length && v2 < 4.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: VCC2 (pino 8, alimentação dos motores) sem tensão (${v2.toFixed(1)} V) — ligue-o ao + das pilhas (4,5–36 V), com o − ao GND comum.`, `${name}: VCC2 (pin 8, motor supply) has no voltage (${v2.toFixed(1)} V) — connect it to the battery + (4.5–36 V), with − to the common GND.`), parts: [part.id] })
    else if (v2 > 36) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v2.toFixed(0)} V no VCC2 (máx. 36 V).`, `${name}: ${v2.toFixed(0)} V on VCC2 (max 36 V).`), parts: [part.id] })
    const v2net = nets.netOf(part.id, 'VCC2')
    if (used.length && boardIoOnNet(nets, v2net).length === 0 && nets.partsOnNet(v2net).some((q) => q.type === 'arduino' && nets.netOf(q.id, '5V') === v2net))
      issues.push({ level: 'info', msg: i18n.m(`${name}: os motores estão a ser alimentados pelo 5V do Arduino — funciona com motores muito pequenos, mas o arranque pode reiniciar o Arduino. Prefira pilhas no VCC2.`, `${name}: the motors are powered by the Arduino's 5V — it works with very small motors, but starting them may reset the Arduino. Prefer batteries on VCC2.`), parts: [part.id] })
    for (const [en, a, y] of CH) {
      if (!isC(y)) continue
      if (!isC(en)) issues.push({ level: 'warn', msg: i18n.m(`${name}: ${en === 'EN12' ? 'EN1,2 (pino 1)' : 'EN3,4 (pino 9)'} está solto — sem enable as saídas ficam desligadas. Ligue-o a 5V (sempre ligado) ou a um pino PWM (velocidade).`, `${name}: ${en === 'EN12' ? 'EN1,2 (pin 1)' : 'EN3,4 (pin 9)'} is floating — without enable the outputs stay off. Connect it to 5V (always on) or to a PWM pin (speed).`), parts: [part.id] })
      if (!isC(a)) issues.push({ level: 'warn', msg: i18n.m(`${name}: a entrada ${a} do canal ${y} está solta — ligue-a a um pino do Arduino.`, `${name}: input ${a} of channel ${y} is floating — connect it to an Arduino pin.`), parts: [part.id] })
      for (const q of nets.partsOnNet(nets.netOf(part.id, y))) {
        if (q.type === 'arduino' || q.type === 'nano' || q.type === 'nanoKeyestudio' || q.type === 'mega') issues.push({ level: 'error', msg: i18n.m(`${name}: a saída ${y} está ligada a um pino do Arduino — as saídas vão aos motores, as entradas são 1A–4A.`, `${name}: output ${y} is connected to an Arduino pin — the outputs go to the motors, the inputs are 1A–4A.`), parts: [part.id] })
      }
    }
  },
}
