// SevSeg (Dean Reading): displays de 7 segmentos multiplexados. refreshDisplay() tem de
// ser chamado sem parar no loop(): acende um dígito de cada vez (~2 ms cada), escrevendo
// nos pinos do Arduino — o display vê a multiplexagem real.
// Segmentos por bit: A=bit0 … G=bit6, DP=bit7.
import * as i18n from '../../../../../shared/i18n.js'
const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71]
const CHARS = {
  ' ': 0, '-': 0x40, _: 0x08, '.': 0x80, A: 0x77, B: 0x7c, C: 0x39, D: 0x5e, E: 0x79, F: 0x71, G: 0x3d, H: 0x76, I: 0x30, J: 0x1e, L: 0x38, N: 0x54, O: 0x3f,
  P: 0x73, Q: 0x67, R: 0x50, S: 0x6d, T: 0x78, U: 0x3e, Y: 0x6e, Z: 0x5b, c: 0x58, h: 0x74, o: 0x5c, r: 0x50, u: 0x1c, n: 0x54,
}
// [nível que liga o dígito, nível que liga o segmento]
const HW = { 0: [0, 1], 1: [1, 0], 2: [1, 1], 3: [0, 0] }

export default {
  header: 'SevSeg.h',
  globals: { COMMON_CATHODE: 0, COMMON_ANODE: 1, N_TRANSISTORS: 2, P_TRANSISTORS: 3, NP_COMMON_CATHODE: 1, NP_COMMON_ANODE: 0 },
  classes: {
    SevSeg: (env) =>
      class SevSeg {
        constructor() {
          Object.assign(this, { n: 0, digits: [], segs: [], on: [0, 1], codes: [], cur: -1, last: 0, holdUs: 2000, ready: false })
        }
        begin(hw, n, digitPins, segmentPins, resOnSegs = false, updateWithDelays = false, leadingZeros = false, disableDP = false) {
          const { pinMode } = env.api
          this.n = Math.max(1, Math.min(8, n | 0))
          this.digits = Array.from(digitPins || []).slice(0, this.n)
          this.segs = Array.from(segmentPins || []).slice(0, disableDP ? 7 : 8)
          this.on = HW[hw] ?? HW[0]
          this.leadingZeros = !!leadingZeros
          this.codes = new Array(this.n).fill(0)
          for (const p of [...this.digits, ...this.segs]) pinMode(p, 'OUTPUT')
          this.blankPins()
          this.ready = true
          void resOnSegs
          void updateWithDelays
        }
        blankPins() {
          const { digitalWrite } = env.api
          for (const p of this.digits) digitalWrite(p, 1 - this.on[0])
          for (const p of this.segs) digitalWrite(p, 1 - this.on[1])
        }
        setBrightness(b) {
          // -200…200: mais brilho = mais tempo aceso por dígito
          this.holdUs = 500 + Math.max(0, Math.min(200, (Number(b) || 0) + 200)) * 6
        }
        refreshDisplay() {
          env.rt.t += 12
          if (!this.ready) return env.warnOnce('sevsegbegin', i18n.m('SevSeg: falta sevseg.begin(…) no setup().', 'SevSeg: sevseg.begin(…) is missing in setup().'))
          if (this.cur >= 0 && env.rt.t - this.last < this.holdUs) return
          const { digitalWrite } = env.api
          if (this.cur >= 0) digitalWrite(this.digits[this.cur], 1 - this.on[0])
          this.cur = (this.cur + 1) % this.n
          const code = this.codes[this.cur] || 0
          this.segs.forEach((p, i) => digitalWrite(p, (code >> i) & 1 ? this.on[1] : 1 - this.on[1]))
          digitalWrite(this.digits[this.cur], this.on[0])
          this.last = env.rt.t
        }
        blank() {
          this.codes.fill(0)
        }
        setNumber(num, dec = -1, hex = false) {
          this._num(Math.trunc(Number(num) || 0), dec, hex ? 16 : 10)
        }
        setNumberF(num, dec = -1, hex = false) {
          const d = Math.max(0, dec)
          this._num(Math.round((Number(num) || 0) * Math.pow(10, d)), dec, hex ? 16 : 10)
        }
        _num(v, dec, base) {
          const neg = v < 0
          let a = Math.abs(v)
          const max = Math.pow(base, neg ? this.n - 1 : this.n)
          if (a >= max) {
            this.codes.fill(0x40) // "----" quando não cabe
            return
          }
          const out = new Array(this.n).fill(0)
          for (let i = this.n - 1; i >= 0; i--) {
            const lead = a === 0 && i < this.n - 1 && (dec < 0 || i < this.n - 1 - dec)
            out[i] = lead && !this.leadingZeros ? 0 : DIGITS[a % base]
            a = Math.floor(a / base)
          }
          if (neg) {
            const k = out.findIndex((c) => c !== 0)
            out[Math.max(0, (k < 0 ? this.n : k) - 1)] = 0x40
          }
          if (dec > 0 && dec < this.n) out[this.n - 1 - dec] |= 0x80
          this.codes = out
        }
        setChars(str) {
          const out = new Array(this.n).fill(0)
          let k = 0
          for (const ch of String(str)) {
            if (ch === '.' && k > 0) out[k - 1] |= 0x80
            else if (k < this.n) out[k++] = /\d/.test(ch) ? DIGITS[+ch] : CHARS[ch] ?? CHARS[ch.toUpperCase()] ?? 0
          }
          this.codes = out
        }
        setSegments(codes) {
          this.codes = Array.from({ length: this.n }, (_, i) => codes?.[i] ?? 0)
        }
      },
  },
}
