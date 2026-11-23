// Portas lógicas e flip-flops abstratos com alimentação implícita (GND e tensão lógica da
// placa — ver groundRef em _groupF.js). Entradas com 1 MΩ para a massa e histerese (40–60 %
// da tensão lógica); saídas são fontes de 50 Ω (0 V ou Vio).
//  - portas: saída calculada em update() a partir da solução anterior (uma cadeia de portas
//    estabiliza em poucas iterações, como os 74HC);
//  - flip-flops: o flanco ascendente do CLK é detetado em step() (1 ms). Se o CLK vier de um
//    pino do Arduino contam-se os impulsos registados em ctx.pinLog (impulsos de µs também).
//    S/R assíncronos aplicam-se em update().
import GATES_FF from '../../../../../shared/parts/gates.js'
import { groundRef } from './_groupF.js'
import * as i18n from '../../../../../shared/i18n.js'

const R_OUT = 50
const G_IN = 1e-6
const FN = {
  and: (v) => v.every(Boolean),
  or: (v) => v.some(Boolean),
  nand: (v) => !v.every(Boolean),
  nor: (v) => !v.some(Boolean),
  xor: (v) => v.filter(Boolean).length % 2 === 1,
  xnor: (v) => v.filter(Boolean).length % 2 === 0,
  not: (v) => !v[0],
}

