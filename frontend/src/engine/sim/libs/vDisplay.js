// Bibliotecas de visualização e "aliases": MD_MAX72XX + MD_Parola (texto a deslizar em matrizes
// MAX7219 encadeadas), WS2812FX (efeitos para fitas NeoPixel), LiquidCrystal_PCF8574 e hd44780
// (LCD I2C), IRremoteESP8266 (IR no ESP32) e AltSoftSerial (série por software nos pinos fixos).
import { push } from '../parts/_groupA.js'
import { FONT5X7 } from './glcdfont.js'
import liquidCrystalI2C from './LiquidCrystal_I2C.js'
import irRemote from './IRremote.js'
import softwareSerial from './SoftwareSerial.js'
import * as i18n from '../../../../../shared/i18n.js'

// ---------------- MD_MAX72XX (MajicDesigns) ----------------
// coluna 0 = a da direita do dispositivo 0 (o primeiro da cadeia, ligado ao Arduino)
const HW = { PAROLA_HW: 0, GENERIC_HW: 1, ICSTATION_HW: 2, FC16_HW: 3, DR0CR0RR0_HW: 4 }
function mdClass(env) {
  const C = class MD_MAX72XX {
    constructor(type, a, b, c, d) {
      // (tipo, CS, n) com SPI por hardware (DIN 11, CLK 13 no Uno) ou (tipo, DIN, CLK, CS, n)
      if (d === undefined) Object.assign(this, { din: env.board?.consts?.MOSI ?? 11, clk: 13, cs: a, n: b ?? 1 })
      else Object.assign(this, { din: a, clk: b, cs: c, n: d ?? 1 })
      this.n = Math.max(1, Math.min(16, this.n | 0))
      this.buf = new Array(this.n * 8).fill(0).map(() => new Array(8).fill(0)) // [coluna][linha]
      this.auto = true
    }
    _tx(addr, reg, val) {
      env.rt.t += 20 + this.n * 128
      const mods = env.partsOnPin(this.din).filter((q) => q.type === 'max7219')
      if (!mods.length) {
        env.warnOnce(`md${this.din}`, i18n.m(`MD_MAX72XX: nenhuma matriz MAX7219 com DIN ligado ao pino ${this.din} (SPI por hardware: DIN → D11, CLK → D13, CS → o pino indicado).`, `MD_MAX72XX: no MAX7219 matrix with DIN connected to pin ${this.din} (hardware SPI: DIN → D11, CLK → D13, CS → the given pin).`))
        return
      }
      for (const q of mods) push(env.state(q.id), { din: this.din, clk: this.clk, cs: this.cs, addr, reg, val })
    }
    begin() {
      for (let i = 0; i < this.n; i++) {
        this._tx(i, 15, 0)
        this._tx(i, 11, 7)
        this._tx(i, 9, 0)
        this._tx(i, 10, 7)
        this._tx(i, 12, 1)
      }
      this.clear()
      return true
    }
    // envia as 8 linhas de cada dispositivo (bit k = coluna k do dispositivo, 0 à direita)
    update() {
      for (let d = 0; d < this.n; d++)
        for (let r = 0; r < 8; r++) {
          let v = 0
          for (let k = 0; k < 8; k++) if (this.buf[d * 8 + k][r]) v |= 1 << k
          this._tx(d, r + 1, v)
        }
    }
    _auto() {
      if (this.auto) this.update()
    }
    control(a, b, c, d) {
      // control(PARAM, valor) ou control(dev, PARAM, valor) ou control(início, fim, PARAM, valor)
      let [p, v] = c === undefined ? [a, b] : d === undefined ? [b, c] : [c, d]
      if (p === C.INTENSITY) for (let i = 0; i < this.n; i++) this._tx(i, 10, v & 15)
      else if (p === C.SHUTDOWN) for (let i = 0; i < this.n; i++) this._tx(i, 12, v ? 0 : 1)
      else if (p === C.UPDATE) {
        this.auto = !!v
        if (v) this.update()
      }
      return true
    }
    clear(a, b) {
      const from = b === undefined ? (a === undefined ? 0 : a) : a
      const to = b === undefined ? (a === undefined ? this.n - 1 : a) : b
      for (let d = from; d <= to; d++) for (let k = 0; k < 8; k++) this.buf[d * 8 + k] = new Array(8).fill(0)
      this._auto()
    }
    getColumnCount() {
      return this.n * 8
    }
    getDeviceCount() {
      return this.n
    }
    setPoint(r, c, on) {
      if (c < 0 || c >= this.n * 8 || r < 0 || r > 7) return false
      this.buf[c][r] = on ? 1 : 0
      this._auto()
      return true
    }
    getPoint(r, c) {
      return !!this.buf[c]?.[r]
    }
    setColumn(a, b, c) {
      const [col, v] = c === undefined ? [a, b] : [a * 8 + b, c]
      if (col < 0 || col >= this.n * 8) return false
      for (let r = 0; r < 8; r++) this.buf[col][r] = (v >> r) & 1
      this._auto()
      return true
    }
    getColumn(a, b) {
      const col = b === undefined ? a : a * 8 + b
      let v = 0
      for (let r = 0; r < 8; r++) if (this.buf[col]?.[r]) v |= 1 << r
      return v
    }
    setRow(a, b, c) {
      const [d0, d1, r, v] = c === undefined ? [0, this.n - 1, a, b] : [a, a, b, c]
      for (let d = d0; d <= d1; d++) for (let k = 0; k < 8; k++) this.buf[d * 8 + k][r] = (v >> k) & 1
      this._auto()
      return true
    }
    // desenha um carácter 5×7 com o lado direito na coluna `col`; devolve a largura
    setChar(col, ch) {
      const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch
      const g = glyph(code)
      g.forEach((v, i) => {
        const c = col - i
        if (c >= 0 && c < this.n * 8) for (let r = 0; r < 8; r++) this.buf[c][r] = (v >> r) & 1
      })
      this._auto()
      return g.length
    }
    transform(t) {
      // TSL / TSR: desloca tudo uma coluna
      const W = this.n * 8
      if (t === C.TSL) this.buf = [new Array(8).fill(0), ...this.buf.slice(0, W - 1)]
      else if (t === C.TSR) this.buf = [...this.buf.slice(1), new Array(8).fill(0)]
      else if (t === C.TINV) this.buf = this.buf.map((c) => c.map((x) => 1 - x))
      this._auto()
      return true
    }
  }
  Object.assign(C, HW, { INTENSITY: 1, SHUTDOWN: 2, UPDATE: 3, WRAPAROUND: 4, OFF: 0, ON: 1, TSL: 1, TSR: 2, TSU: 3, TSD: 4, TFLR: 5, TFUD: 6, TRC: 7, TINV: 8 })
  return C
}
const glyph = (code) => {
  const i = code >= 32 && code <= 126 ? (code - 32) * 5 : 0
  const cols = FONT5X7.slice(i, i + 5)
  // largura variável como as fontes da Parola: tira as colunas vazias dos lados (exceto o espaço)
  if (code === 32) return [0, 0]
  let a = 0
  let b = cols.length
  while (a < b && !cols[a]) a++
  while (b > a && !cols[b - 1]) b--
  return cols.slice(a, b)
}
const mdMax = { header: 'MD_MAX72xx.h', classes: { MD_MAX72XX: mdClass } }

