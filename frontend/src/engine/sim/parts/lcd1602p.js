// LCD 16×2 paralelo: controlador HD44780 descodificado pino a pino. A biblioteca
// LiquidCrystal (ou código próprio) mexe nos pinos com digitalWrite; aqui seguem-se as
// escritas (registo do ms, como no 74HC595) e, a cada flanco descendente de E, lê-se
// RS e D0–D7 (ou D4–D7 em dois "nibbles" no modo de 4 bits) e executa-se a instrução.
// Ligar sem inicializar: modo de 8 bits, 1 linha, display desligado (a 1.ª linha mostra
// blocos escuros se o contraste estiver alto). V0 define o contraste; A/K a retroiluminação.
import { takeEvents, levelOf } from './_groupD.js'
import { boardIoOnNet } from './group-c-util.js'
import * as i18n from '../../../../../shared/i18n.js'

const DATA = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']
const PINS = ['RS', 'RW', 'E', ...DATA]

export function fresh() {
  return { ddram: new Array(80).fill(0x20), cgram: new Array(64).fill(0), ac: 0, cg: false, id: 1, sh: 0, on: false, cur: false, blink: false, dl8: true, n2: false, shift: 0, half: null, inited: false }
}

// endereço DDRAM seguinte (2 linhas: 0x00–0x27 e 0x40–0x67)
function step(h, addr, d) {
  if (!h.n2) return (addr + d + 80) % 80
  let a = addr + d
  if (a === 0x28) a = 0x40
  else if (a === 0x68) a = 0x00
  else if (a === 0x3f) a = 0x27
  else if (a === -1) a = 0x67
  return a
}
export const ddIndex = (h, addr) => (h.n2 ? (addr >= 0x40 ? 40 + ((addr - 0x40) % 40) : addr % 40) : addr % 80)

export function exec(h, rs, b) {
  if (rs) {
    if (h.cg) {
      h.cgram[h.cgAddr] = b & 0x1f
      h.cgAddr = (h.cgAddr + (h.id ? 1 : -1) + 64) % 64
    } else {
      h.ddram[ddIndex(h, h.ac)] = b
      h.ac = step(h, h.ac, h.id ? 1 : -1)
      if (h.sh) h.shift += h.id ? 1 : -1
    }
    return
  }
  if (b & 0x80) {
    h.cg = false
    h.ac = b & 0x7f
  } else if (b & 0x40) {
    h.cg = true
    h.cgAddr = b & 0x3f
  } else if (b & 0x20) {
    h.dl8 = !!(b & 0x10)
    h.n2 = !!(b & 0x08)
    h.inited = true
  } else if (b & 0x10) {
    const right = b & 0x04 ? 1 : -1
    if (b & 0x08) h.shift -= right
    else h.ac = step(h, h.ac, right)
  } else if (b & 0x08) {
    h.on = !!(b & 0x04)
    h.cur = !!(b & 0x02)
    h.blink = !!(b & 0x01)
  } else if (b & 0x04) {
    h.id = b & 0x02 ? 1 : 0
    h.sh = b & 0x01
  } else if (b & 0x02) {
    h.ac = 0
    h.shift = 0
    h.cg = false
  } else if (b & 0x01) {
    h.ddram.fill(0x20)
    h.ac = 0
    h.shift = 0
    h.id = 1
    h.cg = false
  }
}

// carácter da ROM A00 (japonesa, a mais comum) para mostrar no browser
export function glyph(c) {
  if (c < 16) return String.fromCharCode(c & 7) // carateres personalizados (CGRAM 0–7)
  if (c === 0x5c) return '¥'
  if (c === 0x7e) return '→'
  if (c === 0x7f) return '←'
  if (c >= 0x20 && c < 0x7e) return String.fromCharCode(c)
  if (c >= 0xa1 && c <= 0xdf) return String.fromCharCode(0xff61 + c - 0xa1)
  return { 0xdf: '°', 0xe0: 'α', 0xe2: 'β', 0xe4: 'µ', 0xf4: 'Ω', 0xf7: 'π', 0xe3: 'ε', 0xe5: 'σ', 0xf6: 'Σ', 0xff: '█', 0xa0: ' ', 0xfd: '÷', 0xe8: '√' }[c] ?? '▒'
}

