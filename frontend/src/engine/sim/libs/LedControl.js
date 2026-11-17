// LedControl: MAX7219 por SPI "bit-bang" (DIN, CLK, CS). Cada chamada envia
// escritas de registo de 16 bits a todas as matrizes da cadeia (~8 µs por bit).
// Guarda uma cópia das linhas (status), como a biblioteca real.
import { push } from '../parts/_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

// tabela de caracteres da LedControl (bits dp a b c d e f g)
const CHAR = new Array(128).fill(0)
;[0x7e, 0x30, 0x6d, 0x79, 0x33, 0x5b, 0x5f, 0x70, 0x7f, 0x7b, 0x77, 0x1f, 0x0d, 0x3d, 0x4f, 0x47].forEach((v, i) => {
  CHAR[i] = v
  if (i < 10) CHAR[48 + i] = v
})
Object.assign(CHAR, { 32: 0, 45: 0x01, 46: 0x80, 95: 0x08, 65: 0x77, 66: 0x1f, 67: 0x0d, 68: 0x3d, 69: 0x4f, 70: 0x47, 72: 0x37, 76: 0x0e, 80: 0x67 })
Object.assign(CHAR, { 97: 0x77, 98: 0x1f, 99: 0x0d, 100: 0x3d, 101: 0x4f, 102: 0x47, 104: 0x17, 108: 0x0e, 112: 0x67 })

export default {
  header: 'LedControl.h',
  classes: {
    LedControl: (env) =>
      class LedControl {
        constructor(din, clk, cs, n = 1) {
          Object.assign(this, { din, clk, cs, n: Math.max(1, Math.min(8, n | 0)) })
          this.status = new Array(this.n * 8).fill(0)
          for (let i = 0; i < this.n; i++) {
            this._tx(i, 15, 0) // sem teste
            this._tx(i, 11, 7) // varre as 8 linhas
            this._tx(i, 9, 0) // sem descodificação
            this.clearDisplay(i)
            this.shutdown(i, true)
          }
        }
        _tx(addr, reg, val) {
          env.rt.t += 20 + this.n * 16 * 8
          const mods = env.partsOnPin(this.din).filter((q) => q.type === 'max7219')
          if (!mods.length) {
            env.warnOnce(`lc${this.din}`, i18n.m(`LedControl: nenhuma matriz MAX7219 com DIN ligado ao pino ${this.din}. Ordem: LedControl(DIN, CLK, CS, n).`, `LedControl: no MAX7219 matrix with DIN connected to pin ${this.din}. Order: LedControl(DIN, CLK, CS, n).`))
            return
          }
          for (const q of mods) push(env.state(q.id), { din: this.din, clk: this.clk, cs: this.cs, addr, reg, val })
        }
        _ok(addr) {
          return addr >= 0 && addr < this.n
        }
        getDeviceCount() {
          return this.n
        }
        shutdown(addr, b) {
          if (this._ok(addr)) this._tx(addr, 12, b ? 0 : 1)
        }
        setScanLimit(addr, limit) {
          if (this._ok(addr) && limit >= 0 && limit < 8) this._tx(addr, 11, limit)
        }
        setIntensity(addr, i) {
          if (this._ok(addr) && i >= 0 && i < 16) this._tx(addr, 10, i)
        }
        clearDisplay(addr) {
          if (!this._ok(addr)) return
          for (let i = 0; i < 8; i++) {
            this.status[addr * 8 + i] = 0
            this._tx(addr, i + 1, 0)
          }
        }
        setLed(addr, row, col, state) {
          if (!this._ok(addr) || row < 0 || row > 7 || col < 0 || col > 7) return
          const k = addr * 8 + row
          const bit = 0x80 >> col
          this.status[k] = state ? this.status[k] | bit : this.status[k] & ~bit
          this._tx(addr, row + 1, this.status[k])
        }
        setRow(addr, row, value) {
          if (!this._ok(addr) || row < 0 || row > 7) return
          this.status[addr * 8 + row] = value & 0xff
          this._tx(addr, row + 1, value & 0xff)
        }
        setColumn(addr, col, value) {
          if (!this._ok(addr) || col < 0 || col > 7) return
          for (let row = 0; row < 8; row++) this.setLed(addr, row, col, (value >> (7 - row)) & 1)
        }
        setDigit(addr, digit, value, dp) {
          if (!this._ok(addr) || digit < 0 || digit > 7 || value < 0 || value > 15) return
          const v = CHAR[value] | (dp ? 0x80 : 0)
          this.status[addr * 8 + digit] = v
          this._tx(addr, digit + 1, v)
        }
        setChar(addr, digit, value, dp) {
          if (!this._ok(addr) || digit < 0 || digit > 7) return
          let i = typeof value === 'string' ? value.charCodeAt(0) : value | 0
          if (i < 0 || i > 127) i = 32
          const v = CHAR[i] | (dp ? 0x80 : 0)
          this.status[addr * 8 + digit] = v
          this._tx(addr, digit + 1, v)
        }
      },
  },
}
