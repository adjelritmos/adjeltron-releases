import { i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'
// LiquidCrystal_I2C: escreve no LCD 16×2 que está no barramento I2C (A4/A5)
// com o endereço indicado. Cada byte por I2C a 100 kHz demora ~0,3 ms.
export default {
  header: 'LiquidCrystal_I2C.h',
  classes: {
    LiquidCrystal_I2C: (env) =>
      class LiquidCrystal_I2C {
        constructor(addr = 0x27, cols = 16, rows = 2) {
          Object.assign(this, { addr, cols, rows, cx: 0, cy: 0 })
        }
        // o estado vive no próprio módulo LCD (persiste se o Arduino reiniciar)
        _lcd() {
          const p = env.i2c(this.addr)
          if (!p) {
            env.warnOnce(`lcd${this.addr}`, i18n.m(`LCD I2C 0x${this.addr.toString(16).toUpperCase()} não responde: ligue ${i2cHint(env)} e confirme o endereço nas propriedades do LCD.`, `I2C LCD 0x${this.addr.toString(16).toUpperCase()} does not respond: connect ${i2cHint(env)} and check the address in the LCD properties.`))
            return null
          }
          if (!env.powered(p.id)) return null
          const L = env.live(p.id)
          if (!L.lines) Object.assign(L, { lines: Array.from({ length: this.rows }, () => ' '.repeat(this.cols)), backlight: false, display: true, cursor: false, blink: false, cx: 0, cy: 0 })
          return L
        }
        _bytes(n) {
          env.rt.t += n * 300
        }
        init() {
          this.begin()
        }
        begin() {
          const L = this._lcd()
          env.rt.t += 50000 // sequência de arranque do HD44780 (~50 ms)
          if (L) Object.assign(L, { lines: Array.from({ length: this.rows }, () => ' '.repeat(this.cols)), display: true })
        }
        clear() {
          const L = this._lcd()
          if (L) L.lines = L.lines.map(() => ' '.repeat(this.cols))
          this.cx = this.cy = 0
          env.rt.t += 2000
        }
        home() {
          this.cx = this.cy = 0
          env.rt.t += 2000
        }
        setCursor(c, r) {
          this.cx = Math.max(0, c | 0)
          this.cy = Math.max(0, Math.min(this.rows - 1, r | 0))
          this._bytes(1)
        }
        _put(ch) {
          const L = this._lcd()
          if (L && this.cx < 40) {
            const line = L.lines[this.cy].padEnd(Math.max(this.cols, this.cx + 1))
            L.lines[this.cy] = line.slice(0, this.cx) + ch + line.slice(this.cx + 1)
            L.cx = this.cx + 1
            L.cy = this.cy
          }
          this.cx++
          this._bytes(1)
        }
        print(v, base) {
          const t = env.fmt(v, base)
          for (const ch of t) this._put(ch)
          return t.length
        }
        // no LCD, println escreve dois caracteres "estranhos" (CR/LF) — tal como no real
        println(v = '', base) {
          return this.print(v, base) + (this.print('▒▒') && 2)
        }
        write(c) {
          this._put(typeof c === 'number' ? String.fromCharCode(c < 16 ? c & 7 : c) : String(c))
          return 1
        }
        backlight() {
          const L = this._lcd()
          if (L) L.backlight = true
          this._bytes(1)
        }
        noBacklight() {
          const L = this._lcd()
          if (L) L.backlight = false
          this._bytes(1)
        }
        setBacklight(v) {
          return v ? this.backlight() : this.noBacklight()
        }
        display() {
          const L = this._lcd()
          if (L) L.display = true
        }
        noDisplay() {
          const L = this._lcd()
          if (L) L.display = false
        }
        cursor() {
          const L = this._lcd()
          if (L) L.cursor = true
        }
        noCursor() {
          const L = this._lcd()
          if (L) L.cursor = false
        }
        blink() {
          const L = this._lcd()
          if (L) L.blink = true
        }
        noBlink() {
          const L = this._lcd()
          if (L) L.blink = false
        }
        scrollDisplayLeft() {
          const L = this._lcd()
          if (L) L.lines = L.lines.map((l) => l.slice(1) + l[0])
        }
        scrollDisplayRight() {
          const L = this._lcd()
          if (L) L.lines = L.lines.map((l) => l[l.length - 1] + l.slice(0, -1))
        }
        createChar(n, bytes) {
          const L = this._lcd()
          if (!L) return
          // CGRAM: 8 carateres × 8 linhas (como no HD44780; o browser desenha os códigos 0–7)
          const cg = L.cg ? L.cg.slice() : new Array(64).fill(0)
          for (let i = 0; i < 8; i++) cg[(n & 7) * 8 + i] = Number(bytes?.[i] ?? 0) & 0x1f
          L.cg = cg
        }
        leftToRight() {}
        rightToLeft() {}
        autoscroll() {}
        noAutoscroll() {}
      },
  },
}
