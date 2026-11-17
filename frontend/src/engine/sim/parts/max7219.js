// Matriz 8×8 com MAX7219. A biblioteca LedControl envia escritas de registo
// (16 bits por SPI) que ficam numa fila; aqui confirmamos que chegam pelos pinos
// certos (DIN/CLK/CS) e aplicamo-las ao módulo (ou ao seguinte na cadeia).
// Também lê o protocolo por software (shiftOut em DIN/CLK e LOAD em CS — MaxMatrix, Otto…):
// como no chip, cada flanco de CLK desloca DIN para um registo de 16 bits (que passa o bit
// mais antigo ao módulo seguinte pelo DOUT) e o flanco ascendente de CS aplica-os.
// Registos: 1–8 linhas, 9 descodificação, 10 intensidade, 11 limite de varrimento,
// 12 shutdown (0 = desligado), 15 teste. Ao ligar arranca em shutdown.
// (o estado vai em s.mx: s.reg já é usado pelo solver para os reguladores)
import { supply, logDamage, diagSupply, take, wiring, fmtPins, pinName, boardPinIds } from './_groupA.js'
import { takeEvents, levelOf } from './_groupD.js'
import * as i18n from '../../../../../shared/i18n.js'

const V_MAX = 6.0
const fresh = () => ({ rows: [0, 0, 0, 0, 0, 0, 0, 0], intensity: 0, scan: 7, normal: false, test: false })
const bits = (v) => {
  let c = 0
  for (; v; v &= v - 1) c++
  return c
}

// cadeia: este módulo, depois o que tem DIN no nosso DOUT, etc.
function chainOf(circuit, part) {
  const nets = circuit.nets
  const chain = [part]
  let cur = part
  for (let k = 0; k < 8; k++) {
    const net = nets.netOf(cur.id, 'DOUT')
    const next = nets.partsOnNet(net).find((q) => q.type === 'max7219' && !chain.includes(q) && nets.netOf(q.id, 'DIN') === net)
    if (!next) break
    chain.push(next)
    cur = next
  }
  return chain
}

// escrita de um registo no módulo k da cadeia; devolve true se mudou algo
function applyReg(circuit, chain, part, k, reg, val) {
  const target = chain[k]
  if (!target) return false
  const ts = circuit.st[target.id]
  if (!ts.powered) return false
  const r = ts.mx || (ts.mx = fresh())
  if (reg >= 1 && reg <= 8) r.rows[reg - 1] = val & 0xff
  else if (reg === 10) r.intensity = val & 15
  else if (reg === 11) r.scan = val & 7
  else if (reg === 12) r.normal = !!(val & 1)
  else if (reg === 15) r.test = !!(val & 1)
  else return false
  ts.load = load(r)
  if (target !== part) ts._ext = true
  return true
}

// protocolo por software: flancos de DIN/CLK/CS vindos do Arduino
function bitBang(ctx) {
  const { s, part, circuit } = ctx
  if (!ctx.boardPinsOn('DIN').length || !ctx.boardPinsOn('CLK').length) return false
  if (!s._chain) s._chain = chainOf(circuit, part)
  if (!s.bb) s.bb = { sh: s._chain.map(() => 0), lv: { DIN: levelOf(ctx, 'DIN'), CLK: levelOf(ctx, 'CLK'), CS: levelOf(ctx, 'CS') } }
  const { sh, lv } = s.bb
  let changed = false
  for (const [, n, v] of takeEvents(ctx, ['DIN', 'CLK', 'CS'])) {
    const pin = s._evPins.get(n)
    const rise = v && !lv[pin]
    lv[pin] = v
    if (!rise) continue
    if (pin === 'CLK') {
      for (let k = sh.length - 1; k > 0; k--) sh[k] = ((sh[k] << 1) | ((sh[k - 1] >> 15) & 1)) & 0xffff
      sh[0] = ((sh[0] << 1) | (lv.DIN ? 1 : 0)) & 0xffff
    } else if (pin === 'CS') {
      for (let k = 0; k < sh.length; k++) changed = applyReg(circuit, s._chain, part, k, (sh[k] >> 8) & 15, sh[k] & 0xff) || changed
    }
  }
  return changed
}

function load(r) {
  if (!r.normal) return 0.0002
  const lit = r.test ? 64 : r.rows.slice(0, r.scan + 1).reduce((a, v) => a + bits(v), 0)
  return 0.008 + (lit / 64) * ((r.test ? 16 : r.intensity + 1) / 16) * 0.32
}