// ---------------- MD_Parola (MajicDesigns) ----------------
const PA = { PA_LEFT: 0, PA_CENTER: 1, PA_RIGHT: 2, PA_NO_EFFECT: 0, PA_PRINT: 1, PA_SCROLL_UP: 2, PA_SCROLL_DOWN: 3, PA_SCROLL_LEFT: 4, PA_SCROLL_RIGHT: 5, PA_SPRITE: 6, PA_SLICE: 7, PA_MESH: 8, PA_FADE: 9, PA_DISSOLVE: 10, PA_BLINDS: 11, PA_RANDOM: 12, PA_WIPE: 13, PA_WIPE_CURSOR: 14, PA_SCAN_HORIZ: 15, PA_OPENING: 21, PA_CLOSING: 23, PA_GROW_UP: 29, PA_GROW_DOWN: 30 }
const parola = {
  header: 'MD_Parola.h',
  globals: PA,
  classes: {
    MD_Parola: (env) => {
      const MD = mdClass(env)
      return class MD_Parola {
        constructor(type, a, b, c, d) {
          this.mx = new MD(type, a, b, c, d)
          Object.assign(this, { text: '', align: 1, speed: 50, pause: 1000, fxIn: 4, fxOut: 4, state: 'idle', pos: 0, t: 0, inverted: false })
        }
        begin() {
          this.mx.begin()
          this.mx.control(MD.UPDATE, 0)
          return true
        }
        setIntensity(i) {
          this.mx.control(MD.INTENSITY, i)
        }
        displayClear() {
          this.mx.clear()
          this.mx.update()
        }
        displayShutdown(b) {
          this.mx.control(MD.SHUTDOWN, b ? 1 : 0)
        }
        setTextAlignment(a) {
          this.align = a
        }
        setSpeed(s) {
          this.speed = s
        }
        getSpeed() {
          return this.speed
        }
        setPause(p) {
          this.pause = p
        }
        setTextEffect(i, o) {
          this.fxIn = i
          this.fxOut = o ?? i
        }
        setInvert(b) {
          this.inverted = !!b
        }
        // texto → colunas (da esquerda para a direita), 1 coluna de espaço entre letras
        _cols(text) {
          const out = []
          for (const ch of String(text)) {
            out.push(...glyph(ch.charCodeAt(0)), 0)
          }
          out.pop()
          return out
        }
        _draw(cols, x0) {
          // x0 = posição (a partir da esquerda do ecrã) da 1.ª coluna do texto
          const W = this.mx.getColumnCount()
          this.mx.clear()
          cols.forEach((v, i) => {
            const x = x0 + i
            if (x >= 0 && x < W) this.mx.setColumn(W - 1 - x, this.inverted ? ~v & 0xff : v)
          })
          this.mx.update()
        }
        _alignedX(cols) {
          const W = this.mx.getColumnCount()
          return this.align === 0 ? 0 : this.align === 2 ? W - cols.length : Math.floor((W - cols.length) / 2)
        }
        print(text) {
          const cols = this._cols(String(text))
          this._draw(cols, this._alignedX(cols))
          this.state = 'idle'
        }
        write(text) {
          this.print(text)
        }
        displayText(text, align, speed, pause, fxIn, fxOut) {
          Object.assign(this, { text: String(text), align: align ?? this.align, speed: speed ?? this.speed, pause: pause ?? this.pause, fxIn: fxIn ?? this.fxIn, fxOut: fxOut ?? fxIn ?? this.fxOut })
          const known = [0, 1, 4, 5]
          if (!known.includes(this.fxIn) || !known.includes(this.fxOut)) env.warnOnce('parola-fx', i18n.m('MD_Parola: no simulador os efeitos são PA_SCROLL_LEFT, PA_SCROLL_RIGHT, PA_PRINT e PA_NO_EFFECT — os outros aparecem como PA_PRINT.', 'MD_Parola: in the simulator the effects are PA_SCROLL_LEFT, PA_SCROLL_RIGHT, PA_PRINT and PA_NO_EFFECT — the others show as PA_PRINT.'))
          this.displayReset()
        }
        displayScroll(text, align, fx, speed) {
          this.displayText(text, align, speed, 0, fx, fx)
        }
        displayReset() {
          this.state = 'in'
          this.pos = 0
          this.t = env.api.millis()
        }
        displaySuspend() {}
        getZoneStatus() {
          return this.state === 'idle'
        }
        // um passo da animação (chame-o sempre no loop); true quando acabou
        displayAnimate() {
          if (this.state === 'idle') return true
          const now = env.api.millis()
          const cols = this._cols(this.text)
          const W = this.mx.getColumnCount()
          const target = this._alignedX(cols)
          const scroll = (fx) => fx === 4 || fx === 5
          if (this.state === 'in') {
            if (!scroll(this.fxIn)) {
              this._draw(cols, target)
              this.state = 'pause'
              this.t = now
              return false
            }
            if (now - this.t < this.speed) return false
            this.t = now
            this.pos++
            // da direita para a esquerda (SCROLL_LEFT) até à posição alinhada
            const x = this.fxIn === 4 ? W - this.pos : -cols.length + this.pos
            this._draw(cols, x)
            if ((this.fxIn === 4 && x <= target) || (this.fxIn === 5 && x >= target)) {
              this.state = 'pause'
              this.pos = 0
            }
            return false
          }
          if (this.state === 'pause') {
            if (now - this.t < this.pause) return false
            this.state = 'out'
            this.pos = 0
            this.t = now
            return false
          }
          if (this.state === 'out') {
            if (!scroll(this.fxOut)) {
              this.mx.clear()
              this.mx.update()
              this.state = 'idle'
              return true
            }
            if (now - this.t < this.speed) return false
            this.t = now
            this.pos++
            const x = this.fxOut === 4 ? target - this.pos : target + this.pos
            this._draw(cols, x)
            if (x + cols.length <= 0 || x >= W) {
              this.state = 'idle'
              return true
            }
          }
          return false
        }
      }
    },
  },
}

