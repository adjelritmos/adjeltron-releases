// Adafruit_NeoPixel: LEDs WS2812B. show() envia a trama de bytes (na ordem do
// tipo indicado: NEO_GRB, NEO_RGB…) às fitas/anéis cujo DIN está na rede do pino.
// Tal como no real, show() demora ~30 µs por LED e um tipo errado troca as cores.
import { push } from '../parts/_groupA.js'
import { NEO_TYPES } from '../parts/neopixel.js'
import * as i18n from '../../../../../shared/i18n.js'

// ordem dos bytes: bits 7–6 = posição do W, 5–4 do R, 3–2 do G, 1–0 do B
const ORD = (w, r, g, b) => (w << 6) | (r << 4) | (g << 2) | b
const globals = {
  NEO_RGB: ORD(0, 0, 1, 2), NEO_RBG: ORD(0, 0, 2, 1), NEO_GRB: ORD(1, 1, 0, 2), NEO_GBR: ORD(2, 2, 0, 1), NEO_BRG: ORD(1, 1, 2, 0), NEO_BGR: ORD(2, 2, 1, 0),
  NEO_WRGB: ORD(0, 1, 2, 3), NEO_RGBW: ORD(3, 0, 1, 2), NEO_GRBW: ORD(3, 1, 0, 2), NEO_BRGW: ORD(3, 1, 2, 0), NEO_WGRB: ORD(0, 2, 1, 3),
  NEO_KHZ800: 0x0000, NEO_KHZ400: 0x0100,
}

const gamma8 = (x) => Math.round(Math.pow((x & 255) / 255, 2.6) * 255)
const pack = (r, g, b, w = 0) => (((w & 255) << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0

export default {
  header: 'Adafruit_NeoPixel.h',
  globals,
  classes: {
    Adafruit_NeoPixel: (env) =>
      class Adafruit_NeoPixel {
        constructor(n = 0, pin = 6, type = globals.NEO_GRB) {
          this.pin = pin
          this.bright = 0 // 0 = sem escala (como na biblioteca: brilho guardado + 1)
          this.begun = false
          this.updateType(type)
          this.updateLength(n)
        }
        updateLength(n) {
          this.n = Math.max(0, n | 0)
          this.px = Array.from({ length: this.n }, () => [0, 0, 0, 0])
        }
        updateType(t) {
          this.type = t
          this.rOff = (t >> 4) & 3
          this.gOff = (t >> 2) & 3
          this.bOff = t & 3
          this.wOff = (t >> 6) & 3
          this.bpp = this.wOff === this.rOff ? 3 : 4
        }
        setPin(p) {
          this.pin = p
          if (this.begun) this.begin()
        }
        begin() {
          env.api.pinMode(this.pin, 'OUTPUT')
          env.api.digitalWrite(this.pin, 0)
          this.begun = true
        }
        show() {
          env.rt.t += 30 * this.n + 50 // 24 bits a 800 kHz por LED + 50 µs de "reset"
          if (!this.begun) {
            env.warnOnce(`neobegin${this.pin}`, i18n.m(`Adafruit_NeoPixel: show() sem begin() — o pino ${this.pin} não está configurado como saída e os LEDs não recebem nada.`, `Adafruit_NeoPixel: show() without begin() — pin ${this.pin} is not configured as an output and the LEDs receive nothing.`))
            return
          }
          const targets = env.partsOnPin(this.pin).filter((q) => NEO_TYPES.has(q.type))
          if (!targets.length) {
            env.warnOnce(`neo${this.pin}`, i18n.m(`Adafruit_NeoPixel: nenhuma fita/anel NeoPixel ligado ao pino ${this.pin} (fio do pino → DIN).`, `Adafruit_NeoPixel: no NeoPixel strip/ring connected to pin ${this.pin} (wire from pin → DIN).`))
            return
          }
          const scale = this.bright ? (v) => (v * this.bright) >> 8 : (v) => v
          const bytes = new Array(this.n * this.bpp)
          this.px.forEach(([r, g, b, w], i) => {
            const o = i * this.bpp
            bytes[o + this.rOff] = scale(r)
            bytes[o + this.gOff] = scale(g)
            bytes[o + this.bOff] = scale(b)
            if (this.bpp === 4) bytes[o + this.wOff] = scale(w)
          })
          for (const q of targets) push(env.state(q.id), { pin: this.pin, bytes }, 50)
        }
        setPixelColor(i, r, g, b, w) {
          i |= 0
          if (i < 0 || i >= this.n) return
          if (g === undefined) {
            const c = Number(r) >>> 0
            this.px[i] = [(c >> 16) & 255, (c >> 8) & 255, c & 255, (c >>> 24) & 255]
          } else this.px[i] = [r & 255, g & 255, b & 255, (w ?? 0) & 255]
          env.rt.t += 2
        }
        getPixelColor(i) {
          const p = this.px[i | 0]
          return p ? pack(p[0], p[1], p[2], p[3]) : 0
        }
        fill(c = 0, first = 0, count = 0) {
          first |= 0
          const end = count > 0 ? Math.min(this.n, first + count) : this.n
          for (let i = first; i < end; i++) this.setPixelColor(i, c)
        }
        clear() {
          for (const p of this.px) p.fill(0)
          env.rt.t += this.n
        }
        setBrightness(b) {
          this.bright = ((b | 0) + 1) & 255
        }
        getBrightness() {
          return (this.bright - 1) & 255
        }
        numPixels() {
          return this.n
        }
        getPin() {
          return this.pin
        }
        canShow() {
          return true
        }
        Color(r, g, b, w) {
          return pack(r, g, b, w ?? 0)
        }
        // igual à biblioteca: matiz 0–65535, saturação e valor 0–255
        ColorHSV(hue = 0, sat = 255, val = 255) {
          let r
          let g
          let b
          hue = Math.floor(((hue & 0xffff) * 1530 + 32768) / 65536)
          if (hue < 510) {
            b = 0
            if (hue < 255) [r, g] = [255, hue]
            else [r, g] = [510 - hue, 255]
          } else if (hue < 1020) {
            r = 0
            if (hue < 765) [g, b] = [255, hue - 510]
            else [g, b] = [1020 - hue, 255]
          } else if (hue < 1530) {
            g = 0
            if (hue < 1275) [r, b] = [hue - 1020, 255]
            else [r, b] = [255, 1530 - hue]
          } else [r, g, b] = [255, 0, 0]
          const v1 = 1 + (val & 255)
          const s1 = 1 + (sat & 255)
          const s2 = 255 - (sat & 255)
          const f = (x) => ((((x * s1) >> 8) + s2) * v1) >> 8
          return pack(f(r), f(g), f(b))
        }
        gamma32(c) {
          c = Number(c) >>> 0
          return pack(gamma8(c >> 16), gamma8(c >> 8), gamma8(c), gamma8(c >>> 24))
        }
        gamma8(x) {
          return gamma8(x)
        }
        sine8(x) {
          return Math.round(127.5 + 127.5 * Math.sin(((x & 255) / 256) * 2 * Math.PI))
        }
        rainbow(first = 0, reps = 1, sat = 255, val = 255, gammify = true) {
          for (let i = 0; i < this.n; i++) {
            const c = this.ColorHSV(first + Math.floor((i * reps * 65536) / this.n), sat, val)
            this.setPixelColor(i, gammify ? this.gamma32(c) : c)
          }
        }
      },
  },
}
