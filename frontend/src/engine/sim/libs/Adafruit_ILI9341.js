// Adafruit_ILI9341 (+ Adafruit_GFX): TFT 240×320 a cores por SPI.
// Reaproveita as primitivas gráficas da Adafruit_SSD1306.js (mesmo Adafruit_GFX), com
// uma memória RGB565 de 240×320 em vez de 1 bit. Ao contrário do OLED não há display():
// cada operação é enviada logo ao ecrã por SPI (~8 MHz no Uno, ~2 µs por ponto preenchido).
// O ecrã (peça ili9341) é encontrado pelo pino CS; a imagem é a memória deste objeto,
// partilhada com a peça (s.tft = this), que a envia ao browser.
import ssd1306 from './Adafruit_SSD1306.js'
import * as i18n from '../../../../../shared/i18n.js'

const COLORS = {
  ILI9341_BLACK: 0x0000, ILI9341_NAVY: 0x000f, ILI9341_DARKGREEN: 0x03e0, ILI9341_DARKCYAN: 0x03ef, ILI9341_MAROON: 0x7800,
  ILI9341_PURPLE: 0x780f, ILI9341_OLIVE: 0x7be0, ILI9341_LIGHTGREY: 0xc618, ILI9341_DARKGREY: 0x7bef, ILI9341_BLUE: 0x001f,
  ILI9341_GREEN: 0x07e0, ILI9341_CYAN: 0x07ff, ILI9341_RED: 0xf800, ILI9341_MAGENTA: 0xf81f, ILI9341_YELLOW: 0xffe0,
  ILI9341_WHITE: 0xffff, ILI9341_ORANGE: 0xfd20, ILI9341_GREENYELLOW: 0xafe5, ILI9341_PINK: 0xfc18,
}
// pinos do SPI por hardware de cada placa (MOSI, SCK)
export const HW_SPI = { uno: { mosi: 11, sck: 13, miso: 12 }, mega: { mosi: 51, sck: 52, miso: 50 }, esp32: { mosi: 23, sck: 18, miso: 19 }, pico: { mosi: 19, sck: 18, miso: 16 } }
export const hwSpi = (env) => HW_SPI[env.board?.id] || HW_SPI.uno
const US_PX = 2.1 // µs por ponto num preenchimento (16 bits a 8 MHz + sobrecarga)

