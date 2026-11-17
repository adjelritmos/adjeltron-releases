// 74HC595: registo de deslocamento de 8 bits + registo de saída (latch).
// Cada flanco ascendente em SHCP desloca DS para dentro; um flanco em STCP copia o
// registo para Q0–Q7. Lê os impulsos (mais curtos que 1 ms) no registo de escritas
// do Arduino. Em cadeia (Q7S → DS do seguinte) o primeiro chip desloca também os
// seguintes. MR a LOW limpa o registo; OE a HIGH desliga as saídas (alta impedância).
import { takeEvents, levelOf } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

const Q = ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7']

// chips seguintes na cadeia (DS ligado ao Q7S deste)
function chainOf(nets, part) {
  const out = []
  let cur = part
  for (let k = 0; k < 16; k++) {
    const net = nets.netOf(cur.id, 'Q7S')
    const next = nets.partsOnNet(net).find((q) => q.type === 'hc595' && q.id !== cur.id && nets.netOf(q.id, 'DS') === net)
    if (!next || out.includes(next)) break
    out.push(next)
    cur = next
  }
  return out
}

export default {
  type: 'hc595',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    cond('VCC', 'GND', 1e-5)
    if (!s.powered) return
    const vcc = vd('VCC', 'GND')
    src('Q7S', 'GND', (s.sr ?? 0) & 0x80 ? vcc : 0, 50)
    if (s.oe) return
    // saídas CMOS: ~50 Ω (com 5 V a corrente por pino deve ficar abaixo de ~6–8 mA)
    for (let k = 0; k < 8; k++) src(Q[k], 'GND', (s.latch ?? 0) & (1 << k) ? vcc : 0, 50)
  },
  update({ vd, set, s }) {
    const v = vd('VCC', 'GND')
    if (v > 7) set('damaged', true)
    set('powered', !s.damaged && v >= 2)
    set('oe', vd('OE', 'GND') > 2.4)
    set('mr', vd('MR', 'GND') < 1.5)
  },
  step(ctx) {
    const { s, part, circuit, invalidate, live } = ctx
    if (s.sr === undefined) Object.assign(s, { sr: 0, latch: 0, lv: { SHCP: levelOf(ctx, 'SHCP'), STCP: levelOf(ctx, 'STCP'), DS: levelOf(ctx, 'DS') } })
    if (s.mr && s.sr) {
      s.sr = 0
      invalidate()
    }
    const fromBoard = ctx.boardPinsOn('DS').length > 0 || ctx.boardPinsOn('SHCP').length > 0
    if (!fromBoard) return // seguidor numa cadeia: quem o desloca é o primeiro chip
    if (s.chain === undefined) s.chain = chainOf(circuit.nets, part).map((q) => circuit.st[q.id])
    const evs = takeEvents(ctx, ['DS', 'SHCP', 'STCP'])
    let changed = false
    for (const [, n, v] of evs) {
      const pin = s._evPins.get(n)
      const rise = v && !s.lv[pin]
      s.lv[pin] = v
      if (!rise || !s.powered) continue
      if (pin === 'SHCP') {
        // do fim da cadeia para o início: cada um recebe o bit 7 do anterior
        for (let k = s.chain.length - 1; k >= 0; k--) {
          const prev = k === 0 ? s : s.chain[k - 1]
          const st = s.chain[k]
          st.sr = (((st.sr ?? 0) << 1) | (((prev.sr ?? 0) >> 7) & 1)) & 0xff
        }
        s.sr = s.mr ? 0 : ((s.sr << 1) | (s.lv.DS ? 1 : 0)) & 0xff
        changed = true
      } else if (pin === 'STCP') {
        for (const st of [s, ...s.chain]) st.latch = st.sr ?? 0
        changed = true
      }
    }
    if (changed) invalidate()
    void live
  },
  output({ s, live }) {
    live.powered = !!s.powered
    live.q = Q.map((_, k) => !!s.powered && !s.oe && !!((s.latch ?? 0) & (1 << k)))
    live.value = s.latch ?? 0
  },
  diagnose({ vd, isC, name, issues, part }) {
    if (vd('VCC', 'GND') < 2) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC (pino 16) → 5V e GND (pino 8) → GND.`, `${name} has no power: VCC (pin 16) → 5V and GND (pin 8) → GND.`), parts: [part.id] })
    if (!isC('MR')) issues.push({ level: 'warn', msg: i18n.m(`${name}: MR (pino 10) desligado — ligue-o a 5V (a LOW limpa o registo).`, `${name}: MR (pin 10) disconnected — connect it to 5V (LOW clears the register).`), parts: [part.id] })
    if (!isC('OE')) issues.push({ level: 'warn', msg: i18n.m(`${name}: OE (pino 13) desligado — ligue-o a GND para ativar as saídas.`, `${name}: OE (pin 13) disconnected — connect it to GND to enable the outputs.`), parts: [part.id] })
    if (!isC('DS') || !isC('SHCP') || !isC('STCP')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DS (dados), SHCP (relógio) e STCP (latch) a 3 pinos do Arduino (ou DS ao Q7S do chip anterior).`, `${name}: connect DS (data), SHCP (clock) and STCP (latch) to 3 Arduino pins (or DS to Q7S of the previous chip).`), parts: [part.id] })
  },
}
