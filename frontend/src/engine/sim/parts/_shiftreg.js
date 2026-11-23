// Núcleo comum dos registos de deslocamento série → paralelo (74HC595 e CD4094). Não é um componente.
//
// Cada entrada de controlo (dados, relógio, latch, reset) é seguida de duas maneiras:
//  - ligada a um pino do Arduino em OUTPUT: pelas escritas registadas em ctx.pinLog (apanha
//    impulsos de microssegundos, como os do shiftOut), por ordem e no instante certo;
//  - ligada a outra coisa (5V/GND, um botão com pull-down, a saída de uma porta, um 555…): pela
//    tensão no pino, amostrada a cada ms, com os limiares CMOS (HIGH ≥ 0,7·V, LOW ≤ 0,3·V).
// Em cadeia (saída série → dados do seguinte, com o mesmo relógio) é o primeiro chip que desloca
// os seguintes, do fim para o início, para cada um receber o bit que o anterior tinha ANTES do flanco.
//
// opts: { type, data, clk, latch, mr?, ser, gnd, vsup, transparent }
//  - mr: reset assíncrono ativo a LOW (limpa o registo de deslocamento, não o de saída)
//  - name: nome curto para os avisos
//  - transparent: o latch é por nível (a HIGH as saídas seguem o registo) em vez de por flanco
// Estado: s.sr (registo de deslocamento), s.latch (registo de saída), s.qs2 (saída série atrasada
// meio impulso, CD4094), s.lv (níveis das entradas), s.mrLow.
import { takeEvents } from './_groupD.js'
import { DEFS, boardProfile } from '../../../../../shared/components.js'
import * as i18n from '../../../../../shared/i18n.js'

// tensão lógica (HIGH) da placa cujos pinos comandam o chip, ou null
export function boardVio(nets, part, pins) {
  for (const pin of pins) {
    const b = nets.partsOnNet(nets.netOf(part.id, pin)).find((q) => DEFS[q.type]?.board)
    if (b) return boardProfile(b.type).vio
  }
  return null
}

