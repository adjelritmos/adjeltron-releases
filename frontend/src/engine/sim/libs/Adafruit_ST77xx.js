// Adafruit_ST7735 / Adafruit_ST7789 (+ Adafruit_GFX): TFT a cores por SPI. São a Adafruit_ILI9341
// com outras dimensões: memória RGB565 partilhada com a peça (s.tft = this), escrita logo por SPI.
// ST7735: initR(INITR_BLACKTAB) → 128×160 (INITR_144GREENTAB → 128×128, INITR_MINI160x80 → 80×160).
// ST7789: init(240, 240) (também 240×320, 135×240, 170×320…).
import ili from './Adafruit_ILI9341.js'
import { withGfxExtras, spiPart } from './_gfxG.js'
import { TFT77 } from '../../../../../shared/parts/tft77.js'
import * as i18n from '../../../../../shared/i18n.js'

const C = { BLACK: 0x0000, WHITE: 0xffff, RED: 0xf800, GREEN: 0x07e0, BLUE: 0x001f, CYAN: 0x07ff, MAGENTA: 0xf81f, YELLOW: 0xffe0, ORANGE: 0xfc00 }
const colors = (pre) => Object.fromEntries(Object.entries(C).map(([k, v]) => [`${pre}_${k}`, v]))
const ST77XX = {
  ...colors('ST77XX'), ...colors('ST7735'), ...colors('ST7789'),
  INITR_GREENTAB: 0x00, INITR_REDTAB: 0x01, INITR_BLACKTAB: 0x02, INITR_18GREENTAB: 0x00, INITR_18REDTAB: 0x01, INITR_18BLACKTAB: 0x02,
  INITR_144GREENTAB: 0x01 | 0x10, INITR_MINI160x80: 0x04, INITR_MINI160x80_PLUGIN: 0x05, INITR_HALLOWING: 0x05 | 0x10,
  ST7735_TFTWIDTH_128: 128, ST7735_TFTWIDTH_80: 80, ST7735_TFTHEIGHT_128: 128, ST7735_TFTHEIGHT_160: 160,
}

function make(env, type, label) {
  const Base = withGfxExtras(ili.classes.Adafruit_ILI9341(env))
  const types = new Set([type])
  const spec = TFT77[type]
  return class extends Base {
    _setSize(w, h) {
      this.W = w
      this.H = h
      this.buf = new Uint16Array(w * h)
      this.rot = 0
    }
    _find() {
      return spiPart(env, { types, label, cs: this.cs, dc: this.dc, mosi: this.soft?.mosi, sck: this.soft?.sck })
    }
    _start(w, h) {
      env.rt.t += 150000
      this._setSize(w, h)
      this.part = this._find()
      if (!this.part) return
      if (!env.powered(this.part.id)) return env.warnOnce(`${type}pwr`, i18n.m(`${label} sem alimentação: VCC → 5V e GND → GND.`, `${label} has no power: VCC → 5V and GND → GND.`))
      if (w !== spec.tw || h !== spec.th)
        env.warnOnce(`${type}size`, i18n.m(`${label}: o programa inicializa o controlador para ${w}×${h}, mas o ecrã ligado é ${spec.tw}×${spec.th}. A imagem sai cortada ou deslocada (veja o separador/tipo do ecrã).`, `${label}: the program initializes the controller for ${w}×${h}, but the connected display is ${spec.tw}×${spec.th}. The image comes out cropped or shifted (check the display tab/type).`))
      this.buf.fill(0)
      this.dirty = true
      env.state(this.part.id).tft = this
    }
    begin() {
      this._start(spec.tw, spec.th)
    }
    enableDisplay(on) {
      if (this._ok()) env.state(this.part.id).dispOff = !on
      this.dirty = true
    }
    enableSleep(on) {
      this.enableDisplay(!on)
    }
    setSPISpeed() {}
    setColRowStart() {}
    useWindow() {}
    // API antiga (sketches de 2013–2017): Color565 e setAddrWindow + pushColor. A janela é
    // x, y, largura, altura (biblioteca atual); um sketch antigo que faz setAddrWindow(x, y, x, y)
    // seguido de UM pushColor pinta o ponto (x, y) nas duas interpretações.
    Color565(r, g, b) {
      return this.color565(r, g, b)
    }
    startWrite() {}
    endWrite() {}
    setAddrWindow(x, y, w, h) {
      this._win = { x: x | 0, y: y | 0, w: Math.max(1, w | 0), h: Math.max(1, h | 0), i: 0 }
    }
    pushColor(c) {
      const W = this._win
      if (!W) return
      this.drawPixel(W.x + (W.i % W.w), W.y + Math.floor(W.i / W.w) % W.h, c)
      W.i++
    }
    writePixel(x, y, c) {
      this.drawPixel(x, y, c)
    }
    writeColor(c, n) {
      for (let k = 0; k < n; k++) this.pushColor(c)
    }
  }
}

export default [
  {
    header: 'Adafruit_ST7735.h',
    globals: ST77XX,
    classes: {
      Adafruit_ST7735: (env) => {
        const B = make(env, 'st7735', 'TFT ST7735')
        return class Adafruit_ST7735 extends B {
          initR(opt = 0) {
            opt &= 0xff
            const [w, h] = opt === 0x11 ? [128, 128] : opt === 0x04 || opt === 0x05 ? [80, 160] : opt === 0x15 ? [128, 128] : [128, 160]
            this._start(w, h)
          }
          initB() {
            this._start(128, 160)
          }
        }
      },
    },
  },
  {
    header: 'Adafruit_ST7789.h',
    globals: ST77XX,
    classes: {
      Adafruit_ST7789: (env) => {
        const B = make(env, 'st7789', 'TFT ST7789')
        return class Adafruit_ST7789 extends B {
          init(w = 240, h = 320) {
            this._start(w | 0, h | 0)
          }
        }
      },
    },
  },
  { header: 'Adafruit_ST77xx.h', globals: ST77XX },
]
