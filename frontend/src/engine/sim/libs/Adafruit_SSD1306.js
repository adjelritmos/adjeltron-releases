// Adafruit_SSD1306 (+ Adafruit_GFX): ecrã OLED 128×64 por I2C.
// Como no real, desenha-se numa memória de 1 KB no Arduino e display() envia-a
// ao ecrã (~25 ms a 400 kHz). Só então o browser recebe a imagem (live.fb, em
// base64, 1 bit por ponto, linha a linha, bit 7 = ponto mais à esquerda).
import { glyph } from './glcdfont.js'
import { i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const C = { BLACK: 0, WHITE: 1, INVERSE: 2 }
const globals = {
  SSD1306_BLACK: 0, SSD1306_WHITE: 1, SSD1306_INVERSE: 2, BLACK: 0, WHITE: 1, INVERSE: 2,
  SSD1306_SWITCHCAPVCC: 0x02, SSD1306_EXTERNALVCC: 0x01,
  SSD1306_DISPLAYOFF: 0xae, SSD1306_DISPLAYON: 0xaf, SSD1306_NORMALDISPLAY: 0xa6, SSD1306_INVERTDISPLAY: 0xa7, SSD1306_SETCONTRAST: 0x81,
}

function toBase64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

export default {
  header: 'Adafruit_SSD1306.h',
  globals,
  classes: {
    Adafruit_SSD1306: (env) =>
      class Adafruit_SSD1306 {
        constructor(w = 128, h = 64, ...rest) {
          // construtor antigo: Adafruit_SSD1306 display(OLED_RESET);
          if (rest.length === 0 && (arguments.length <= 1 || h < 8)) [w, h] = [128, 64]
          this.W = w | 0
          this.H = h | 0
          this.buf = new Uint8Array(this.W * this.H)
          this.rot = 0
          this.cx = 0
          this.cy = 0
          this.sx = 1
          this.sy = 1
          this.fg = 1
          this.bg = 1 // bg == fg: fundo transparente
          this.wrap = true
          this.addr = null
          // versão SPI (peça ssd1306spi): (w, h, &SPI, dc, rst, cs) ou (w, h, mosi, sclk, dc, rst, cs)
          if (rest.length >= 4 && rest[0] && typeof rest[0] === 'object' && rest[0].transfer) this.spi = { dc: rest[1], rst: rest[2], cs: rest[3] }
          else if (rest.length >= 5 && rest.slice(0, 5).every((v) => typeof v === 'number')) this.spi = { mosi: rest[0], sck: rest[1], dc: rest[2], rst: rest[3], cs: rest[4] }
          // I2C por software: Adafruit_SSD1306(w, h, &meuSoftwareWire, rst) — o ecrã está nos pinos dele
          else if (rest[0] && typeof rest[0] === 'object' && rest[0].sda != null && rest[0].scl != null && rest[0]._on) this.sw = rest[0]
        }
        // procura o ecrã no barramento (o do hardware, ou os pinos da SoftwareWire)
        _find(addr) {
          return this.sw ? this.sw._on(() => env.i2c(addr, 'ssd1306')) : env.i2c(addr, 'ssd1306')
        }
        _hint() {
          return this.sw ? i18n.m(`SDA → pino ${this.sw.sda}, SCL → pino ${this.sw.scl} (os da SoftwareWire)`, `SDA → pin ${this.sw.sda}, SCL → pin ${this.sw.scl} (the SoftwareWire ones)`) : i2cHint(env)
        }
        // ---------- ligação ao módulo ----------
        _dev(quiet) {
          if (this.spi) return this._spiDev(quiet)
          const p = this.addr != null ? this._find(this.addr) : null
          if (!p || !env.powered(p.id)) {
            if (!quiet && this.addr != null) env.warnOnce(`oledlost${this.addr}`, i18n.m(`OLED 0x${this.addr.toString(16).toUpperCase()} deixou de responder (sem alimentação ou desligado do I2C).`, `OLED 0x${this.addr.toString(16).toUpperCase()} stopped responding (no power or disconnected from I2C).`))
            return null
          }
          return p
        }
        // ---------- versão SPI de 7 pinos (GND, VCC, D0 = SCK, D1 = MOSI, RES, DC, CS) ----------
        _spiDev(quiet) {
          const o = this.spi
          // sem um begin() bem-sucedido (CS, D0/D1 ou DC mal ligados) o ecrã não recebe nada
          const p = this._spiOk ? env.partsOnPin(o.cs, 'ssd1306spi')[0] || null : null
          if (!p || !env.powered(p.id)) {
            if (!quiet && this._spiOk) env.warnOnce('oledspilost', i18n.m('OLED SPI deixou de responder (sem alimentação ou CS desligado).', 'SPI OLED stopped responding (no power or CS disconnected).'))
            return null
          }
          return p
        }
        _spiBegin() {
          this._spiOk = false
          env.rt.t += 15000
          const o = this.spi
          const p = env.partsOnPin(o.cs, 'ssd1306spi')[0] || null
          if (!p) {
            const any = env.partsOnPin(o.dc, 'ssd1306spi')[0]
            env.warnOnce('oledspi', any ? i18n.m(`OLED SPI: o pino ${o.cs} passado como CS não está ligado ao CS do ecrã (construtor: Adafruit_SSD1306(128, 64, &SPI, DC, RES, CS)). begin() devolveu false.`, `SPI OLED: pin ${o.cs} passed as CS is not connected to the display's CS (constructor: Adafruit_SSD1306(128, 64, &SPI, DC, RES, CS)). begin() returned false.`) : i18n.m(`OLED SPI: nenhum ecrã SSD1306 SPI com CS no pino ${o.cs}. begin() devolveu false.`, `SPI OLED: no SSD1306 SPI display with CS on pin ${o.cs}. begin() returned false.`))
            return false
          }
          const hw = { uno: [11, 13], mega: [51, 52], esp32: [23, 18], pico: [19, 18] }[env.board?.id] || [11, 13]
          const [mo, sk] = o.mosi != null ? [o.mosi, o.sck] : hw
          const has = (pin, n) => env.pinsOf(p.id, pin).includes(n)
          if (!has('D1', mo) || !has('D0', sk)) {
            env.warnOnce('oledspibus', i18n.m(`OLED SPI: D1 (dados) tem de ir ao pino ${mo} e D0 (relógio) ao ${sk}${o.mosi != null ? ' (pinos do construtor)' : ' (SPI por hardware)'}. O ecrã não recebe nada.`, `SPI OLED: D1 (data) must go to pin ${mo} and D0 (clock) to ${sk}${o.mosi != null ? ' (constructor pins)' : ' (hardware SPI)'}. The display receives nothing.`))
            return false
          }
          if (!has('DC', o.dc)) {
            env.warnOnce('oledspidc', i18n.m(`OLED SPI: DC do ecrã não está no pino ${o.dc} — os comandos são lidos como dados e o ecrã fica apagado.`, `SPI OLED: the display's DC is not on pin ${o.dc} — commands are read as data and the screen stays blank.`))
            return false
          }
          if (o.rst >= 0 && !has('RES', o.rst)) env.warnOnce('oledspirst', i18n.m(`OLED SPI: RES do ecrã não está no pino ${o.rst} (o SSD1306 SPI precisa de um impulso de reset ao arrancar).`, `SPI OLED: the display's RES is not on pin ${o.rst} (the SPI SSD1306 needs a reset pulse at startup).`))
          else if (o.rst < 0 && !(env.vd(p.id, 'RES', 'GND') > 2)) env.warnOnce('oledspirst2', i18n.m('OLED SPI: sem pino de reset no construtor, RES tem de estar ligado a VCC.', 'SPI OLED: with no reset pin in the constructor, RES must be connected to VCC.'))
          if (!env.powered(p.id)) {
            env.warnOnce('oledspipwr', i18n.m('OLED SPI sem alimentação: VCC → 5V e GND → GND. begin() devolveu false.', 'SPI OLED has no power: VCC → 5V and GND → GND. begin() returned false.'))
            return false
          }
          this._spiOk = true
          const s = env.state(p.id)
          s.dispOn = true
          s.lit = 0
          const L = env.live(p.id)
          Object.assign(L, { on: true, inv: false, dim: false, w: 128, h: 64, scroll: null })
          if (!L.fb) {
            L.fb = toBase64(new Uint8Array(1024))
            L.ver = (L.ver || 0) + 1
          }
          this.buf.fill(0)
          this._splash()
          env.touch()
          return true
        }
        begin(vcs = 2, addr = 0x3c) {
          if (this.spi) return this._spiBegin()
          env.rt.t += 15000 // reset + sequência de inicialização
          const hex = `0x${(addr | 0).toString(16).toUpperCase()}`
          const p = this._find(addr)
          if (!p) {
            const other = this._find(null)
            env.warnOnce(
              `oled${addr}`,
              other
                ? i18n.m(`OLED: begin() com o endereço ${hex}, mas o ecrã está em 0x${(other.config?.addr ?? 0x3c).toString(16).toUpperCase()}. begin() devolveu false.`, `OLED: begin() with address ${hex}, but the display is at 0x${(other.config?.addr ?? 0x3c).toString(16).toUpperCase()}. begin() returned false.`)
                : i18n.m(`OLED SSD1306 ${hex} não responde: ligue ${this._hint()}, VCC e GND. begin() devolveu false.`, `OLED SSD1306 ${hex} does not respond: connect ${this._hint()}, VCC and GND. begin() returned false.`),
            )
            return false
          }
          if (!env.powered(p.id)) {
            env.warnOnce(`oledpwr${addr}`, i18n.m('OLED sem alimentação: VCC → 5V e GND → GND. begin() devolveu false.', 'OLED has no power: VCC → 5V and GND → GND. begin() returned false.'))
            return false
          }
          this.addr = addr
          const s = env.state(p.id)
          s.dispOn = true
          s.lit = 0
          const L = env.live(p.id)
          Object.assign(L, { on: true, inv: false, dim: false, w: 128, h: 64, scroll: null })
          if (!L.fb) {
            L.fb = toBase64(new Uint8Array(1024))
            L.ver = (L.ver || 0) + 1
          }
          this.buf.fill(0)
          this._splash()
          env.touch()
          return true
        }
        // imagem de arranque (a biblioteca real carrega o logótipo da Adafruit)
        _splash() {
          const t = 'Adafruit'
          const x = Math.floor((this.W - t.length * 12) / 2)
          const y = Math.floor(this.H / 2) - 8
          for (let i = 0; i < t.length; i++) this.drawChar(x + i * 12, y, t.charCodeAt(i), 1, 1, 2, 2)
        }
        display() {
          const n = this.W * this.H
          env.rt.t += Math.round((n / 8) * 22.5) + 2000 // 1 KB a 400 kHz ≈ 25 ms
          const p = this._dev()
          if (!p) return
          const bytes = new Uint8Array(1024)
          let lit = 0
          for (let y = 0; y < Math.min(64, this.H); y++) {
            for (let x = 0; x < Math.min(128, this.W); x++) {
              if (this.buf[y * this.W + x]) {
                bytes[y * 16 + (x >> 3)] |= 0x80 >> (x & 7)
                lit++
              }
            }
          }
          const L = env.live(p.id)
          L.fb = toBase64(bytes)
          L.ver = (L.ver || 0) + 1
          const s = env.state(p.id)
          const f = lit / 8192
          if (Math.abs(f - (s.lit || 0)) > 0.02) {
            s.lit = f
            env.touch()
          }
        }
        clearDisplay() {
          this.buf.fill(0)
          env.rt.t += 60
        }
        invertDisplay(i) {
          const p = this._dev(true)
          if (p) env.live(p.id).inv = !!i
          env.rt.t += 300
        }
        dim(d) {
          const p = this._dev(true)
          if (p) env.live(p.id).dim = !!d
          env.rt.t += 600
        }
        ssd1306_command(c) {
          const p = this._dev(true)
          env.rt.t += 300
          if (!p) return
          const L = env.live(p.id)
          const s = env.state(p.id)
          if (c === 0xae || c === 0xaf) {
            L.on = c === 0xaf
            s.dispOn = L.on
            env.touch()
          } else if (c === 0xa6 || c === 0xa7) L.inv = c === 0xa7
        }
        startscrollright() {
          this._scroll('right')
        }
        startscrollleft() {
          this._scroll('left')
        }
        startscrolldiagright() {
          this._scroll('right')
        }
        startscrolldiagleft() {
          this._scroll('left')
        }
        stopscroll() {
          this._scroll(null)
        }
        _scroll(dir) {
          const p = this._dev(true)
          if (p) env.live(p.id).scroll = dir
          env.rt.t += 2000
        }
        getBuffer() {
          return this.buf
        }
        // ---------- Adafruit_GFX ----------
        width() {
          return this.rot & 1 ? this.H : this.W
        }
        height() {
          return this.rot & 1 ? this.W : this.H
        }
        setRotation(r) {
          this.rot = r & 3
        }
        getRotation() {
          return this.rot
        }
        // índice na memória para (x, y) com a rotação atual (ou -1 se fora)
        _idx(x, y) {
          x = Math.floor(x)
          y = Math.floor(y)
          if (this.rot === 1) [x, y] = [this.W - 1 - y, x]
          else if (this.rot === 2) [x, y] = [this.W - 1 - x, this.H - 1 - y]
          else if (this.rot === 3) [x, y] = [y, this.H - 1 - x]
          return x < 0 || y < 0 || x >= this.W || y >= this.H ? -1 : y * this.W + x
        }
        drawPixel(x, y, c) {
          const k = this._idx(x, y)
          if (k < 0) return
          if (c === C.INVERSE) this.buf[k] ^= 1
          else this.buf[k] = c ? 1 : 0
        }
        getPixel(x, y) {
          const k = this._idx(x, y)
          return k >= 0 && !!this.buf[k]
        }
        fillScreen(c) {
          this.buf.fill(c ? 1 : 0)
          env.rt.t += 200
        }
        drawFastHLine(x, y, w, c) {
          for (let i = 0; i < w; i++) this.drawPixel(x + i, y, c)
          env.rt.t += 2 + w * 0.3
        }
        drawFastVLine(x, y, h, c) {
          for (let i = 0; i < h; i++) this.drawPixel(x, y + i, c)
          env.rt.t += 2 + h * 0.3
        }
        drawLine(x0, y0, x1, y1, c) {
          x0 = Math.floor(x0)
          y0 = Math.floor(y0)
          x1 = Math.floor(x1)
          y1 = Math.floor(y1)
          const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
          if (steep) [x0, y0, x1, y1] = [y0, x0, y1, x1]
          if (x0 > x1) [x0, x1, y0, y1] = [x1, x0, y1, y0]
          const dx = x1 - x0
          const dy = Math.abs(y1 - y0)
          let err = Math.floor(dx / 2)
          const ystep = y0 < y1 ? 1 : -1
          for (; x0 <= x1; x0++) {
            if (steep) this.drawPixel(y0, x0, c)
            else this.drawPixel(x0, y0, c)
            err -= dy
            if (err < 0) {
              y0 += ystep
              err += dx
            }
          }
          env.rt.t += 5 + dx
        }
        drawRect(x, y, w, h, c) {
          this.drawFastHLine(x, y, w, c)
          this.drawFastHLine(x, y + h - 1, w, c)
          this.drawFastVLine(x, y + 1, h - 2, c)
          this.drawFastVLine(x + w - 1, y + 1, h - 2, c)
        }
        fillRect(x, y, w, h, c) {
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.drawPixel(x + i, y + j, c)
          env.rt.t += 5 + w * h * 0.2
        }
        _circleHelper(x0, y0, r, corners, c) {
          let f = 1 - r
          let ddx = 1
          let ddy = -2 * r
          let x = 0
          let y = r
          while (x < y) {
            if (f >= 0) {
              y--
              ddy += 2
              f += ddy
            }
            x++
            ddx += 2
            f += ddx
            if (corners & 4) {
              this.drawPixel(x0 + x, y0 + y, c)
              this.drawPixel(x0 + y, y0 + x, c)
            }
            if (corners & 2) {
              this.drawPixel(x0 + x, y0 - y, c)
              this.drawPixel(x0 + y, y0 - x, c)
            }
            if (corners & 8) {
              this.drawPixel(x0 - y, y0 + x, c)
              this.drawPixel(x0 - x, y0 + y, c)
            }
            if (corners & 1) {
              this.drawPixel(x0 - y, y0 - x, c)
              this.drawPixel(x0 - x, y0 - y, c)
            }
          }
        }
        _fillCircleHelper(x0, y0, r, corners, delta, c) {
          let f = 1 - r
          let ddx = 1
          let ddy = -2 * r
          let x = 0
          let y = r
          let px = x
          let py = y
          delta++
          while (x < y) {
            if (f >= 0) {
              y--
              ddy += 2
              f += ddy
            }
            x++
            ddx += 2
            f += ddx
            if (x < y + 1) {
              if (corners & 1) this.drawFastVLine(x0 + x, y0 - y, 2 * y + delta, c)
              if (corners & 2) this.drawFastVLine(x0 - x, y0 - y, 2 * y + delta, c)
            }
            if (y !== py) {
              if (corners & 1) this.drawFastVLine(x0 + py, y0 - px, 2 * px + delta, c)
              if (corners & 2) this.drawFastVLine(x0 - py, y0 - px, 2 * px + delta, c)
              py = y
            }
            px = x
          }
        }
        drawCircle(x0, y0, r, c) {
          this.drawPixel(x0, y0 + r, c)
          this.drawPixel(x0, y0 - r, c)
          this.drawPixel(x0 + r, y0, c)
          this.drawPixel(x0 - r, y0, c)
          this._circleHelper(x0, y0, r, 15, c)
          env.rt.t += 10 + r * 4
        }
        fillCircle(x0, y0, r, c) {
          this.drawFastVLine(x0, y0 - r, 2 * r + 1, c)
          this._fillCircleHelper(x0, y0, r, 3, 0, c)
        }
        drawRoundRect(x, y, w, h, r, c) {
          r = Math.min(r, Math.floor(Math.min(w, h) / 2))
          this.drawFastHLine(x + r, y, w - 2 * r, c)
          this.drawFastHLine(x + r, y + h - 1, w - 2 * r, c)
          this.drawFastVLine(x, y + r, h - 2 * r, c)
          this.drawFastVLine(x + w - 1, y + r, h - 2 * r, c)
          this._circleHelper(x + r, y + r, r, 1, c)
          this._circleHelper(x + w - r - 1, y + r, r, 2, c)
          this._circleHelper(x + w - r - 1, y + h - r - 1, r, 4, c)
          this._circleHelper(x + r, y + h - r - 1, r, 8, c)
        }
        fillRoundRect(x, y, w, h, r, c) {
          r = Math.min(r, Math.floor(Math.min(w, h) / 2))
          this.fillRect(x + r, y, w - 2 * r, h, c)
          this._fillCircleHelper(x + w - r - 1, y + r, r, 1, h - 2 * r - 1, c)
          this._fillCircleHelper(x + r, y + r, r, 2, h - 2 * r - 1, c)
        }
        drawTriangle(x0, y0, x1, y1, x2, y2, c) {
          this.drawLine(x0, y0, x1, y1, c)
          this.drawLine(x1, y1, x2, y2, c)
          this.drawLine(x2, y2, x0, y0, c)
        }
        fillTriangle(x0, y0, x1, y1, x2, y2, c) {
          const minX = Math.floor(Math.min(x0, x1, x2))
          const maxX = Math.ceil(Math.max(x0, x1, x2))
          const minY = Math.floor(Math.min(y0, y1, y2))
          const maxY = Math.ceil(Math.max(y0, y1, y2))
          const e = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax)
          const area = e(x0, y0, x1, y1, x2, y2)
          if (area === 0) return this.drawTriangle(x0, y0, x1, y1, x2, y2, c)
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const w0 = e(x1, y1, x2, y2, x, y) * Math.sign(area)
              const w1 = e(x2, y2, x0, y0, x, y) * Math.sign(area)
              const w2 = e(x0, y0, x1, y1, x, y) * Math.sign(area)
              if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.drawPixel(x, y, c)
            }
          }
          env.rt.t += 10 + (maxX - minX) * (maxY - minY) * 0.3
        }
        // bitmap 1 bit por ponto, linha a linha, bit 7 primeiro (como em image2cpp)
        drawBitmap(x, y, bmp, w, h, c, bg) {
          const bw = (w + 7) >> 3
          for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
              const on = ((bmp?.[j * bw + (i >> 3)] ?? 0) << (i & 7)) & 0x80
              if (on) this.drawPixel(x + i, y + j, c)
              else if (bg !== undefined) this.drawPixel(x + i, y + j, bg)
            }
          }
          env.rt.t += 10 + w * h * 0.3
        }
        // ---------- texto (tipo de letra clássico 5×7, células de 6×8) ----------
        setTextSize(sx, sy) {
          this.sx = Math.max(1, sx | 0)
          this.sy = Math.max(1, (sy ?? sx) | 0)
        }
        setTextColor(c, bg) {
          this.fg = c
          this.bg = bg === undefined ? c : bg
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
        setTextWrap(w) {
          this.wrap = !!w
        }
        cp437() {}
        setFont() {
          env.warnOnce('gfxfont', i18n.m('Adafruit_GFX: tipos de letra extra (setFont) não são simulados — usa-se o tipo de letra clássico 5×7.', 'Adafruit_GFX: extra fonts (setFont) are not simulated — the classic 5×7 font is used.'))
        }
        drawChar(x, y, code, c, bg, sx = 1, sy = sx) {
          if (typeof code === 'string') code = code.charCodeAt(0)
          if (x >= this.width() || y >= this.height() || x + 6 * sx - 1 < 0 || y + 8 * sy - 1 < 0) return
          const g = glyph(code)
          for (let i = 0; i < 5; i++) {
            let line = g[i]
            for (let j = 0; j < 8; j++, line >>= 1) {
              if (line & 1) this._dot(x + i * sx, y + j * sy, sx, sy, c)
              else if (bg !== c) this._dot(x + i * sx, y + j * sy, sx, sy, bg)
            }
          }
          if (bg !== c) this._dot(x + 5 * sx, y, sx, 8 * sy, bg)
          env.rt.t += 40 * sx * sy
        }
        _dot(x, y, w, h, c) {
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.drawPixel(x + i, y + j, c)
        }
        write(c) {
          if (typeof c === 'string') {
            for (const ch of c) this._write(ch.codePointAt(0))
            return c.length
          }
          this._write(Number(c) & 0xff)
          return 1
        }
        _write(code) {
          if (code === 10) {
            this.cx = 0
            this.cy += this.sy * 8
          } else if (code !== 13) {
            if (code > 126) env.warnOnce('oledutf8', i18n.m('OLED: o tipo de letra 5×7 não tem acentos nem ç — aparecem como blocos. Escreva sem acentos.', 'OLED: the 5×7 font has no accented letters — they show as blocks. Write without accents.'))
            if (this.wrap && this.cx + this.sx * 6 > this.width()) {
              this.cx = 0
              this.cy += this.sy * 8
            }
            this.drawChar(this.cx, this.cy, code, this.fg, this.bg, this.sx, this.sy)
            this.cx += this.sx * 6
          }
        }
        print(v, base) {
          const t = env.fmt(v, base)
          this.write(t)
          return t.length
        }
        println(v = '', base) {
          return this.print(v, base) + this.write('\r\n')
        }
      },
  },
}