function behavior(def) {
  const ins = def.pins.filter((p) => p.kind === 'in').map((p) => p.id)
  const outs = def.pins.filter((p) => p.kind === 'out').map((p) => p.id)
  const nm = def.short
  // nível de uma entrada com histerese
  const level = (s, vd, g, pin) => {
    const v = vd(pin, g.ref)
    const prev = !!s.lv?.[pin]
    if (v >= 0.6 * g.vio) return true
    if (v <= 0.4 * g.vio) return false
    return prev
  }
  const levels = (s, vd, g) => Object.fromEntries(ins.map((p) => [p, level(s, vd, g, p)]))
  // saídas (bits por ordem de `outs`) a partir dos níveis atuais
  const compute = (s, lv) => {
    if (def.gate) return FN[def.gate.fn](ins.map((p) => lv[p])) ? 1 : 0
    let q = !!s.q
    if (lv.S && !lv.R) q = true
    else if (lv.R && !lv.S) q = false
    if (lv.S && lv.R) return 3 // Q = /Q = 1 (estado proibido)
    return q ? 1 : 2
  }
  return {
    type: def.type,
    stamp({ s, cond, src, parts }) {
      const g = groundRef(s, parts)
      if (!g) return
      for (const p of ins) cond(p, g.ref, G_IN)
      const bits = s.outs ?? (def.gate ? 0 : 2)
      outs.forEach((o, k) => src(o, g.ref, bits & (1 << k) ? g.vio : 0, R_OUT))
    },
    update({ s, vd, set, parts }) {
      const g = groundRef(s, parts)
      if (!g) return
      const lv = levels(s, vd, g)
      s.lv = lv
      if (def.ff && lv.S !== lv.R) s.q = !!lv.S // assíncronos: alteram o estado guardado
      set('outs', compute(s, lv))
    },
    step(ctx) {
      const { s, vd, live, log, invalidate } = ctx
      const g = s._gnd // calculado no stamp()
      if (!g) return
      const lv = levels(s, vd, g)
      if (def.ff) {
        // impulsos do CLK escritos pelo programa neste ms (podem ser mais curtos que 1 ms)
        if (s._clkPins === undefined) s._clkPins = ctx.boardPinsOn('CLK')
        let edges = 0
        const logged = s._clkPins.length ? ctx.pinLog.filter((e) => s._clkPins.includes(e[1])) : []
        if (logged.length) {
          let prev = s.clk ?? false
          for (const e of logged) {
            const h = !!e[2]
            if (h && !prev) edges++
            prev = h
          }
        } else if (s.clk === undefined) {
          // primeiro instante: um CLK que já nasce a HIGH (ex.: ligado ao /Q de outro flip-flop) não é um flanco
        } else if (lv.CLK && !s.clk) edges = 1
        s.clk = lv.CLK
        for (let k = 0; k < edges; k++) {
          if (lv.S || lv.R) break // assíncronos mandam
          const q = !!s.q
          if (def.ff === 'd') s.q = lv.D
          else if (def.ff === 't') s.q = lv.T ? !q : q
          else s.q = lv.J && lv.K ? !q : lv.J ? true : lv.K ? false : q
        }
        if (edges) {
          s.edges = (s.edges || 0) + edges
          invalidate()
        }
        if (lv.S && lv.R && !s.warnedSR) {
          s.warnedSR = true
          log(i18n.m(`⚠ ${nm}: S e R ativos ao mesmo tempo — estado proibido (Q e /Q ficam os dois a HIGH).`, `⚠ ${nm}: S and R active at the same time — forbidden state (Q and /Q both go HIGH).`), 'warn')
        }
      }
      const bits = compute(s, lv)
      if (bits !== (s.outs ?? (def.gate ? 0 : 2))) invalidate()
      // corrente nas saídas
      outs.forEach((o, k) => {
        const vset = (s.outs ?? 0) & (1 << k) ? g.vio : 0
        const i = Math.abs(vset - vd(o, g.ref)) / R_OUT
        s.oc = s.oc || {}
        s.oc[o] = i > 0.025 ? (s.oc[o] || 0) + 1 : 0
        if (s.oc[o] === 200) log(i18n.m(`⚠ ${nm}: a saída ${o === 'QN' ? '/Q' : o} dá ${(i * 1000).toFixed(0)} mA (máx. ~20 mA) — LED sem resistência ou curto?`, `⚠ ${nm}: output ${o === 'QN' ? '/Q' : o} supplies ${(i * 1000).toFixed(0)} mA (max ~20 mA) — LED without a resistor or a short?`), 'warn')
      })
      live.ins = Object.fromEntries(ins.map((p) => [p, lv[p] ? 1 : 0]))
    },
    output({ s, live }) {
      const bits = s.outs ?? (def.gate ? 0 : 2)
      live.outs = bits
      live.q = def.ff ? (bits & 1 ? 1 : 0) : undefined
      live.y = def.gate ? bits & 1 : undefined
      live.powered = !!s._gnd
    },
    diagnose({ part, isC, nets, name, issues, parts, s }) {
      if (!groundRef(s, parts)) issues.push({ level: 'warn', msg: i18n.m(`${name}: sem Arduino no projeto não há alimentação implícita (a saída fica a 0 V). Use um Arduino ou os chips 74HC com VCC/GND.`, `${name}: without an Arduino in the project there is no implicit power (the output stays at 0 V). Use an Arduino or the 74HC chips with VCC/GND.`), parts: [part.id] })
      const used = outs.some((o) => isC(o))
      const loose = ins.filter((p) => !isC(p) && !(def.ff && (p === 'S' || p === 'R')))
      if (used && loose.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${loose.join(', ')} sem ligação — lê(em) LOW.`, `${name}: ${loose.join(', ')} not connected — read(s) LOW.`), parts: [part.id] })
      if (def.ff && !isC('CLK') && used) issues.push({ level: 'warn', msg: i18n.m(`${name}: o CLK não está ligado — o flip-flop nunca muda (só pelo S/R).`, `${name}: CLK is not connected — the flip-flop never changes (only through S/R).`), parts: [part.id] })
      // saída ligada a outra saída (ou a um pino OUTPUT não se sabe aqui): curto se diferirem
      for (const o of outs) {
        if (!isC(o)) continue
        const net = nets.netOf(part.id, o)
        const other = outs.find((x) => x !== o && nets.netOf(part.id, x) === net)
        if (other) issues.push({ level: 'error', msg: i18n.m(`${name}: as saídas ${o} e ${other} estão ligadas uma à outra — curto-circuito.`, `${name}: outputs ${o} and ${other} are connected to each other — short circuit.`), parts: [part.id] })
      }
    },
  }
}

export default GATES_FF.map(behavior)
