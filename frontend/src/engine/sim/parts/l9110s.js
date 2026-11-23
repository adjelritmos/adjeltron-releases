// L9110S: duas pontes H (uma por motor), alimentadas pelo VCC (2,5–12 V). Por canal:
//   IA IB = 1 0 → OA1 = VCC, OA2 = 0 (frente); 0 1 → trás; 0 0 e 1 1 → ambas a LOW (para).
// Transístores bipolares/MOS de saída: ~1 Ω por lado (perde ~0,8 V a 800 mA). 800 mA contínuos
// por canal, 1,5 A de pico; acima disso a proteção térmica desliga a ponte.
import * as i18n from '../../../../../shared/i18n.js'
const R_SIDE = 1.0
const CH = [
  ['A', 'A-IA', 'A-IB', 'OA1', 'OA2'],
  ['B', 'B-IA', 'B-IB', 'OB1', 'OB2'],
]
const INS = ['A-IA', 'A-IB', 'B-IA', 'B-IB']
// nível (0..1, com PWM) de uma entrada: do pino do Arduino que a comanda, ou pela tensão
const lv = (s, vd, pin) => s.fr?.[pin] ?? (vd(pin, 'GND') >= 2.0 ? 1 : 0)

export default {
  type: 'l9110s',
  stamp({ s, cond, src, vd }) {
    cond('VCC', 'GND', s.on ? 1 / 1500 : 1 / 50000)
    // entradas soltas: pull-down fraco (1 MΩ) para lerem LOW em vez de um valor ao acaso
    for (const pin of INS) cond(pin, 'GND', 1e-6)
    s.e = null
    if (!s.on || s.hot) return
    const v = Math.max(0, vd('VCC', 'GND'))
    // tensões aplicadas (para a corrente em step() usar as mesmas que o solver resolveu)
    s.e = CH.map(([, ia, ib, o1, o2]) => {
      const a = lv(s, vd, ia)
      const b = lv(s, vd, ib)
      // tabela da folha de dados: 1 0 → OA1 alta; 0 1 → OA2 alta; 0 0 e 1 1 → as DUAS a LOW (para).
      // Com PWM numa entrada conta a fração do tempo em que só essa está a HIGH (tensão média).
      const e1 = v * a * (1 - b)
      const e2 = v * b * (1 - a)
      src(o1, 'GND', e1, R_SIDE)
      src(o2, 'GND', e2, R_SIDE)
      return [e1, e2]
    })
  },
  update({ s, vd, set }) {
    const v = vd('VCC', 'GND')
    set('on', v >= 2.5)
    set('sig', INS.map((x) => (s.fr?.[x] != null ? 'p' : vd(x, 'GND') >= 2 ? 1 : 0)).join(',') + '|' + Math.round(v * 10))
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
    const v = vd('VCC', 'GND')
    if (v > 12.5 && !s.overV) {
      s.overV = true
      log(i18n.m(`⚠ L9110S: ${v.toFixed(1)} V no VCC (máx. 12 V). O chip pode queimar.`, `⚠ L9110S: ${v.toFixed(1)} V on VCC (max 12 V). The chip may burn out.`), 'warn')
    }
    if (!s.on) return
    // corrente de cada motor: pela queda nas saídas
    s.i = CH.map(([, , , o1, o2], n) => {
      const e = s.e?.[n]
      return !e || s.hot ? 0 : Math.max(Math.abs(e[0] - vd(o1, 'GND')), Math.abs(e[1] - vd(o2, 'GND'))) / R_SIDE
    })
    const worst = Math.max(...s.i)
    s.temp = (s.temp ?? 25) + (25 + s.i.reduce((t, i) => t + i * i * 2, 0) * 60 - (s.temp ?? 25)) / 3000
    s.overI = worst > 0.85 ? (s.overI || 0) + 1 : 0
    if (s.overI > 500 && !s.warned) {
      s.warned = true
      log(i18n.m(`⚠ L9110S: ${worst.toFixed(2)} A num motor (máx. 0,8 A contínuos). Vai aquecer — para motores maiores use o L298N ou o TB6612.`, `⚠ L9110S: ${worst.toFixed(2)} A on a motor (max 0.8 A continuous). It will heat up — for bigger motors use the L298N or the TB6612.`), 'warn')
    }
    // pico: só conta se durar (inverter o sentido dá um pico curto, como no real)
    s.peak = worst > 1.6 ? (s.peak || 0) + 1 : 0
    if (!s.hot && (s.temp > 150 || s.peak > 30)) {
      s.hot = true
      s.hotMs = 0
      invalidate()
      log(i18n.m(`🔥 L9110S: ${worst > 1.6 ? `${worst.toFixed(1)} A (máx. 1,5 A de pico)` : 'aqueceu demais'} — a proteção desligou as saídas.`, `🔥 L9110S: ${worst > 1.6 ? `${worst.toFixed(1)} A (max 1.5 A peak)` : 'overheated'} — the protection turned off the outputs.`), 'error')
    } else if (s.hot && ++s.hotMs > 2000 && s.temp < 110) {
      s.hot = false
      invalidate()
    }
  },
  output({ s, live }) {
    live.powered = !!s.on
    live.hot = !!s.hot
    live.i = (s.i || [0, 0]).map((x) => Math.round(x * 1000) / 1000)
  },
  diagnose({ part, isC, name, issues, vd }) {
    if (!isC('VCC') || !isC('GND')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue VCC (pilhas dos motores, 2,5–12 V) e GND (comum com o Arduino).`, `${name}: connect VCC (motor batteries, 2.5–12 V) and GND (common with the Arduino).`), parts: [part.id] })
    else if (vd('VCC', 'GND') < 2.5) issues.push({ level: 'warn', msg: i18n.m(`${name}: VCC com ${vd('VCC', 'GND').toFixed(1)} V — precisa de 2,5–12 V para funcionar.`, `${name}: VCC at ${vd('VCC', 'GND').toFixed(1)} V — it needs 2.5–12 V to work.`), parts: [part.id] })
  },
}