// conteúdo visível de um LCD HD44780 de cols × rows: no modo de 2 linhas da DDRAM, as linhas 3 e 4
// (20×4, 16×4) continuam as linhas 1 e 2 a partir da coluna `cols` (0x14 / 0x54 num 20×4)
export function makeOutput(COLS, ROWS) {
  return function output({ s, vd, live, avgCurrent }) {
    live.powered = !!s.powered
    // brilho da retroiluminação (0..1; ~20 mA = total)
    live.bl = Math.round(Math.min(1, Math.max(0, avgCurrent('bl')) / 0.02) * 100) / 100
    // contraste: tensão de comando VDD − V0 (~4,2 V é o ideal)
    live.contrast = Math.round((vd('VDD', 'VSS') - vd('V0', 'VSS')) * 100) / 100
    const h = s.hd
    if (!s.powered || !h) {
      live.lines = null
      live.inited = false
      return
    }
    const rows = h.n2 ? ROWS : Math.min(ROWS, 1)
    const lines = []
    for (let r = 0; r < ROWS; r++) {
      let t = ''
      for (let c = 0; c < COLS; c++) {
        if (r >= rows) {
          t += ' '
          continue
        }
        const off = r >= 2 ? COLS : 0
        const idx = h.n2 ? (r % 2) * 40 + ((((c + off + h.shift) % 40) + 40) % 40) : (((c + h.shift) % 80) + 80) % 80
        t += glyph(h.ddram[idx])
      }
      lines.push(t)
    }
    live.lines = lines
    live.display = h.on
    live.inited = h.inited
    live.rows = rows
    live.cg = h.cgram.some((x) => x) ? h.cgram.slice() : null
    // cursor: posição no ecrã do contador de endereços
    const idx = ddIndex(h, h.ac)
    const line = h.n2 ? (idx >= 40 ? 1 : 0) : 0
    let col = ((((idx % 40) - h.shift) % 40) + 40) % 40
    let row = line
    if (ROWS > 2 && col >= COLS) (col -= COLS), (row += 2)
    live.cursor = h.on && (h.cur || h.blink) && col < COLS && row < ROWS ? { r: row, c: col, blink: h.blink, line: h.cur } : null
  }
}