export function makeShiftStep(o) {
  const CTRL = [o.data, o.mr, o.latch, o.clk].filter(Boolean) // ordem de aplicação no mesmo instante

  // chip anterior na cadeia (o que tem a saída série nos dados deste, com o mesmo relógio) ou null
  const prevOf = (nets, p) => {
    const net = nets.netOf(p.id, o.data)
    return nets.partsOnNet(net).find((q) => q.type === o.type && q.id !== p.id && nets.netOf(q.id, o.ser) === net && nets.netOf(q.id, o.clk) === nets.netOf(p.id, o.clk)) || null
  }
  const nextOf = (nets, p) => {
    const net = nets.netOf(p.id, o.ser)
    return nets.partsOnNet(net).find((q) => q.type === o.type && q.id !== p.id && nets.netOf(q.id, o.data) === net && nets.netOf(q.id, o.clk) === nets.netOf(p.id, o.clk)) || null
  }

  function init(ctx) {
    const { s, part, circuit } = ctx
    const nets = circuit.nets
    s.sr ??= 0
    s.latch ??= 0
    s.qs2 ??= 0
    s.bp = Object.fromEntries(CTRL.map((p) => [p, ctx.boardPinsOn(p)]))
    s.vio = boardVio(nets, part, CTRL)
    s.lv = {}
    for (const p of CTRL) {
      // nível antes das escritas deste ms (o registo só guarda mudanças: a 1.ª diz o nível anterior)
      const first = ctx.pinLog.find((e) => s.bp[p].includes(e[1]))
      const bp = s.bp[p].map((n) => ctx.boardPins[n]).find((x) => x?.mode === 'OUTPUT')
      s.lv[p] = first ? (first[2] ? 0 : 1) : bp ? (bp.out ? 1 : 0) : sample(ctx, p, 0)
    }
    if (s.mrLow === undefined) s.mrLow = !!o.mr && !s.lv[o.mr] // (a cabeça da cadeia pode já o ter posto)
    // cabeça da cadeia a que este chip pertence (ele próprio, se os dados não vêm de outro chip)
    let head = part
    for (let k = 0; k < 32; k++) {
      const prev = prevOf(nets, head)
      if (!prev || prev.id === part.id) break
      head = prev
    }
    s.follower = head.id !== part.id
    const same = (a, b, pin) => !!pin && nets.netOf(a.id, pin) === nets.netOf(b.id, pin)
    // o que a cabeça faz por este chip: deslocar sempre; latch e reset só se partilharem o fio
    s.own = s.follower ? [!same(head, part, o.mr) && o.mr, !same(head, part, o.latch) && o.latch].filter(Boolean) : CTRL
    s.chain = []
    if (!s.follower) {
      let cur = part
      for (let k = 0; k < 32; k++) {
        const next = nextOf(nets, cur)
        if (!next || next.id === part.id || s.chain.some((c) => c.id === next.id)) break
        s.chain.push({ id: next.id, st: circuit.st[next.id], sameLatch: same(part, next, o.latch), sameMr: same(part, next, o.mr) })
        cur = next
      }
    }
  }

  // nível lógico de uma entrada pela tensão (entre os limiares mantém o anterior)
  function sample(ctx, pin, prev) {
    const vs = ctx.vd(o.vsup, o.gnd)
    const v = ctx.vd(pin, o.gnd)
    if (!(vs > 1)) return prev
    if (v >= 0.7 * vs) return 1
    if (v <= 0.3 * vs) return 0
    return prev
  }

  return function step(ctx) {
    const { s, invalidate } = ctx
    if (!s.lv) init(ctx)
    const evs = takeEvents(ctx, CTRL)
    let changed = false
    if (!s.powered) {
      // sem alimentação perde tudo; continua a seguir os níveis para não inventar flancos ao ligar
      if (s.sr || s.latch || s.qs2) changed = true
      s.sr = s.latch = s.qs2 = 0
    }
    const strobeHigh = (c) => (c ? (c.sameLatch ? s.lv[o.latch] : c.st.lv?.[o.latch]) : s.lv[o.latch])
    const doLatch = (st) => {
      if (st.latch !== (st.sr ?? 0)) {
        st.latch = st.sr ?? 0
        changed = true
      }
    }
    // HIGH de um pino do Arduino visto pelo chip: garantido com ≥ 0,7·V (folha de dados); até metade
    // da alimentação ainda costuma comutar; abaixo disso o chip nunca vê HIGH (ex.: 5 V num CD4094 a 12 V)
    const vs = ctx.vd(o.vsup, o.gnd)
    const tooLow = s.powered && s.vio != null && s.vio < 0.5 * vs
    if (tooLow && evs.length && !s.warnedVio) {
      s.warnedVio = true
      ctx.log(i18n.m(`⚠ ${o.name}: alimentado a ${vs.toFixed(1)} V, os ${s.vio} V dos pinos da placa não chegam para um HIGH (precisa de ≥ ${(0.7 * vs).toFixed(1)} V) — o chip não vê os sinais. Alimente-o com a tensão lógica da placa ou use um conversor de nível.`, `⚠ ${o.name}: powered at ${vs.toFixed(1)} V, the board's ${s.vio} V pins are not enough for a HIGH (it needs ≥ ${(0.7 * vs).toFixed(1)} V) — the chip does not see the signals. Power it from the board's logic voltage or use a level shifter.`), 'warn')
    }
    const apply = (pin, v) => {
      const was = s.lv[pin]
      s.lv[pin] = v
      if (!s.powered || v === was) return
      if (pin === o.mr) {
        s.mrLow = !v
        for (const c of s.chain) if (c.sameMr) c.st.mrLow = !v
        if (!v) {
          for (const st of [s, ...s.chain.filter((c) => c.sameMr).map((c) => c.st)]) {
            if (st.sr) changed = true
            st.sr = 0
          }
          if (o.transparent) [null, ...s.chain].forEach((c) => strobeHigh(c) && doLatch(c ? c.st : s))
        }
      } else if (pin === o.clk && v) {
        // do fim da cadeia para o início: cada um recebe o último bit do anterior
        for (let k = s.chain.length - 1; k >= 0; k--) {
          const prev = k === 0 ? s : s.chain[k - 1].st
          const st = s.chain[k].st
          st.sr = st.mrLow ? 0 : (((st.sr ?? 0) << 1) | (((prev.sr ?? 0) >> 7) & 1)) & 0xff
        }
        s.sr = s.mrLow ? 0 : ((s.sr << 1) | (s.lv[o.data] ? 1 : 0)) & 0xff
        changed = true
        if (o.transparent) [null, ...s.chain].forEach((c) => strobeHigh(c) && doLatch(c ? c.st : s))
      } else if (pin === o.clk && !v) {
        for (const st of [s, ...s.chain.map((c) => c.st)]) {
          const q = ((st.sr ?? 0) >> 7) & 1
          if (st.qs2 !== q) changed = true
          st.qs2 = q
        }
      } else if (pin === o.latch && v) {
        doLatch(s)
        for (const c of s.chain) if (c.sameLatch) doLatch(c.st)
      }
    }
    const driven = (pin) => s.bp[pin].some((n) => ctx.boardPins[n]?.mode === 'OUTPUT')
    // 1) entradas que não vêm de um pino OUTPUT do Arduino: pela tensão. Ao ligar a alimentação
    //    só se acertam os níveis (uma entrada que já está a HIGH não é um flanco)
    const woke = !!s.powered && !s.wasOn
    s.wasOn = !!s.powered
    for (const pin of s.powered ? s.own : []) {
      if (driven(pin)) continue
      const v = sample(ctx, pin, s.lv[pin])
      if (woke) {
        s.lv[pin] = v
        if (pin === o.mr) s.mrLow = !v
      } else if (v !== s.lv[pin]) apply(pin, v)
    }
    // 2) escritas do Arduino, por ordem. Um pino ligado ao latch E ao relógio: primeiro o latch
    //    (copia o registo como estava) e só depois o deslocamento — as saídas andam um impulso atrás
    for (const [, n, v] of evs) for (const pin of s.own) if (s.bp[pin].includes(n)) apply(pin, v && !tooLow ? 1 : 0)
    if (changed) invalidate()
  }
}
