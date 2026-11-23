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
          Object.assign(this, { addr, cols, rows, ac: 0 })
        }
        // o estado vive no próprio módulo LCD (persiste se o Arduino reiniciar): a DDRAM do
        // HD44780 (2 linhas de 40 caracteres) e o deslocamento do ecrã; o que se vê (L.lines)
        // depende do tamanho REAL do ecrã — 16×2 ou 20×4, com as linhas 3 e 4 a continuar as
        // linhas 1 e 2 — e não do que se passou ao construtor
        _lcd() {
          const p = env.i2c(this.addr, 'lcd1602') || env.i2c(this.addr, 'lcd2004')
          if (!p) {
            env.warnOnce(`lcd${this.addr}`, i18n.m(`LCD I2C 0x${this.addr.toString(16).toUpperCase()} não responde: ligue ${i2cHint(env)} e confirme o endereço nas propriedades do LCD.`, `I2C LCD 0x${this.addr.toString(16).toUpperCase()} does not respond: connect ${i2cHint(env)} and check the address in the LCD properties.`))
            return null
          }
          if (!env.powered(p.id)) return null
          const L = env.live(p.id)
          if (!L.lines || !L.dd) {
            Object.assign(L, { dd: [' '.repeat(40), ' '.repeat(40)], shift: 0, backlight: false, display: true, cursor: false, blink: false, cx: 0, cy: 0 })
            this._show(L, p)
          }
          L._geo = p.type === 'lcd2004' ? [20, 4] : [16, 2]
          return L
        }
        // DDRAM → linhas visíveis no ecrã físico
        _show(L, p) {
          const [pc, pr] = p ? (p.type === 'lcd2004' ? [20, 4] : [16, 2]) : L._geo || [16, 2]
          L.lines = Array.from({ length: pr }, (_, r) => {
            const src = L.dd[r % 2]
            const start = (r >= 2 ? pc : 0) + L.shift
            let t = ''
            for (let c = 0; c < pc; c++) t += src[(((start + c) % 40) + 40) % 40]
            return t
          })
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
          this.ac = 0
          if (L) {
            Object.assign(L, { dd: [' '.repeat(40), ' '.repeat(40)], shift: 0, display: true })
            this._show(L)
          }
        }
        clear() {
          const L = this._lcd()
          if (L) {
            Object.assign(L, { dd: [' '.repeat(40), ' '.repeat(40)], shift: 0 })
            this._show(L)
          }
          this.ac = 0
          env.rt.t += 2000
        }
        home() {
          const L = this._lcd()
          if (L) {
            L.shift = 0
            this._show(L)
          }
          this.ac = 0
          env.rt.t += 2000
        }
        // como na biblioteca: endereços de linha 0x00, 0x40, 0x00 + colunas, 0x40 + colunas
        setCursor(c, r) {
          const row = Math.max(0, Math.min(this.rows - 1, r | 0))
          this.ac = (Math.max(0, c | 0) + [0x00, 0x40, this.cols, 0x40 + this.cols][row & 3]) & 0x7f
          this._bytes(1)
        }
        _put(ch) {
          const L = this._lcd()
          const line = this.ac >= 0x40 ? 1 : 0
          const col = this.ac & 0x3f
          if (L && col < 40) {
            L.dd[line] = L.dd[line].slice(0, col) + ch + L.dd[line].slice(col + 1)
            L.cx = col + 1
            L.cy = line
            this._show(L)
          }
          // o contador de endereços passa do fim da 1.ª linha (0x27) para a 2.ª (0x40) e vice-versa
          this.ac = this.ac === 0x27 ? 0x40 : this.ac === 0x67 ? 0x00 : (this.ac + 1) & 0x7f
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
          if (!L) return
          L.shift = (L.shift + 1) % 40
          this._show(L)
        }
        scrollDisplayRight() {
          const L = this._lcd()
          if (!L) return
          L.shift = (L.shift + 39) % 40
          this._show(L)
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
