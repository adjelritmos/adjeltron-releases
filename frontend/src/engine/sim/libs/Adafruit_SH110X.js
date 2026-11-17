// Adafruit_SH110X (Adafruit_SH1106G): OLED 1,3" SH1106 128×64 por I2C. Mesma Adafruit_GFX e o
// mesmo formato de imagem da Adafruit_SSD1306 (live.fb), mas procura uma peça sh1106.
import ssd1306 from './Adafruit_SSD1306.js'
import { withGfxExtras } from './_gfxG.js'
import { i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const globals = { SH110X_BLACK: 0, SH110X_WHITE: 1, SH110X_INVERSE: 2, SH110X_DISPLAYOFF: 0xae, SH110X_DISPLAYON: 0xaf, SH110X_NORMALDISPLAY: 0xa6, SH110X_INVERTDISPLAY: 0xa7, SH110X_SETCONTRAST: 0x81 }
const hex = (a) => `0x${(a | 0).toString(16).toUpperCase()}`

export default {
  header: 'Adafruit_SH110X.h',
  globals,
  classes: {
    Adafruit_SH1106G: (env) => {
      const GFX = withGfxExtras(ssd1306.classes.Adafruit_SSD1306(env))
      return class Adafruit_SH1106G extends GFX {
        constructor(w = 128, h = 64) {
          super(w, h, 0)
        }
        _dev(quiet) {
          const p = this.addr != null ? env.i2c(this.addr, 'sh1106') : null
          if (!p || !env.powered(p.id)) {
            if (!quiet && this.addr != null) env.warnOnce(`shlost${this.addr}`, i18n.m(`OLED SH1106 ${hex(this.addr)} deixou de responder (sem alimentação ou desligado do I2C).`, `OLED SH1106 ${hex(this.addr)} stopped responding (no power or disconnected from I2C).`))
            return null
          }
          return p
        }
        begin(addr = 0x3c) {
          env.rt.t += 15000
          const p = env.i2c(addr, 'sh1106')
          if (!p) {
            const other = env.i2c(null, 'sh1106')
            const oled = env.i2c(addr, 'ssd1306')
            env.warnOnce(
              `sh${addr}`,
              oled
                ? i18n.m(`Adafruit_SH1106G: em ${hex(addr)} está um OLED SSD1306 (0,96"), não um SH1106. Use a Adafruit_SSD1306. begin() devolveu false.`, `Adafruit_SH1106G: at ${hex(addr)} there is an SSD1306 OLED (0.96"), not an SH1106. Use Adafruit_SSD1306. begin() returned false.`)
                : other
                  ? i18n.m(`OLED SH1106: begin() com o endereço ${hex(addr)}, mas o ecrã está em ${hex(other.config?.addr ?? 0x3c)}. begin() devolveu false.`, `OLED SH1106: begin() with address ${hex(addr)}, but the display is at ${hex(other.config?.addr ?? 0x3c)}. begin() returned false.`)
                  : i18n.m(`OLED SH1106 ${hex(addr)} não responde: ligue ${i2cHint(env)}, VCC e GND. begin() devolveu false.`, `OLED SH1106 ${hex(addr)} does not respond: connect ${i2cHint(env)}, VCC and GND. begin() returned false.`),
            )
            return false
          }
          if (!env.powered(p.id)) {
            env.warnOnce(`shpwr${addr}`, i18n.m('OLED SH1106 sem alimentação: VCC → 5V e GND → GND. begin() devolveu false.', 'OLED SH1106 has no power: VCC → 5V and GND → GND. begin() returned false.'))
            return false
          }
          this.addr = addr
          const s = env.state(p.id)
          s.dispOn = true
          s.lit = 0
          const L = env.live(p.id)
          Object.assign(L, { on: true, inv: false, dim: false, w: 128, h: 64, scroll: null })
          this.buf.fill(0)
          this._splash()
          env.touch()
          return true
        }
        setContrast(c) {
          const p = this._dev(true)
          if (p) env.live(p.id).dim = (c | 0) < 40
          env.rt.t += 300
        }
        oled_command(c) {
          this.ssd1306_command(c)
        }
        // o SH1106 não tem scroll por hardware
        startscrollright() {}
        startscrollleft() {}
        stopscroll() {}
      }
    },
  },
}
