// CD4094: registo de deslocamento de 8 bits + latch transparente. Cada flanco ascendente de CLK
// desloca DATA para Q1 (Q1→Q2…); com STROBE a HIGH o latch copia o registo continuamente, a LOW
// guarda o último valor. OE a LOW põe Q1–Q8 em alta impedância (QS continua ativo). QS muda no
// flanco ascendente (bit 8), Q'S no descendente. Em cadeia (QS → DATA do seguinte) o primeiro
// chip desloca também os seguintes. Saídas CMOS de ~1 kΩ (corrente baixa, como o chip real).
import { takeEvents, levelOf } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

const Q = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']
const ROUT = 1000

function chainOf(nets, part) {
  const out = []
  let cur = part
  for (let k = 0; k < 16; k++) {
    const net = nets.netOf(cur.id, 'QS')
    const next = nets.partsOnNet(net).find((q) => q.type === 'cd4094' && q.id !== cur.id && nets.netOf(q.id, 'DATA') === net)
    if (!next || out.includes(next)) break
    out.push(next)
    cur = next
  }
  return out
}

export default {
  type: 'cd4094',
  stamp({ cond, src, s, vd }) {
    if (s.damaged) return cond('VDD', 'VSS', 1e-9)
    cond('VDD', 'VSS', 1e-6)
    if (!s.powered) return
    const vdd = vd('VDD', 'VSS')
    src('QS', 'VSS', (s.sr ?? 0) & 0x80 ? vdd : 0, ROUT)
    src('QS2', 'VSS', s.qs2 ? vdd : 0, ROUT)
    if (!s.oe) return
    for (let k = 0; k < 8; k++) src(Q[k], 'VSS', (s.latch ?? 0) & (1 << k) ? vdd : 0, ROUT)
  },
  update({ vd, set, s }) {
    const v = vd('VDD', 'VSS')
    if (v > 18) set('damaged', true)
    set('powered', !s.damaged && v >= 3)
    set('oe', vd('OE', 'VSS') > v * 0.7)
  },
  step(ctx) {
    const { s, part, circuit, invalidate } = ctx
    if (s.sr === undefined) Object.assign(s, { sr: 0, latch: 0, qs2: 0, lv: { CLK: levelOf(ctx, 'CLK'), STR: levelOf(ctx, 'STR'), DATA: levelOf(ctx, 'DATA') } })
    const fromBoard = ctx.boardPinsOn('DATA').length > 0 || ctx.boardPinsOn('CLK').length > 0
    if (!fromBoard) return // seguidor numa cadeia: quem o desloca é o primeiro chip
    if (s.chain === undefined) s.chain = chainOf(circuit.nets, part).map((q) => circuit.st[q.id])
    const evs = takeEvents(ctx, ['DATA', 'CLK', 'STR'])
    let changed = false
    const all = [s, ...s.chain]
    for (const [, n, v] of evs) {
      const pin = s._evPins.get(n)
      const was = s.lv[pin]
      s.lv[pin] = v
      if (!s.powered) continue
      if (pin === 'CLK' && v && !was) {
        for (let k = s.chain.length - 1; k >= 0; k--) {
          const prev = k === 0 ? s : s.chain[k - 1]
          const st = s.chain[k]
          st.sr = (((st.sr ?? 0) << 1) | (((prev.sr ?? 0) >> 7) & 1)) & 0xff
        }
        s.sr = ((s.sr << 1) | (s.lv.DATA ? 1 : 0)) & 0xff
        changed = true
      } else if (pin === 'CLK' && !v && was) {
        for (const st of all) st.qs2 = ((st.sr ?? 0) >> 7) & 1
        changed = true
      }
      // latch transparente enquanto STROBE estiver a HIGH
      if (s.lv.STR) for (const st of all) if (st.latch !== st.sr) (st.latch = st.sr ?? 0), (changed = true)
    }
    if (changed) invalidate()
  },
  output({ s, live }) {
    live.powered = !!s.powered
    live.q = Q.map((_, k) => !!s.powered && !!s.oe && !!((s.latch ?? 0) & (1 << k)))
    live.value = s.latch ?? 0
  },
  diagnose({ vd, isC, name, issues, part }) {
    if (vd('VDD', 'VSS') < 3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VDD (pino 16) → 5V e VSS (pino 8) → GND.`, `${name} has no power: VDD (pin 16) → 5V and VSS (pin 8) → GND.`), parts: [part.id] })
    if (!isC('OE')) issues.push({ level: 'warn', msg: i18n.m(`${name}: OE (pino 15) desligado — ligue-o a 5V para ativar as saídas.`, `${name}: OE (pin 15) disconnected — connect it to 5V to enable the outputs.`), parts: [part.id] })
    if (!isC('DATA') || !isC('CLK') || !isC('STR')) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue DATA, CLOCK e STROBE a 3 pinos do Arduino (ou DATA ao QS do chip anterior).`, `${name}: connect DATA, CLOCK and STROBE to 3 Arduino pins (or DATA to QS of the previous chip).`), parts: [part.id] })
  },
}