export default {
  type: 'max7219',
  stamp({ cond, s }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : (s.load ?? 0.0002) / 5)
  },
  update(ctx) {
    supply(ctx, { vMin: 4.0, vMax: V_MAX })
  },
  step(ctx) {
    const { s, part, circuit, log, invalidate, timeUs } = ctx
    logDamage(ctx, 'MAX7219', V_MAX)
    if (!s.mx) s.mx = fresh()
    if (!s.powered) {
      take(s)
      if (s.mx.normal || s.mx.rows.some((x) => x)) {
        s.mx = fresh()
        s.load = load(s.mx)
        invalidate()
      }
      return
    }
    const msgs = take(s)
    if (msgs.length) {
      const w = wiring(ctx, ['DIN', 'CLK', 'CS'])
      if (!s._chain) s._chain = chainOf(circuit, part)
      let changed = false
      for (const m of msgs) {
        const ok = w.DIN.includes(m.din) && w.CLK.includes(m.clk) && w.CS.includes(m.cs)
        if (!ok) {
          // matriz em cadeia (DIN não vem do Arduino): os dados não são para ela
          if (!w.DIN.length) continue
          if (!s._warnWire) {
            s._warnWire = true
            log(i18n.m(`⚠ MAX7219: o programa usa DIN=${pinName(m.din)}, CLK=${pinName(m.clk)}, CS=${pinName(m.cs)}, mas o módulo tem DIN em ${fmtPins(w.DIN)}, CLK em ${fmtPins(w.CLK)} e CS em ${fmtPins(w.CS)}. Confira a ordem em LedControl(DIN, CLK, CS, n).`, `⚠ MAX7219: the program uses DIN=${pinName(m.din)}, CLK=${pinName(m.clk)}, CS=${pinName(m.cs)}, but the module has DIN on ${fmtPins(w.DIN)}, CLK on ${fmtPins(w.CLK)} and CS on ${fmtPins(w.CS)}. Check the order in LedControl(DIN, CLK, CS, n).`), 'warn')
          }
          continue
        }
        changed = applyReg(circuit, s._chain, part, m.addr, m.reg, m.val) || changed
      }
      if (changed) invalidate()
    }
    if (bitBang(ctx)) invalidate()
    // dica: a desenhar mas o MAX7219 continua em shutdown
    const r = s.mx
    if (!r.normal && r.rows.some((x) => x)) {
      s._shutT = s._shutT ?? timeUs
      if (timeUs - s._shutT > 1.5e6 && !s._warnShut) {
        s._warnShut = true
        log(i18n.m('⚠ MAX7219 em modo "shutdown" (arranca assim): chame lc.shutdown(0, false) no setup() para acender a matriz.', '⚠ MAX7219 in "shutdown" mode (it starts that way): call lc.shutdown(0, false) in setup() to light the matrix.'), 'warn')
      }
    } else s._shutT = undefined
  },
  output({ s, live }) {
    const r = s.mx || fresh()
    live.powered = !!s.powered && !s.damaged
    const on = live.powered && r.normal
    live.rows = on ? (r.test ? [255, 255, 255, 255, 255, 255, 255, 255] : r.rows.map((v, i) => (i <= r.scan ? v : 0))) : [0, 0, 0, 0, 0, 0, 0, 0]
    // brilho percebido (PWM de 1/32 a 31/32)
    live.b = on ? Math.round((0.25 + 0.75 * ((r.test ? 31 : 2 * r.intensity + 1) / 31)) * 100) / 100 : 0
  },
  diagnose(ctx) {
    const { part, isC, nets, parts, name, issues } = ctx
    diagSupply(ctx, { vMin: 4.0, vMax: V_MAX })
    const chained = nets.partsOnNet(nets.netOf(part.id, 'DIN')).some((q) => q.id !== part.id && q.type === 'max7219')
    if (chained) return
    const miss = ['DIN', 'CS', 'CLK'].filter((p) => !boardPinIds(nets, parts, part.id, p).some((id) => /^[DA]\d/.test(id)))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} a pinos digitais do Arduino (ex.: DIN 12, CLK 11, CS 10).`, `${name}: connect ${miss.join(', ')} to Arduino digital pins (e.g. DIN 12, CLK 11, CS 10).`), parts: [part.id] })
    if (boardPinIds(nets, parts, part.id, 'DOUT').some((id) => /^[DA]\d/.test(id))) issues.push({ level: 'warn', msg: i18n.m(`${name}: DOUT é uma saída (para a matriz seguinte). Ligue o Arduino ao DIN, do lado da entrada.`, `${name}: DOUT is an output (to the next matrix). Connect the Arduino to DIN, on the input side.`), parts: [part.id] })
  },
}
