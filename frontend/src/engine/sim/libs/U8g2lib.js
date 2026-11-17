// U8g2 (subconjunto) para OLED 128×64: SSD1306 (I2C ou SPI) e SH1106 (I2C).
// Classes U8G2_<CONTROLADOR>_128X64_<VARIANTE>_<F|1|2>_<HW_I2C|SW_I2C|4W_HW_SPI|4W_SW_SPI>.
// Os tipos de letra (u8g2_font_ncenB08_tr…) chegam como texto (compiler-g.js) e são
// aproximados pelo 5×7 ampliado conforme a altura indicada no nome. Como na real, drawStr(x, y)
// usa y como linha de base. Nas variantes _1 / _2 (memória de página) desenha-se entre
// firstPage() e nextPage(); sendBuffer() aí só envia a primeira página (como no real).
// A imagem vai para a peça como na Adafruit_SSD1306 (live.fb, 1 bit por ponto).
import { glyph } from './glcdfont.js'
import { i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const globals = { U8G2_R0: 0, U8G2_R1: 1, U8G2_R2: 2, U8G2_R3: 3, U8G2_MIRROR: 4, U8X8_PIN_NONE: 255, U8G2_BTN_BW1: 1 }
const CTRL = { SSD1306_128X64_NONAME: 'ssd1306', SSD1306_128X64_VCOMH0: 'ssd1306', SSD1306_128X64_ALT0: 'ssd1306', SH1106_128X64_NONAME: 'sh1106', SH1106_128X64_VCOMH0: 'sh1106', SH1106_128X64_WINSTAR: 'sh1106', SSD1306_128X32_UNIVISION: 'ssd1306x32' }
const BUSES = ['HW_I2C', 'SW_I2C', '4W_HW_SPI', '4W_SW_SPI']
const NAMES = { ssd1306: 'SSD1306', sh1106: 'SH1106', ssd1306x32: 'SSD1306 128×32' }

// altura (px) indicada no nome do tipo de letra
export function fontHeight(name) {
  const n = String(name || '').replace(/^u8g2_font_/, '')
  let m = n.match(/^(\d+)x(\d+)/)
  if (m) return +m[2]
  if (/^unifont/.test(n)) return 16
  m = n.match(/open_iconic_\w+_(\d)x/)
  if (m) return 8 * +m[1]
  m = n.match(/(\d+)(?:_[a-z0-9]+)?$/)
  if (m && +m[1] >= 4 && +m[1] <= 80) return +m[1]
  m = n.match(/(\d+)/)
  return m && +m[1] >= 4 && +m[1] <= 80 ? +m[1] : 8
}

function toBase64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function make(env, ctrl, mode, bus, clsName) {
  const ptype = ctrl === 'sh1106' ? 'sh1106' : bus.includes('SPI') ? 'ssd1306spi' : 'ssd1306'
  const label = `U8g2 (${NAMES[ctrl]})`
  return class {
    constructor(rot = 0, ...a) {
      this.rot = rot & 3
      if (bus === 'HW_I2C') this.pins = { rst: a[0] }
      else if (bus === 'SW_I2C') this.pins = { scl: a[0], sda: a[1], rst: a[2] }
      else if (bus === '4W_HW_SPI') this.pins = { cs: a[0], dc: a[1], rst: a[2] }
      else this.pins = { sck: a[0], mosi: a[1], cs: a[2], dc: a[3], rst: a[4] }
      this.W = 128
      this.H = 64
      this.buf = new Uint8Array(128 * 64)
      this.addr = 0x3c
      this.color = 1
      this.fontMode = 0
      this.s = 1
      this.fontPos = 'base'
      this.cx = 0
      this.cy = 0
      this.part = null
      this.paged = mode !== 'F'
      this.inPage = false
    }
    // ---------- ligação à peça ----------
    _find() {
      const o = this.pins
      if (bus === 'HW_I2C') {
        const p = env.i2c(this.addr, ptype)
        if (!p) {
          const other = env.i2c(this.addr, ptype === 'sh1106' ? 'ssd1306' : 'sh1106')
          const any = env.i2c(null, ptype)
          env.warnOnce(
            `u8g2${this.addr}`,
            other
              ? i18n.m(`${label}: em 0x${this.addr.toString(16).toUpperCase()} está um OLED ${other.type === 'sh1106' ? 'SH1106 (1,3")' : 'SSD1306 (0,96")'} — use a classe U8G2_${other.type === 'sh1106' ? 'SH1106' : 'SSD1306'}_128X64_NONAME_F_HW_I2C.`, `${label}: at 0x${this.addr.toString(16).toUpperCase()} there is a ${other.type === 'sh1106' ? 'SH1106 (1.3")' : 'SSD1306 (0.96")'} OLED — use the class U8G2_${other.type === 'sh1106' ? 'SH1106' : 'SSD1306'}_128X64_NONAME_F_HW_I2C.`)
              : any
                ? i18n.m(`${label}: o ecrã está no endereço 0x${(any.config?.addr ?? 0x3c).toString(16).toUpperCase()} — use setI2CAddress(0x${(any.config?.addr ?? 0x3c).toString(16).toUpperCase()} * 2) antes de begin().`, `${label}: the display is at address 0x${(any.config?.addr ?? 0x3c).toString(16).toUpperCase()} — use setI2CAddress(0x${(any.config?.addr ?? 0x3c).toString(16).toUpperCase()} * 2) before begin().`)
                : i18n.m(`${label}: nenhum OLED ${NAMES[ctrl]} no I2C (${i2cHint(env)}).`, `${label}: no ${NAMES[ctrl]} OLED on I2C (${i2cHint(env)}).`),
          )
        }
        return p
      }
      if (bus === 'SW_I2C') {
        const p = env.partsOnPin(o.sda, ptype).find((q) => env.pinsOf(q.id, 'SDA').includes(o.sda)) || null
        if (!p) env.warnOnce('u8g2sw', i18n.m(`${label}: nenhum OLED com SDA no pino ${o.sda}.`, `${label}: no OLED with SDA on pin ${o.sda}.`))
        else if (!env.pinsOf(p.id, 'SCL').includes(o.scl)) env.warnOnce('u8g2swscl', i18n.m(`${label}: SCL do ecrã não está no pino ${o.scl}.`, `${label}: the display's SCL is not on pin ${o.scl}.`))
        return p
      }
      const p = env.partsOnPin(o.cs, ptype)[0] || null
      if (!p) {
        env.warnOnce('u8g2spi', ctrl === 'sh1106' ? i18n.m(`${label}: o simulador só tem o SH1106 em I2C.`, `${label}: the simulator only has the SH1106 over I2C.`) : i18n.m(`${label}: nenhum OLED SPI com CS no pino ${o.cs}.`, `${label}: no SPI OLED with CS on pin ${o.cs}.`))
        return null
      }
      const hw = { uno: [11, 13], mega: [51, 52], esp32: [23, 18], pico: [19, 18] }[env.board?.id] || [11, 13]
      const [mo, sk] = bus === '4W_SW_SPI' ? [o.mosi, o.sck] : hw
      if (!env.pinsOf(p.id, 'D1').includes(mo) || !env.pinsOf(p.id, 'D0').includes(sk)) {
        env.warnOnce('u8g2spibus', i18n.m(`${label}: D1 do OLED tem de ir ao pino ${mo} e D0 ao ${sk}.`, `${label}: the OLED's D1 must go to pin ${mo} and D0 to ${sk}.`))
        return null
      }
      if (!env.pinsOf(p.id, 'DC').includes(o.dc)) env.warnOnce('u8g2spidc', i18n.m(`${label}: DC do OLED não está no pino ${o.dc}.`, `${label}: the OLED's DC is not on pin ${o.dc}.`))
      return p
    }
    _dev() {
      const p = this.part
      return p && env.powered(p.id) ? p : null
    }
    setI2CAddress(a) {
      this.addr = (a | 0) >> 1
    }
    begin() {
      env.rt.t += 20000
      if (ctrl === 'ssd1306x32') env.warnOnce('u8g2x32', i18n.m(`${label}: a classe é para um OLED de 128×32, mas o ecrã ligado tem 128×64 — só metade das linhas é usada.`, `${label}: the class is for a 128×32 OLED, but the connected display is 128×64 — only half of the lines are used.`))
      this.part = this._find()
      const p = this.part
      if (!p) return false
      if (!env.powered(p.id)) {
        env.warnOnce('u8g2pwr', i18n.m(`${label}: o OLED não tem alimentação (VCC → 5V, GND → GND).`, `${label}: the OLED has no power (VCC → 5V, GND → GND).`))
        return false
      }
      const s = env.state(p.id)
      s.dispOn = true
      s.lit = 0
      Object.assign(env.live(p.id), { on: true, inv: false, dim: false, w: 128, h: 64, scroll: null })
      this.clearDisplay()
      return true
    }
    initDisplay() {
      this.begin()
    }
    // ---------- memória ----------
    _idx(x, y) {
      x = Math.floor(x)
      y = Math.floor(y)
      if (this.rot === 1) [x, y] = [this.W - 1 - y, x]
      else if (this.rot === 2) [x, y] = [this.W - 1 - x, this.H - 1 - y]
      else if (this.rot === 3) [x, y] = [y, this.H - 1 - x]
      const h = ctrl === 'ssd1306x32' ? 32 : this.H
      return x < 0 || y < 0 || x >= this.W || y >= h ? -1 : y * this.W + x
    }
    _px(x, y, c = this.color) {
      const k = this._idx(x, y)
      if (k < 0) return
      if (c === 2) this.buf[k] ^= 1
      else this.buf[k] = c ? 1 : 0
    }
    _send(rows = 64) {
      env.rt.t += rows === 64 ? 25000 : 3200
      const p = this._dev()
      if (!p) return
      const bytes = new Uint8Array(1024)
      let lit = 0
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < 128; x++)
          if (this.buf[y * 128 + x]) {
            bytes[y * 16 + (x >> 3)] |= 0x80 >> (x & 7)
            lit++
          }
      // página de baixo: mantém o que já lá estava no ecrã
      const L = env.live(p.id)
      if (rows < 64 && L.fb) {
        const old = Uint8Array.from(atob(L.fb), (c) => c.charCodeAt(0))
        for (let i = rows * 16; i < 1024; i++) bytes[i] = old[i]
      }
      L.fb = toBase64(bytes)
      L.ver = (L.ver || 0) + 1
      const s = env.state(p.id)
      const f = lit / 8192
      if (Math.abs(f - (s.lit || 0)) > 0.02) {
        s.lit = f
        env.touch()
      }
    }
    clearBuffer() {
      this.buf.fill(0)
      env.rt.t += 60
    }
    sendBuffer() {
      if (this.paged) {
        env.warnOnce('u8g2paged', i18n.m(`${clsName}: com a memória de página (_${mode}) o sendBuffer() só envia as primeiras ${8 * +mode} linhas. Use a classe _F_ ou desenhe entre firstPage() e nextPage().`, `${clsName}: with page memory (_${mode}) sendBuffer() only sends the first ${8 * +mode} lines. Use the _F_ class or draw between firstPage() and nextPage().`))
        return this._send(8 * +mode)
      }
      this._send(64)
    }
    clearDisplay() {
      this.buf.fill(0)
      this._send(64)
    }
    clear() {
      this.clearDisplay()
      this.cx = 0
      this.cy = 0
    }
    firstPage() {
      this.buf.fill(0)
      this.inPage = true
    }
    nextPage() {
      this._send(64)
      this.inPage = false
      return 0
    }
    updateDisplay() {
      this._send(64)
    }
    setPowerSave(on) {
      const p = this._dev()
      if (!p) return
      const L = env.live(p.id)
      L.on = !on
      env.state(p.id).dispOn = !on
      env.touch()
    }
    setContrast(c) {
      const p = this._dev()
      if (p) env.live(p.id).dim = (c | 0) < 40
    }
    setFlipMode(f) {
      this.rot = f ? 2 : 0
    }
    setDisplayRotation(r) {
      this.rot = (r | 0) & 3
    }
    getDisplayWidth() {
      return this.rot & 1 ? 64 : 128
    }
    getDisplayHeight() {
      return this.rot & 1 ? 128 : 64
    }
    getWidth() {
      return this.getDisplayWidth()
    }
    getHeight() {
      return this.getDisplayHeight()
    }
    getBufferPtr() {
      return this.buf
    }
    // ---------- desenho ----------
    setDrawColor(c) {
      this.color = (c | 0) & 3
    }
    getDrawColor() {
      return this.color
    }
    setBitmapMode(m) {
      this.fontMode = m
    }
    drawPixel(x, y) {
      this._px(x, y)
    }
    drawHLine(x, y, w) {
      for (let i = 0; i < w; i++) this._px(x + i, y)
      env.rt.t += 2 + w * 0.3
    }
    drawVLine(x, y, h) {
      for (let i = 0; i < h; i++) this._px(x, y + i)
      env.rt.t += 2 + h * 0.3
    }
    drawLine(x0, y0, x1, y1) {
      x0 = Math.floor(x0)
      y0 = Math.floor(y0)
      x1 = Math.floor(x1)
      y1 = Math.floor(y1)
      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      for (let n = 0; n < 2000; n++) {
        this._px(x0, y0)
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
      env.rt.t += 5 + dx - dy
    }
    drawBox(x, y, w, h) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this._px(x + i, y + j)
      env.rt.t += 5 + w * h * 0.2
    }
    drawFrame(x, y, w, h) {
      this.drawHLine(x, y, w)
      this.drawHLine(x, y + h - 1, w)
      this.drawVLine(x, y + 1, h - 2)
      this.drawVLine(x + w - 1, y + 1, h - 2)
    }
    _inRound(i, j, w, h, r) {
      const cx = i < r ? r : i >= w - r ? w - r - 1 : i
      const cy = j < r ? r : j >= h - r ? h - r - 1 : j
      return (i - cx) ** 2 + (j - cy) ** 2 <= r * r + r * 0.8
    }
    drawRBox(x, y, w, h, r) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this._inRound(i, j, w, h, r)) this._px(x + i, y + j)
    }
    drawRFrame(x, y, w, h, r) {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          if (!this._inRound(i, j, w, h, r)) continue
          const edge = !this._inRound(i - 1, j, w, h, r) || !this._inRound(i + 1, j, w, h, r) || !this._inRound(i, j - 1, w, h, r) || !this._inRound(i, j + 1, w, h, r) || i === 0 || j === 0 || i === w - 1 || j === h - 1
          if (edge) this._px(x + i, y + j)
        }
    }
    drawCircle(x0, y0, r) {
      for (let a = 0; a < 360; a += 90 / Math.max(4, r * 2)) this._px(Math.round(x0 + r * Math.cos((a * Math.PI) / 180)), Math.round(y0 + r * Math.sin((a * Math.PI) / 180)))
      env.rt.t += 10 + r * 4
    }
    drawDisc(x0, y0, r) {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.8) this._px(x0 + i, y0 + j)
      env.rt.t += 10 + r * r
    }
    drawEllipse(x0, y0, rx, ry) {
      for (let a = 0; a < 360; a += 2) this._px(Math.round(x0 + rx * Math.cos((a * Math.PI) / 180)), Math.round(y0 + ry * Math.sin((a * Math.PI) / 180)))
    }
    drawFilledEllipse(x0, y0, rx, ry) {
      for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx || 1) + (j * j) / (ry * ry || 1) <= 1) this._px(x0 + i, y0 + j)
    }
    drawTriangle(x0, y0, x1, y1, x2, y2) {
      const e = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax)
      const A = e(x0, y0, x1, y1, x2, y2) || 1
      for (let y = Math.min(y0, y1, y2); y <= Math.max(y0, y1, y2); y++)
        for (let x = Math.min(x0, x1, x2); x <= Math.max(x0, x1, x2); x++)
          if (e(x1, y1, x2, y2, x, y) * Math.sign(A) >= 0 && e(x2, y2, x0, y0, x, y) * Math.sign(A) >= 0 && e(x0, y0, x1, y1, x, y) * Math.sign(A) >= 0) this._px(x, y)
    }
    // XBM: LSB primeiro em cada byte
    drawXBM(x, y, w, h, bmp) {
      const bw = (w + 7) >> 3
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((bmp?.[j * bw + (i >> 3)] ?? 0) >> (i & 7)) & 1) this._px(x + i, y + j)
      env.rt.t += 10 + w * h * 0.3
    }
    drawXBMP(x, y, w, h, bmp) {
      this.drawXBM(x, y, w, h, bmp)
    }
    drawBitmap(x, y, cnt, h, bmp) {
      for (let j = 0; j < h; j++) for (let i = 0; i < cnt * 8; i++) if (((bmp?.[j * cnt + (i >> 3)] ?? 0) << (i & 7)) & 0x80) this._px(x + i, y + j)
    }
    // ---------- texto ----------
    setFont(f) {
      this.fontName = String(f || '')
      this.s = Math.max(1, Math.round(fontHeight(this.fontName) / 8))
      if (!/^u8g2_font_/.test(this.fontName)) env.warnOnce('u8g2font', i18n.m(`${label}: setFont() com um tipo de letra desconhecido.`, `${label}: setFont() with an unknown font.`))
    }
    setFontMode(m) {
      this.fontMode = m
    }
    setFontDirection() {}
    setFontPosBaseline() {
      this.fontPos = 'base'
    }
    setFontPosTop() {
      this.fontPos = 'top'
    }
    setFontPosCenter() {
      this.fontPos = 'center'
    }
    setFontPosBottom() {
      this.fontPos = 'bottom'
    }
    setFontRefHeightExtendedText() {}
    setFontRefHeightText() {}
    setFontRefHeightAll() {}
    getAscent() {
      return 7 * this.s
    }
    getDescent() {
      return -this.s
    }
    getMaxCharHeight() {
      return 8 * this.s
    }
    getMaxCharWidth() {
      return 6 * this.s
    }
    getStrWidth(t) {
      return String(t ?? '').length * 6 * this.s - this.s
    }
    getUTF8Width(t) {
      return this.getStrWidth(t)
    }
    _top(y) {
      const s = this.s
      return this.fontPos === 'top' ? y : this.fontPos === 'center' ? y - Math.round(3.5 * s) : this.fontPos === 'bottom' ? y - 8 * s : y - 7 * s
    }
    _glyph(x, top, code) {
      const s = this.s
      const g = glyph(code)
      for (let i = 0; i < 5; i++) {
        let line = g[i]
        for (let j = 0; j < 8; j++, line >>= 1) {
          if (line & 1) {
            for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) this._px(x + i * s + a, top + j * s + b)
          } else if (this.fontMode === 0 && this.color !== 2) {
            for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) this._px(x + i * s + a, top + j * s + b, this.color ? 0 : 1)
          }
        }
      }
      env.rt.t += 40 * s * s
      return 6 * s
    }
    drawStr(x, y, t) {
      t = String(t ?? '')
      const top = this._top(y)
      let cx = x
      for (const ch of t) {
        const c = ch.codePointAt(0)
        if (c > 126) env.warnOnce('u8g2utf8', i18n.m(`${label}: os acentos não estão no tipo de letra simulado — escreva sem acentos.`, `${label}: accented letters are not in the simulated font — write without accents.`))
        cx += this._glyph(cx, top, c)
      }
      return cx - x
    }
    drawUTF8(x, y, t) {
      return this.drawStr(x, y, t)
    }
    drawGlyph(x, y, code) {
      return this._glyph(x, this._top(y), code)
    }
    drawButtonUTF8(x, y, flags, w, padH, padV, t) {
      const wd = this.drawStr(x, y, t)
      this.drawFrame(x - padH - 1, y - 7 * this.s - padV - 1, Math.max(w, wd) + 2 * padH + 2, 8 * this.s + 2 * padV + 2)
    }
    setCursor(x, y) {
      this.cx = x | 0
      this.cy = y | 0
    }
    getCursorX() {
      return this.cx
    }
    getCursorY() {
      return this.cy
    }
    write(c) {
      const t = typeof c === 'string' ? c : String.fromCharCode(Number(c) & 0xff)
      for (const ch of t) {
        if (ch === '\n') {
          this.cx = 0
          this.cy += 8 * this.s
        } else if (ch !== '\r') this.cx += this._glyph(this.cx, this._top(this.cy), ch.codePointAt(0))
      }
      return t.length
    }
    print(v, base) {
      return this.write(env.fmt(v, base))
    }
    println(v = '', base) {
      return this.print(v, base) + this.write('\n')
    }
    enableUTF8Print() {}
    home() {
      this.cx = 0
      this.cy = 0
    }
  }
}

const classes = {}
for (const [c, ctrl] of Object.entries(CTRL))
  for (const mode of ['F', '1', '2'])
    for (const bus of BUSES) {
      if (ctrl === 'sh1106' && bus.includes('SPI')) continue
      const name = `U8G2_${c}_${mode}_${bus}`
      classes[name] = (env) => make(env, ctrl, mode, bus, name)
    }
export const U8G2_CLASSES = Object.keys(classes)

export default { header: 'U8g2lib.h', globals, classes }