export default {
  type: 'lcd1602p',
  diodes: (p) => [{ key: 'bl', a: 'A', k: 'K', vf: 3.0, r: 12 + (p.config?.blR ?? 100) }],
  stamp({ cond, s }) {
    cond('VDD', 'VSS', s.damaged ? 1e-9 : 1 / 3500) // ~1,5 mA (controlador)
    cond('V0', 'VSS', 1 / 1e6) // entrada do divisor de contraste interno
  },
  update({ vd, set, s }) {
    const v = vd('VDD', 'VSS')
    if (v > 7) set('damaged', true)
    set('powered', !s.damaged && v >= 4.3 && v <= 6)
  },
  step(ctx) {
    const { s, part, circuit, live, log, burn } = ctx
    const evs = takeEvents(ctx, PINS)
    if (!s.powered) {
      s.hd = null
      return
    }
    if (!s.hd) {
      s.hd = fresh()
      // nível de partida: o contrário da primeira mudança registada (o programa pode já ter
      // escrito "no futuro", durante um delayMicroseconds da biblioteca), senão o atual
      s.lv = Object.fromEntries(PINS.map((p) => [p, levelOf(ctx, p)]))
      const seen = new Set()
      for (const [, n, v] of [...evs, ...(s.pend || [])]) {
        const pin = s._evPins.get(n)
        if (seen.has(pin)) continue
        seen.add(pin)
        s.lv[pin] = v ? 0 : 1
      }
    }
    const h = s.hd
    for (const [, n, v] of evs) {
      const pin = s._evPins.get(n)
      const fall = !v && s.lv[pin]
      s.lv[pin] = v
      if (pin !== 'E' || !fall || s.lv.RW) continue
      const lv = s.lv
      // D0–D3 soltos leem-se a 0 (sem pull-up)
      if (h.dl8) {
        let b = 0
        for (let k = 0; k < 8; k++) if (lv[DATA[k]]) b |= 1 << k
        h.half = null
        exec(h, lv.RS, b)
      } else {
        let nib = 0
        for (let k = 0; k < 4; k++) if (lv[DATA[k + 4]]) nib |= 1 << k
        if (h.half == null) h.half = nib
        else {
          const b = (h.half << 4) | nib
          h.half = null
          exec(h, lv.RS, b)
        }
      }
    }
    // retroiluminação: >60 mA durante 150 ms queima
    const i = circuit.diodeCurrent(part, 'bl')
    s.blOver = i > 0.06 ? (s.blOver || 0) + 1 : 0
    if (s.blOver > 150 && !s.x_bl) {
      burn('bl')
      live.blBurned = true
      log(i18n.m(`💥 A retroiluminação do LCD queimou (${(i * 1000).toFixed(0)} mA). Sem resistência na placa ponha 220 Ω entre o 5V e o pino A.`, `💥 The LCD backlight burned out (${(i * 1000).toFixed(0)} mA). Without a resistor on the board put 220 Ω between 5V and pin A.`), 'error')
    }
  },
  output: makeOutput(16, 2),
  diagnose({ part, cfg, vd, isC, nets, name, issues }) {
    const v = vd('VDD', 'VSS')
    if (v > 6.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VDD (máx. 5,5 V). Danificado!`, `${name}: ${v.toFixed(1)} V on VDD (max 5.5 V). Damaged!`), parts: [part.id] })
    else if (v < -0.5) issues.push({ level: 'error', msg: i18n.m(`${name}: VDD e VSS trocados (pino 1 = VSS → GND, pino 2 = VDD → 5V).`, `${name}: VDD and VSS swapped (pin 1 = VSS → GND, pin 2 = VDD → 5V).`), parts: [part.id] })
    else if (v < 4.3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VSS (pino 1) → GND, VDD (pino 2) → 5V.`, `${name} has no power: VSS (pin 1) → GND, VDD (pin 2) → 5V.`), parts: [part.id] })
    if (!isC('V0')) issues.push({ level: 'warn', msg: i18n.m(`${name}: V0 (contraste, pino 3) está solto — o texto pode não se ver. Ligue-o ao cursor de um potenciómetro de 10 kΩ (extremos a 5V e GND) ou diretamente ao GND.`, `${name}: V0 (contrast, pin 3) is floating — the text may not be visible. Connect it to the wiper of a 10 kΩ potentiometer (ends to 5V and GND) or directly to GND.`), parts: [part.id] })
    else if (v > 4 && v - vd('V0', 'VSS') < 3.4) issues.push({ level: 'warn', msg: i18n.m(`${name}: V0 a ${vd('V0', 'VSS').toFixed(1)} V — com o contraste tão baixo não se vê nada. Rode o potenciómetro (V0 entre ~0 e 1 V).`, `${name}: V0 at ${vd('V0', 'VSS').toFixed(1)} V — with such low contrast nothing shows. Turn the potentiometer (V0 between ~0 and 1 V).`), parts: [part.id] })
    if (!isC('RW')) issues.push({ level: 'warn', msg: i18n.m(`${name}: RW (pino 5) solto — ligue-o ao GND para escrever no LCD.`, `${name}: RW (pin 5) floating — connect it to GND to write to the LCD.`), parts: [part.id] })
    else if (vd('RW', 'VSS') > 2.5 && !boardIoOnNet(nets, nets.netOf(part.id, 'RW')).length) issues.push({ level: 'error', msg: i18n.m(`${name}: RW está a HIGH — o LCD fica em modo de leitura e ignora tudo o que o Arduino escreve. Ligue RW ao GND.`, `${name}: RW is HIGH — the LCD is in read mode and ignores everything the Arduino writes. Connect RW to GND.`), parts: [part.id] })
    const need = ['RS', 'E', 'D4', 'D5', 'D6', 'D7'].filter((p) => !isC(p))
    if (need.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ${need.join(', ')} por ligar — no modo de 4 bits ligue RS, E e D4–D7 a pinos do Arduino (ex.: LiquidCrystal lcd(12, 11, 5, 4, 3, 2)).`, `${name}: ${need.join(', ')} still to connect — in 4-bit mode connect RS, E and D4–D7 to Arduino pins (e.g. LiquidCrystal lcd(12, 11, 5, 4, 3, 2)).`), parts: [part.id] })
    if (isC('A') !== isC('K')) issues.push({ level: 'info', msg: i18n.m(`${name}: a retroiluminação precisa dos dois pinos: A → 5V e K → GND.`, `${name}: the backlight needs both pins: A → 5V and K → GND.`), parts: [part.id] })
    else if (isC('A') && !(cfg.blR ?? 100)) {
      const net = nets.netOf(part.id, 'A')
      if (!nets.partsOnNet(net).some((q) => q.type === 'resistor') && vd('A', 'K') > 4) issues.push({ level: 'warn', msg: i18n.m(`${name}: retroiluminação sem resistência (a placa não tem) — passam >100 mA e queima. Ponha 220 Ω entre o 5V e o pino A.`, `${name}: backlight without a resistor (the board has none) — over 100 mA flows and it burns out. Put 220 Ω between 5V and pin A.`), parts: [part.id] })
    }
  },
}