// ---------------- WS2812FX (kitesurfer1404) ----------------
const FX = ['STATIC', 'BLINK', 'BREATH', 'COLOR_WIPE', 'COLOR_WIPE_INV', 'COLOR_WIPE_REV', 'COLOR_WIPE_REV_INV', 'COLOR_WIPE_RANDOM', 'RANDOM_COLOR', 'SINGLE_DYNAMIC', 'MULTI_DYNAMIC', 'RAINBOW', 'RAINBOW_CYCLE', 'SCAN', 'DUAL_SCAN', 'FADE', 'THEATER_CHASE', 'THEATER_CHASE_RAINBOW', 'RUNNING_LIGHTS', 'TWINKLE', 'TWINKLE_RANDOM', 'TWINKLE_FADE', 'TWINKLE_FADE_RANDOM', 'SPARKLE', 'FLASH_SPARKLE', 'HYPER_SPARKLE', 'STROBE', 'STROBE_RAINBOW', 'MULTI_STROBE', 'BLINK_RAINBOW', 'CHASE_WHITE', 'CHASE_COLOR', 'CHASE_RANDOM', 'CHASE_RAINBOW', 'CHASE_FLASH', 'CHASE_FLASH_RANDOM', 'CHASE_RAINBOW_WHITE', 'CHASE_BLACKOUT', 'CHASE_BLACKOUT_RAINBOW', 'COLOR_SWEEP_RANDOM', 'RUNNING_COLOR', 'RUNNING_RED_BLUE', 'RUNNING_RANDOM', 'LARSON_SCANNER', 'COMET', 'FIREWORKS', 'FIREWORKS_RANDOM', 'MERRY_CHRISTMAS', 'FIRE_FLICKER', 'FIRE_FLICKER_SOFT', 'FIRE_FLICKER_INTENSE', 'CIRCUS_COMBUSTUS', 'HALLOWEEN', 'BICOLOR_CHASE', 'TRICOLOR_CHASE', 'TWINKLEFOX']
const wheel = (p) => {
  p = 255 - (p & 255)
  if (p < 85) return [255 - p * 3, 0, p * 3]
  if (p < 170) return ((p -= 85), [0, p * 3, 255 - p * 3])
  return ((p -= 170), [p * 3, 255 - p * 3, 0])
}
const rgbOf = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]
const ws2812fx = {
  header: 'WS2812FX.h',
  globals: { ...Object.fromEntries(FX.map((n, i) => [`FX_MODE_${n}`, i])), RED: 0xff0000, GREEN: 0x00ff00, BLUE: 0x0000ff, WHITE: 0xffffff, BLACK: 0, YELLOW: 0xffff00, CYAN: 0x00ffff, MAGENTA: 0xff00ff, PURPLE: 0x400080, ORANGE: 0xff3000, PINK: 0xff1493, GRAY: 0x101010, ULTRAWHITE: 0xffffffff, DARK: 0x0f0f0f, DIM: 0x3f3f3f },
  classes: {
    WS2812FX: (env) =>
      class WS2812FX {
        constructor(n, pin, type) {
          this.strip = new env.api.Adafruit_NeoPixel(n, pin, type)
          Object.assign(this, { mode: 0, speed: 1000, color: 0xff0000, running: false, step: 0, last: 0 })
        }
        init() {
          this.strip.begin()
        }
        start() {
          this.running = true
          this.last = env.api.millis()
        }
        stop() {
          this.running = false
          this.strip.clear()
          this.strip.show()
        }
        pause() {
          this.running = false
        }
        resume() {
          this.running = true
        }
        isRunning() {
          return this.running
        }
        setBrightness(b) {
          this.strip.setBrightness(b)
        }
        getBrightness() {
          return this.strip.getBrightness?.() ?? 255
        }
        setSpeed(s) {
          this.speed = Math.max(2, s)
        }
        getSpeed() {
          return this.speed
        }
        setMode(m) {
          this.mode = m
          this.step = 0
          if (![0, 1, 2, 3, 8, 11, 12, 13, 15, 16, 17, 18, 26, 43, 44].includes(m)) env.warnOnce(`fx${m}`, i18n.m(`WS2812FX: o efeito ${FX[m] || m} é mostrado como RAINBOW_CYCLE no simulador.`, `WS2812FX: effect ${FX[m] || m} is shown as RAINBOW_CYCLE in the simulator.`))
        }
        getMode() {
          return this.mode
        }
        setColor(r, g, b) {
          this.color = g === undefined ? r : ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)
        }
        getColor() {
          return this.color
        }
        getModeCount() {
          return FX.length
        }
        getModeName(m) {
          return (FX[m] || '').replace(/_/g, ' ').toLowerCase()
        }
        getLength() {
          return this.strip.numPixels()
        }
        setPixelColor(...a) {
          this.strip.setPixelColor(...a)
        }
        show() {
          this.strip.show()
        }
        service() {
          if (!this.running) return
          const now = env.api.millis()
          const n = this.strip.numPixels()
          const per = Math.max(10, this.speed / Math.max(1, n))
          if (now - this.last < per) return
          this.last = now
          const s = this.step++
          const [cr, cg, cb] = rgbOf(this.color)
          const set = (i, r, g, b) => this.strip.setPixelColor(i, r, g, b)
          const all = (r, g, b) => {
            for (let i = 0; i < n; i++) set(i, r, g, b)
          }
          switch (this.mode) {
            case 0:
              all(cr, cg, cb)
              break
            case 1:
              s % 2 ? all(0, 0, 0) : all(cr, cg, cb)
              break
            case 2: {
              const k = (Math.sin(s / 10) + 1) / 2
              all(cr * k, cg * k, cb * k)
              break
            }
            case 3:
              set(s % n, cr, cg, cb)
              if (s % n === n - 1) this.step = 0
              break
            case 8: {
              const [r, g, b] = wheel((s * 37) & 255)
              all(r, g, b)
              break
            }
            case 11: {
              const [r, g, b] = wheel(s & 255)
              all(r, g, b)
              break
            }
            case 13: {
              all(0, 0, 0)
              const p = s % (2 * n - 2 || 1)
              set(p < n ? p : 2 * n - 2 - p, cr, cg, cb)
              break
            }
            case 15: {
              const k = Math.abs(((s % 64) - 32) / 32)
              all(cr * k, cg * k, cb * k)
              break
            }
            case 16:
              for (let i = 0; i < n; i++) (i + s) % 3 === 0 ? set(i, cr, cg, cb) : set(i, 0, 0, 0)
              break
            case 17:
              for (let i = 0; i < n; i++) {
                const [r, g, b] = wheel((i * 256) / n + s)
                ;(i + s) % 3 === 0 ? set(i, r, g, b) : set(i, 0, 0, 0)
              }
              break
            case 18:
              for (let i = 0; i < n; i++) {
                const k = (Math.sin((i + s) / 2) + 1) / 2
                set(i, cr * k, cg * k, cb * k)
              }
              break
            case 26:
              s % 4 ? all(0, 0, 0) : all(cr, cg, cb)
              break
            case 43:
            case 44: {
              for (let i = 0; i < n; i++) set(i, 0, 0, 0)
              const p = s % (2 * n - 2 || 1)
              const head = p < n ? p : 2 * n - 2 - p
              for (let t = 0; t < 4; t++) if (head - t >= 0) set(head - t, cr >> t, cg >> t, cb >> t)
              break
            }
            default:
              for (let i = 0; i < n; i++) {
                const [r, g, b] = wheel((i * 256) / n + s)
                set(i, r, g, b)
              }
          }
          this.strip.show()
        }
      },
  },
}

