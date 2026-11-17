// TM1637Display (avishorp): display de 4 dígitos por 2 fios (CLK, DIO).
// Cada escrita envia os segmentos + o controlo de brilho; ~bitDelay × 19 por byte.
// Como no real, sem setBrightness() o brilho fica a 0 com o display desligado.
import { push } from '../parts/_groupA.js'
import * as i18n from '../../../../../shared/i18n.js'

const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71]
const MINUS = 0x40

export default {
  header: 'TM1637Display.h',
  globals: { SEG_A: 0x01, SEG_B: 0x02, SEG_C: 0x04, SEG_D: 0x08, SEG_E: 0x10, SEG_F: 0x20, SEG_G: 0x40, SEG_DP: 0x80 },
  classes: {
    TM1637Display: (env) =>
      class TM1637Display {
        constructor(clk, dio, bitDelay = 100) {
          Object.assign(this, { clk, dio, bd: bitDelay, bright: 0 })
        }
        setBrightness(b, on = true) {
          this.bright = (b & 7) | (on ? 0x08 : 0)
        }
        setSegments(segs, length = 4, pos = 0) {
          const arr = Array.from(segs || [], (v) => Number(v) & 0xff).slice(0, length)
          env.rt.t += ((arr.length + 3) * 19 + 12) * this.bd
          const mods = env.partsOnPin(this.clk).filter((q) => q.type === 'tm1637')
          if (!mods.length) {
            env.warnOnce(`tm${this.clk}`, i18n.m(`TM1637Display: nenhum display TM1637 com CLK ligado ao pino ${this.clk}. Ordem: TM1637Display(CLK, DIO).`, `TM1637Display: no TM1637 display with CLK connected to pin ${this.clk}. Order: TM1637Display(CLK, DIO).`))
            return
          }
          for (const q of mods) push(env.state(q.id), { clk: this.clk, dio: this.dio, segs: arr, pos: pos | 0, ctrl: this.bright }, 500)
        }
        clear() {
          this.setSegments([0, 0, 0, 0])
        }
        encodeDigit(d) {
          return DIGITS[d & 0x0f]
        }
        showNumberDec(num, leadingZero = false, length = 4, pos = 0) {
          this.showNumberDecEx(num, 0, leadingZero, length, pos)
        }
        showNumberDecEx(num, dots = 0, leadingZero = false, length = 4, pos = 0) {
          num = Math.trunc(num)
          this._base(num < 0 ? -10 : 10, num < 0 ? -num : num, dots, leadingZero, length, pos)
        }
        showNumberHexEx(num, dots = 0, leadingZero = false, length = 4, pos = 0) {
          this._base(16, Math.trunc(num) & 0xffff, dots, leadingZero, length, pos)
        }
        // igual a showNumberBaseEx da biblioteca
        _base(base, num, dots, leadingZero, length, pos) {
          let negative = false
          if (base < 0) {
            base = -base
            negative = true
          }
          length = Math.max(1, Math.min(4, length | 0))
          const digits = new Array(length).fill(0)
          if (num === 0 && !leadingZero) {
            digits[length - 1] = this.encodeDigit(0)
          } else {
            for (let i = length - 1; i >= 0; --i) {
              const d = num % base
              if (d === 0 && num === 0 && !leadingZero) digits[i] = 0
              else digits[i] = this.encodeDigit(d)
              if (d === 0 && num === 0 && negative) {
                digits[i] = MINUS
                negative = false
              }
              num = Math.floor(num / base)
            }
          }
          if (dots) {
            for (let i = 0; i < length; i++) {
              digits[i] |= dots & 0x80
              dots = (dots << 1) & 0xff
            }
          }
          this.setSegments(digits, length, pos)
        }
      },
  },
}
