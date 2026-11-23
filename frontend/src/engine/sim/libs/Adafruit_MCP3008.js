// Adafruit_MCP3008.h — begin(cs) (SPI por hardware) ou begin(sck, mosi, miso, cs) (por
// software); readADC(canal) e readADCDifference(par). Os 3 bytes vão pelo barramento SPI
// simulado (libs/_spi.js) à peça MCP3008 cujo CS está ligado ao pino escolhido.
import { spiTransfer, spiSelected } from './_spi.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  header: 'Adafruit_MCP3008.h',
  classes: {
    Adafruit_MCP3008: (env) =>
      class Adafruit_MCP3008 {
        constructor() {
          this.cs = 10
        }
        begin(a = 10, b, c, d) {
          this.cs = d != null ? d : a
          // begin(sck, mosi, miso, cs): SPI por software nesses pinos
          this.soft = d != null ? { sck: a, mosi: b, miso: c } : null
          env.api.pinMode(this.cs, 'OUTPUT')
          env.api.digitalWrite(this.cs, 1)
          return true
        }
        _read(cfg) {
          const { digitalWrite } = env.api
          digitalWrite(this.cs, 0)
          if (!spiSelected(env, this.cs).length) {
            env.warnOnce(`mcp${this.cs}`, i18n.m(`Adafruit_MCP3008: não há nenhum MCP3008 com o CS no pino ${this.cs} (ou está sem alimentação: VDD → 5V, DGND → GND).`, `Adafruit_MCP3008: there is no MCP3008 with CS on pin ${this.cs} (or it has no power: VDD → 5V, DGND → GND).`))
            digitalWrite(this.cs, 1)
            return 0
          }
          for (const { part } of spiSelected(env, this.cs)) env.state(part.id).spiPins = this.soft
          spiTransfer(env, 0x01, this.cs)
          const hi = spiTransfer(env, cfg, this.cs)
          const lo = spiTransfer(env, 0x00, this.cs)
          digitalWrite(this.cs, 1)
          return ((hi & 0x03) << 8) | lo
        }
        readADC(ch) {
          if (ch < 0 || ch > 7) return -1
          return this._read(0x80 | (ch << 4))
        }
        readADCDifference(d) {
          if (d < 0 || d > 7) return -1
          return this._read(d << 4)
        }
      },
  },
}