// ---------------- LCD I2C: LiquidCrystal_PCF8574 e hd44780 ----------------
const LCDI2C = liquidCrystalI2C.classes.LiquidCrystal_I2C
const lcdPcf = {
  header: 'LiquidCrystal_PCF8574.h',
  classes: {
    LiquidCrystal_PCF8574: (env) =>
      class LiquidCrystal_PCF8574 extends LCDI2C(env) {
        constructor(addr = 0x27) {
          super(addr, 16, 2)
        }
        begin(cols = 16, rows = 2) {
          this.cols = cols
          this.rows = rows
          return super.begin()
        }
        setBacklight(v) {
          v ? this.backlight() : this.noBacklight()
        }
      },
  },
}
const hd44780 = [
  { header: 'hd44780.h' },
  {
    header: 'hd44780ioClass/hd44780_I2Cexp.h',
    classes: {
      hd44780_I2Cexp: (env) =>
        class hd44780_I2Cexp extends LCDI2C(env) {
          constructor(addr = 0x27) {
            super(addr, 16, 2)
          }
          begin(cols = 16, rows = 2) {
            this.cols = cols
            this.rows = rows
            super.begin()
            return 0 // hd44780: 0 = sucesso
          }
          setBacklight(v) {
            v ? this.backlight() : this.noBacklight()
          }
        },
    },
  },
]

// ---------------- aliases: IRremoteESP8266, AltSoftSerial ----------------
const irEsp = [
  { ...irRemote, header: 'IRremoteESP8266.h' },
  { header: 'IRrecv.h' },
  { header: 'IRutils.h', env: () => ({ resultToHumanReadableBasic: (r) => `Protocol: NEC\nCode: 0x${(r?.value ?? 0).toString(16).toUpperCase()}\n`, uint64ToString: (v, base = 10) => Number(v).toString(base) }) },
]
const altSoftSerial = {
  header: 'AltSoftSerial.h',
  classes: {
    AltSoftSerial: (env) => {
      const SS = softwareSerial.classes.SoftwareSerial(env)
      // pinos fixos da AltSoftSerial: RX 8 / TX 9 no Uno, RX 48 / TX 46 no Mega
      return class AltSoftSerial extends SS {
        constructor() {
          const mega = env.board?.id === 'mega'
          super(mega ? 48 : 8, mega ? 46 : 9)
        }
      }
    },
  },
}

export const LIBS_V_DISPLAY = [mdMax, parola, ws2812fx, lcdPcf, ...hd44780, ...irEsp, altSoftSerial]