export default {
  header: 'Adafruit_ILI9341.h',
  globals: { ...COLORS, ILI9341_TFTWIDTH: 240, ILI9341_TFTHEIGHT: 320 },
  classes: {
    Adafruit_ILI9341: (env) => {
      const GFX = ssd1306.classes.Adafruit_SSD1306(env)
      return class Adafruit_ILI9341 extends GFX {
        // (cs, dc, rst = -1) com SPI por hardware; (cs, dc, mosi, sclk, rst, miso) por software
        constructor(cs, dc, a = -1, b, c = -1, d = -1) {
          super(240, 320, 0)
          this.buf = new Uint16Array(240 * 320)
          this.fg = 0xffff
          this.bg = 0xffff
          this.cs = cs
          this.dc = dc
          this.soft = b !== undefined ? { mosi: a, sck: b, rst: c, miso: d } : null
          this.rst = b !== undefined ? c : a
          this.part = null
          this.dirty = false
          this.inv = false
        }
        _find() {
          const p = env.partsOnPin(this.cs, 'ili9341')[0] || null
          if (!p) {
            const any = env.partsOnPin(this.dc, 'ili9341')[0]
            env.warnOnce('tftcs', any ? i18n.m(`TFT ILI9341: o pino ${this.cs} passado como CS não está ligado ao CS do ecrã (ver construtor: Adafruit_ILI9341(CS, DC)).`, `TFT ILI9341: pin ${this.cs} passed as CS is not connected to the display's CS (see the constructor: Adafruit_ILI9341(CS, DC)).`) : i18n.m(`TFT ILI9341: nenhum ecrã com CS no pino ${this.cs}. Ligue CS, D/C, MOSI e SCK.`, `TFT ILI9341: no display with CS on pin ${this.cs}. Connect CS, D/C, MOSI and SCK.`))
            return null
          }
          const has = (pin, n) => env.pinsOf(p.id, pin).includes(n)
          if (!has('DC', this.dc)) env.warnOnce('tftdc', i18n.m(`TFT ILI9341: D/C do ecrã não está no pino ${this.dc} — sem D/C os comandos são lidos como dados e o ecrã fica branco.`, `TFT ILI9341: the display's D/C is not on pin ${this.dc} — without D/C commands are read as data and the screen stays white.`))
          const spi = this.soft || hwSpi(env)
          if (!has('MOSI', spi.mosi) || !has('SCK', spi.sck)) {
            env.warnOnce('tftspi', i18n.m(`TFT ILI9341: MOSI tem de ir ao pino ${spi.mosi} e SCK ao ${spi.sck}${this.soft ? ' (pinos do construtor)' : ' (SPI por hardware)'}. O ecrã não recebe nada.`, `TFT ILI9341: MOSI must go to pin ${spi.mosi} and SCK to ${spi.sck}${this.soft ? ' (constructor pins)' : ' (hardware SPI)'}. The display receives nothing.`))
            return null
          }
          return p
        }
        begin() {
          env.rt.t += 150000 // reset por hardware + sequência de inicialização
          this.part = this._find()
          if (!this.part) return
          if (!env.powered(this.part.id)) {
            env.warnOnce('tftpwr', i18n.m('TFT ILI9341 sem alimentação: VCC → 5V e GND → GND.', 'TFT ILI9341 has no power: VCC → 5V and GND → GND.'))
            return
          }
          this.buf.fill(0)
          this.rot = 0
          this.dirty = true
          env.state(this.part.id).tft = this
        }
        _ok() {
          return this.part && env.state(this.part.id).tft === this
        }
        drawPixel(x, y, c) {
          const k = this._idx(x, y)
          if (k < 0) return
          this.buf[k] = c & 0xffff
          this.dirty = true
          env.rt.t += 0.6
        }
        _fill(x, y, w, h, c) {
          x = Math.floor(x)
          y = Math.floor(y)
          w = Math.floor(w)
          h = Math.floor(h)
          if (w < 0) [x, w] = [x + w + 1, -w]
          if (h < 0) [y, h] = [y + h + 1, -h]
          const x0 = Math.max(0, x)
          const y0 = Math.max(0, y)
          const x1 = Math.min(this.width(), x + w)
          const y1 = Math.min(this.height(), y + h)
          if (x1 <= x0 || y1 <= y0) return
          for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) this.buf[this._idx(i, j)] = c & 0xffff
          this.dirty = true
          env.rt.t += 20 + (x1 - x0) * (y1 - y0) * US_PX
        }
        fillRect(x, y, w, h, c) {
          this._fill(x, y, w, h, c)
        }
        fillScreen(c) {
          this._fill(0, 0, this.width(), this.height(), c)
        }
        drawFastHLine(x, y, w, c) {
          this._fill(x, y, w, 1, c)
        }
        drawFastVLine(x, y, h, c) {
          this._fill(x, y, 1, h, c)
        }
        invertDisplay(i) {
          this.inv = !!i
          this.dirty = true
        }
        scrollTo() {}
        setScrollMargins() {}
        color565(r, g, b) {
          return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | ((b & 0xff) >> 3)
        }
        readPixel(x, y) {
          const k = this._idx(x, y)
          return k < 0 ? 0 : this.buf[k]
        }
        readcommand8() {
          return this._ok() ? 0x9c : 0x00
        }
        drawRGBBitmap(x, y, bmp, w, h) {
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.drawPixel(x + i, y + j, bmp?.[j * w + i] ?? 0)
        }
        // o OLED não existe aqui
        display() {}
        clearDisplay() {}
        _splash() {}
      }
    },
  },
}
