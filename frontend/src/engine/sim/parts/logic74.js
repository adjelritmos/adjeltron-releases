// Portas lógicas 74HC (DIP-14): cada saída é uma fonte CMOS (VCC ou 0 V através de ~50 Ω)
// calculada a partir das tensões das entradas na iteração anterior do solver; uma cadeia
// de portas estabiliza em poucas iterações. Limiares CMOS: HIGH ≥ 0,7·VCC, LOW ≤ 0,3·VCC,
// entre os dois mantém o último valor (no real é indefinido e o chip aquece). O 74HC14
// tem histerese (Schmitt: ~0,6·VCC a subir, ~0,36·VCC a descer).
import LOGIC_DEFS from '../../../../../shared/parts/logic74.js'
import * as i18n from '../../../../../shared/i18n.js'

const R_OUT = 50
const FN = {
  nand: (a, b) => !(a && b),
  nor: (a, b) => !(a || b),
  and: (a, b) => a && b,
  or: (a, b) => a || b,
  xor: (a, b) => a !== b,
  not: (a) => !a,
}

function behavior(def) {
  const { fn, gates, schmitt } = def.logic
  const f = FN[fn]
  const inputs = gates.flatMap((g) => g.slice(0, -1))
  // nível lógico de uma entrada (com memória do anterior entre os limiares)
  const level = (s, vd, vcc, pin) => {
    const v = vd(pin, 'GND')
    const prev = !!s.inLv?.[pin]
    const [hi, lo] = schmitt ? [0.6 * vcc, 0.36 * vcc] : [0.7 * vcc, 0.3 * vcc]
    if (v >= hi) return true
    if (v <= lo) return false
    return prev
  }
  const compute = (s, vd, vcc) => {
    const lv = {}
    for (const p of inputs) lv[p] = level(s, vd, vcc, p)
    let outs = 0
    gates.forEach((g, k) => {
      if (f(...g.slice(0, -1).map((p) => lv[p]))) outs |= 1 << k
    })
    return { lv, outs }
  }
  return {
    type: def.type,
    stamp({ s, cond, src, vd }) {
      if (s.damaged) return cond('VCC', 'GND', 1e-9)
      cond('VCC', 'GND', 1e-5) // ~1 µA em repouso (CMOS) + fugas
      if (!s.powered) return
      const vcc = vd('VCC', 'GND')
      gates.forEach((g, k) => src(g[g.length - 1], 'GND', (s.outs ?? 0) & (1 << k) ? vcc : 0, R_OUT))
    },
    update({ s, vd, set }) {
      const vcc = vd('VCC', 'GND')
      if (vcc > 7) set('damaged', true)
      set('powered', !s.damaged && vcc >= 2)
      if (!s.powered) return
      const { lv, outs } = compute(s, vd, vcc)
      s.inLv = lv
      set('outs', outs)
    },
    step(ctx) {
      const { s, vd, log } = ctx
      if (!s.powered) return
      // o solver pára ao fim de 10 iterações: se a lógica ainda não estabilizou, pede nova solução
      if (compute(s, vd, vd('VCC', 'GND')).outs !== (s.outs ?? 0)) ctx.invalidate()
      // corrente em cada saída: ~4 mA é o normal, acima de 25 mA estraga a saída
      for (const g of gates) {
        const y = g[g.length - 1]
        const k = gates.indexOf(g)
        const vset = (s.outs ?? 0) & (1 << k) ? vd('VCC', 'GND') : 0
        const i = Math.abs(vset - vd(y, 'GND')) / R_OUT
        s.over = s.over || {}
        s.over[y] = i > 0.025 ? (s.over[y] || 0) + 1 : 0
        if (s.over[y] === 200) log(i18n.m(`⚠ ${def.short}: a saída ${y} está a dar ${(i * 1000).toFixed(0)} mA (máx. 25 mA) — falta uma resistência (LED: 220 Ω) ou há um curto. No real a saída estraga-se.`, `⚠ ${def.short}: output ${y} is supplying ${(i * 1000).toFixed(0)} mA (max 25 mA) — a resistor is missing (LED: 220 Ω) or there is a short. In real life the output gets damaged.`), 'warn')
      }
    },
    output({ s, live }) {
      live.powered = !!s.powered && !s.damaged
      live.outs = s.outs ?? 0
      live.ins = s.inLv || {}
    },
    diagnose({ part, vd, isC, nets, name, issues }) {
      const v = vd('VCC', 'GND')
      if (v > 7) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 6 V). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 6 V). Damaged!`), parts: [part.id] })
      else if (v < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: alimentação ao contrário — VCC é o pino 14 (canto de cima à esquerda, do lado do entalhe) e GND o pino 7.`, `${name}: reversed supply — VCC is pin 14 (top-left corner, on the notch side) and GND is pin 7.`), parts: [part.id] })
      else if (v < 2) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC (pino 14) → 5V e GND (pino 7) → GND.`, `${name} has no power: VCC (pin 14) → 5V and GND (pin 7) → GND.`), parts: [part.id] })
      const outPins = gates.map((g) => g[g.length - 1])
      for (const g of gates) {
        const y = g[g.length - 1]
        const ins = g.slice(0, -1)
        const loose = ins.filter((p) => !isC(p))
        if (isC(y) && loose.length) issues.push({ level: 'warn', msg: i18n.m(`${name}: a entrada ${loose.join(' e ')} da porta com saída ${y} está solta — uma entrada CMOS no ar lê valores ao acaso (e o chip aquece). Ligue-a a um sinal, ao GND ou a 5V.`, `${name}: input ${loose.join(' and ')} of the gate with output ${y} is floating — a floating CMOS input reads random values (and the chip heats up). Connect it to a signal, to GND or to 5V.`), parts: [part.id] })
        // duas saídas ligadas uma à outra (ou a um pino de saída do Arduino) "lutam"
        const net = nets.netOf(part.id, y)
        const others = outPins.filter((o) => o !== y && nets.netOf(part.id, o) === net)
        if (others.length && isC(y)) issues.push({ level: 'error', msg: i18n.m(`${name}: as saídas ${y} e ${others[0]} estão ligadas uma à outra — se tiverem valores diferentes fazem um curto-circuito.`, `${name}: outputs ${y} and ${others[0]} are connected to each other — if they have different values they short-circuit.`), parts: [part.id] })
      }
      const unused = gates.filter((g) => g.every((p) => !isC(p)))
      if (unused.length && unused.length < gates.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${unused.length} porta(s) por usar — no real ligue as entradas delas ao GND.`, `${name}: ${unused.length} unused gate(s) — in real life connect their inputs to GND.`), parts: [part.id] })
    },
  }
}

export default LOGIC_DEFS.map(behavior)
