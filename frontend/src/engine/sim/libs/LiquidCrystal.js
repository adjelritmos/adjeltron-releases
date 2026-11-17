// LiquidCrystal (biblioteca oficial do Arduino) para LCD HD44780 paralelos.
// Tal como a original, mexe nos pinos com digitalWrite e espera com delayMicroseconds:
// o LCD (sim/parts/lcd1602p.js) descodifica os impulsos de E. Pinos trocados ou mal
// ligados dão lixo no ecrã, como no real. Modos de 4 bits (6 ou 7 argumentos) e 8 bits
// (10 ou 11 argumentos; com RW se houver um argumento a mais).
import * as i18n from '../../../../../shared/i18n.js'
const enc = new TextEncoder()

export default {
  header: 'LiquidCrystal.h',
  // byte(0): conversão usada com lcd.write(byte(0)) nos carateres personalizados
  globals: { LCD_5x8DOTS: 0, LCD_5x10DOTS: 4, byte: (v) => (typeof v === 'string' ? v.charCodeAt(0) : Number(v)) & 0xff },
  classes: {
    LiquidCrystal: (env) =>
      class LiquidCrystal {
        constructor(...a) {
          a = a.map(Number)
          if (a.length === 6) [this.rs, this.en, ...this.data] = a
          else if (a.length === 7) [this.rs, this.rw, this.en, ...this.data] = a
          else if (a.length === 10) [this.rs, this.en, ...this.data] = a
          else if (a.length === 11) [this.rs, this.rw, this.en, ...this.data] = a
          else throw new Error(i18n.m('LiquidCrystal: use (rs, en, d4, d5, d6, d7) ou (rs, en, d0…d7) — com rw depois de rs se o ligar a um pino', 'LiquidCrystal: use (rs, en, d4, d5, d6, d7) or (rs, en, d0…d7) — with rw after rs if you connect it to a pin'))
          if (this.rw === undefined) this.rw = 255
          this.bits8 = this.data.length === 8
          this.fn = this.bits8 ? 0x10 : 0x00
          this.ctrl = 0x04
          this.mode = 0x02
          this.lines = 1
          this.offs = [0x00, 0x40, 0x10, 0x50]
        }
        _us(us) {
          env.rt.t += us
        }
        _dw(p, v) {
          env.api.digitalWrite(p, v)
        }
        _pulse() {
          this._dw(this.en, 0)
          this._us(1)
          this._dw(this.en, 1)
          this._us(1) // impulso de E > 450 ns
          this._dw(this.en, 0)
          this._us(100) // as instruções demoram > 37 µs
        }
        _w4(v) {
          for (let i = 0; i < 4; i++) this._dw(this.data[i], (v >> i) & 1)
          this._pulse()
        }
        _w8(v) {
          for (let i = 0; i < 8; i++) this._dw(this.data[i], (v >> i) & 1)
          this._pulse()
        }
        _send(v, rs) {
          this._dw(this.rs, rs)
          if (this.rw !== 255) this._dw(this.rw, 0)
          if (this.bits8) this._w8(v)
          else {
            this._w4(v >> 4)
            this._w4(v)
          }
        }
        command(v) {
          this._send(v & 0xff, 0)
        }
        begin(cols = 16, lines = 1, dots = 0) {
          if (lines > 1) this.fn |= 0x08
          this.lines = lines
          this.cols = cols
          this.setRowOffsets(0x00, 0x40, 0x00 + cols, 0x40 + cols)
          if (dots && lines === 1) this.fn |= 0x04
          const api = env.api
          api.pinMode(this.rs, 'OUTPUT')
          if (this.rw !== 255) api.pinMode(this.rw, 'OUTPUT')
          api.pinMode(this.en, 'OUTPUT')
          for (const p of this.data) api.pinMode(p, 'OUTPUT')
          this._us(50000) // o LCD precisa de >40 ms depois de ligado
          this._dw(this.rs, 0)
          this._dw(this.en, 0)
          if (this.rw !== 255) this._dw(this.rw, 0)
          if (!this.bits8) {
            // sequência "inicialização por instrução" da folha de dados (fig. 24)
            this._w4(0x03)
            this._us(4500)
            this._w4(0x03)
            this._us(4500)
            this._w4(0x03)
            this._us(150)
            this._w4(0x02)
          } else {
            this.command(0x20 | this.fn)
            this._us(4500)
            this.command(0x20 | this.fn)
            this._us(150)
            this.command(0x20 | this.fn)
          }
          this.command(0x20 | this.fn)
          this.ctrl = 0x04
          this.display()
          this.clear()
          this.mode = 0x02
          this.command(0x04 | this.mode)
        }
        setRowOffsets(a, b, c, d) {
          this.offs = [a, b, c, d]
        }
        clear() {
          this.command(0x01)
          this._us(2000)
        }
        home() {
          this.command(0x02)
          this._us(2000)
        }
        setCursor(col, row) {
          let r = Math.max(0, row | 0)
          if (r >= 4) r = 3
          if (r >= this.lines) r = this.lines - 1
          this.command(0x80 | ((col | 0) + this.offs[r]))
        }
        _ctrl(bit, on) {
          this.ctrl = on ? this.ctrl | bit : this.ctrl & ~bit
          this.command(0x08 | this.ctrl)
        }
        display() {
          this._ctrl(0x04, true)
        }
        noDisplay() {
          this._ctrl(0x04, false)
        }
        cursor() {
          this._ctrl(0x02, true)
        }
        noCursor() {
          this._ctrl(0x02, false)
        }
        blink() {
          this._ctrl(0x01, true)
        }
        noBlink() {
          this._ctrl(0x01, false)
        }
        scrollDisplayLeft() {
          this.command(0x18)
        }
        scrollDisplayRight() {
          this.command(0x1c)
        }
        leftToRight() {
          this.mode |= 0x02
          this.command(0x04 | this.mode)
        }
        rightToLeft() {
          this.mode &= ~0x02
          this.command(0x04 | this.mode)
        }
        autoscroll() {
          this.mode |= 0x01
          this.command(0x04 | this.mode)
        }
        noAutoscroll() {
          this.mode &= ~0x01
          this.command(0x04 | this.mode)
        }
        createChar(loc, map) {
          this.command(0x40 | ((loc & 7) << 3))
          for (let i = 0; i < 8; i++) this.write(Number(map?.[i] ?? 0))
        }
        write(c) {
          if (typeof c === 'string') {
            for (const b of this._bytes(c)) this._send(b, 1)
            return c.length
          }
          this._send(Number(c) & 0xff, 1)
          return 1
        }
        // texto → bytes (carateres acima de 0xFF, ex.: "€", vão em UTF-8: aparecem como lixo, como no real)
        _bytes(t) {
          const out = []
          for (const ch of String(t)) {
            const code = ch.charCodeAt(0)
            if (code <= 0xff) out.push(code)
            else out.push(...enc.encode(ch))
          }
          return out
        }
        print(v, base) {
          const t = env.fmt(v, base)
          const bytes = this._bytes(t)
          for (const b of bytes) this._send(b, 1)
          return bytes.length
        }
        println(v = '', base) {
          return this.print(v, base) + this.print('\r\n')
        }
      },
  },
}
