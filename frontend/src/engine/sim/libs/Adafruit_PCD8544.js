// Adafruit_PCD8544 (+ Adafruit_GFX): LCD do Nokia 5110, 84×48 monocromático por SPI.
// Desenha-se na memória (504 bytes) e display() envia-a (~2 ms). BLACK = 1, WHITE = 0.
// Construtores: (SCLK, DIN, DC, CS, RST) SPI por software, (DC, CS, RST) SPI por hardware,
// (SCLK, DIN, DC, RST) sem CS (CE ligado a GND).
// No .h real BLACK = 1 e WHITE = 0, ao contrário da Adafruit_SSD1306 (BLACK = 0, WHITE = 1). As
// constantes globais do simulador são as da SSD1306, por isso aqui as cores 0 e 1 trocam-se
// (BLACK desenha a preto, WHITE apaga); qualquer outra cor (≠ 0) desenha a preto, como no real.
import ssd1306 from './Adafruit_SSD1306.js'
import { withGfxExtras, spiPart, packBits, b64 } from './_gfxG.js'
import * as i18n from '../../../../../shared/i18n.js'

const TYPES = new Set(['pcd8544'])
const globals = { LCDWIDTH: 84, LCDHEIGHT: 48, PCD8544_DISPLAYNORMAL: 0x4, PCD8544_DISPLAYINVERTED: 0x5 }

export default {
  header: 'Adafruit_PCD8544.h',
  globals,
  classes: {
    Adafruit_PCD8544: (env) => {
      const GFX = withGfxExtras(ssd1306.classes.Adafruit_SSD1306(env))
      return class Adafruit_PCD8544 extends GFX {
        constructor(...a) {
          super(84, 48, 0)
          this.fg = 0xffff
          this.bg = 0xffff
          if (a.length >= 5) this.pins = { sck: a[0], mosi: a[1], dc: a[2], cs: a[3], rst: a[4] }
          else if (a.length === 4) this.pins = { sck: a[0], mosi: a[1], dc: a[2], cs: -1, rst: a[3] }
          else this.pins = { dc: a[0], cs: a[1], rst: a[2] ?? -1 }
          this.contrast = 40
          this.part = null
        }
        _find() {
          const o = this.pins
          const N = { cs: 'CE', dc: 'DC', mosi: 'DIN', sck: 'CLK' }
          if (o.cs >= 0) return spiPart(env, { types: TYPES, label: 'LCD Nokia 5110', cs: o.cs, dc: o.dc, mosi: o.mosi, sck: o.sck, names: N })
          const p = env.partsOnPin(o.dc).find((q) => TYPES.has(q.type))
          if (!p) env.warnOnce('pcdnf', i18n.m(`LCD Nokia 5110: nenhum ecrã com DC no pino ${o.dc}.`, `Nokia 5110 LCD: no display with DC on pin ${o.dc}.`))
          else if (!(env.vd(p.id, 'CE', 'GND') < 0.8)) env.warnOnce('pcdce', i18n.m('LCD Nokia 5110: construtor sem CS — o pino CE tem de estar ligado a GND.', 'Nokia 5110 LCD: constructor without CS — the CE pin must be connected to GND.'))
          return p || null
        }
        begin(contrast = 40) {
          env.rt.t += 5000
          this.part = this._find()
          const p = this.part
          if (!p) return false
          if (this.pins.rst >= 0 && !env.pinsOf(p.id, 'RST').includes(this.pins.rst)) env.warnOnce('pcdrst', i18n.m(`LCD Nokia 5110: RST do ecrã não está no pino ${this.pins.rst} — sem o impulso de reset o PCD8544 fica num estado aleatório.`, `Nokia 5110 LCD: the display's RST is not on pin ${this.pins.rst} — without the reset pulse the PCD8544 stays in a random state.`))
          if (!env.powered(p.id)) {
            env.warnOnce('pcdpwr', i18n.m('LCD Nokia 5110 sem alimentação: VCC → 3,3 V e GND → GND.', 'Nokia 5110 LCD has no power: VCC → 3.3 V and GND → GND.'))
            return false
          }
          this.contrast = contrast | 0
          const s = env.state(p.id)
          s.lcdOn = true
          Object.assign(env.live(p.id), { on: true, inv: false, contrast: this.contrast })
          this.buf.fill(0)
          this.display()
          return true
        }
        _dev() {
          const p = this.part
          return p && env.powered(p.id) && env.state(p.id).lcdOn ? p : null
        }
        display() {
          env.rt.t += 2000 // 504 bytes a 4 MHz + comandos
          const p = this._dev()
          if (!p) return
          const { bytes, lit } = packBits(this.buf, 84, 48)
          const L = env.live(p.id)
          L.fb = b64(bytes)
          L.ver = (L.ver || 0) + 1
          L.lit = lit
        }
        setContrast(c) {
          this.contrast = Math.max(0, Math.min(127, c | 0))
          const p = this._dev()
          if (p) env.live(p.id).contrast = this.contrast
          env.rt.t += 100
        }
        getContrast() {
          return this.contrast
        }
        drawPixel(x, y, c) {
          super.drawPixel(x, y, c === 0 ? 1 : c === 1 ? 0 : c)
        }
        fillScreen(c) {
          super.fillScreen(c === 0 ? 1 : c === 1 ? 0 : c ? 1 : 0)
        }
        setBias() {}
        getBias() {
          return 4
        }
        invertDisplay(i) {
          const p = this._dev()
          if (p) env.live(p.id).inv = !!i
          env.rt.t += 100
        }
        command() {
          env.rt.t += 20
        }
        data() {
          env.rt.t += 20
        }
        setReinitInterval() {}
        initDisplay() {}
        _splash() {}
        clearDisplay() {
          this.buf.fill(0)
          this.cx = 0
          this.cy = 0
          env.rt.t += 60
        }
      }
    },
  },
}
