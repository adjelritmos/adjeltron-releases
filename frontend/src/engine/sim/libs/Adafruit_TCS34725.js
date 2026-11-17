// Adafruit_TCS34725: sensor de cor I2C (0x29). Contagens R/G/B/C proporcionais à cor do
// objeto (controlo), ao ganho e ao tempo de integração, saturando no máximo do ADC.
import { findI2c, field, noise } from '../parts/_groupG.js'
import { setOut } from './_outParam.js'
import { i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const IT = { TCS34725_INTEGRATIONTIME_2_4MS: 0xff, TCS34725_INTEGRATIONTIME_24MS: 0xf6, TCS34725_INTEGRATIONTIME_50MS: 0xeb, TCS34725_INTEGRATIONTIME_60MS: 0xe7, TCS34725_INTEGRATIONTIME_101MS: 0xd6, TCS34725_INTEGRATIONTIME_120MS: 0xce, TCS34725_INTEGRATIONTIME_154MS: 0xc0, TCS34725_INTEGRATIONTIME_180MS: 0xb5, TCS34725_INTEGRATIONTIME_199MS: 0xad, TCS34725_INTEGRATIONTIME_240MS: 0x9c, TCS34725_INTEGRATIONTIME_300MS: 0x83, TCS34725_INTEGRATIONTIME_360MS: 0x6a, TCS34725_INTEGRATIONTIME_401MS: 0x5a, TCS34725_INTEGRATIONTIME_420MS: 0x51, TCS34725_INTEGRATIONTIME_480MS: 0x38, TCS34725_INTEGRATIONTIME_499MS: 0x30, TCS34725_INTEGRATIONTIME_540MS: 0x1f, TCS34725_INTEGRATIONTIME_600MS: 0x06, TCS34725_INTEGRATIONTIME_614MS: 0x00 }
const GAINS = [1, 4, 16, 60]

export default {
  header: 'Adafruit_TCS34725.h',
  globals: { ...IT, TCS34725_GAIN_1X: 0, TCS34725_GAIN_4X: 1, TCS34725_GAIN_16X: 2, TCS34725_GAIN_60X: 3, TCS34725_ADDRESS: 0x29 },
  classes: {
    Adafruit_TCS34725: (env) =>
      class Adafruit_TCS34725 {
        constructor(it = 0xff, gain = 0) {
          this.atime = it & 0xff
          this.gain = gain & 3
          this.ok = false
        }
        begin(addr = 0x29) {
          i2cTime(env, 3)
          env.rt.t += 3000
          const r = findI2c(env, addr, 'tcs34725', 'TCS34725', i18n.m(`ligue VIN → 5V, GND, ${i2cHint(env)}`, `connect VIN → 5V, GND, ${i2cHint(env)}`))
          if (r.err) {
            env.warnOnce('tcsbegin', `${r.err} begin() devolveu false.`)
            return (this.ok = false)
          }
          return (this.ok = true)
        }
        setIntegrationTime(it) {
          this.atime = it & 0xff
        }
        setGain(g) {
          this.gain = g & 3
        }
        setInterrupt() {}
        clearInterrupt() {}
        setIntLimits() {}
        enable() {}
        disable() {}
        _ms() {
          return (256 - this.atime) * 2.4
        }
        _counts(wait) {
          if (wait) env.rt.t += this._ms() * 1000
          i2cTime(env, 9)
          const p = this.ok ? env.i2c(0x29, 'tcs34725') : null
          if (!p || !env.powered(p.id)) {
            env.warnOnce('tcslost', this.ok ? i18n.m('TCS34725 deixou de responder.', 'TCS34725 stopped responding.') : i18n.m('TCS34725: falta tcs.begin() no setup() — as leituras dão 0.', 'TCS34725: tcs.begin() is missing in setup() — readings return 0.'))
            return [0, 0, 0, 0]
          }
          const inp = env.input(p.id)
          const cfg = p.config || {}
          const max = Math.min(65535, (256 - this.atime) * 1024)
          // luz refletida (com o LED branco aceso): ~25 contagens por unidade de cor a 1×, 2,4 ms·100
          const k = (this._ms() / 2.4) * GAINS[this.gain] * 0.18
          const led = (env.live(p.id).led ?? true) ? 1 : 0.15
          const ch = ['r', 'g', 'b'].map((c) => (field(inp, cfg, c) + 6) * k * led * (1 + noise(0.01)))
          const all = [...ch, (ch[0] + ch[1] + ch[2]) * 1.05]
          return all.map((v) => Math.max(0, Math.min(max, Math.round(v))))
        }
        getRawData(r, g, b, c) {
          const v = this._counts(true)
          setOut(r, v[0])
          setOut(g, v[1])
          setOut(b, v[2])
          setOut(c, v[3])
        }
        getRawDataOneShot(r, g, b, c) {
          this.getRawData(r, g, b, c)
        }
        getRGB(r, g, b) {
          const [rr, gg, bb, cc] = this._counts(true)
          const s = (x) => (cc ? (x / cc) * 255 : 0)
          setOut(r, s(rr))
          setOut(g, s(gg))
          setOut(b, s(bb))
        }
        calculateColorTemperature(r, g, b) {
          const X = -0.14282 * r + 1.54924 * g + -0.95641 * b
          const Y = -0.32466 * r + 1.57837 * g + -0.73191 * b
          const Z = -0.68202 * r + 0.77073 * g + 0.56332 * b
          const xc = X / (X + Y + Z)
          const yc = Y / (X + Y + Z)
          const n = (xc - 0.332) / (0.1858 - yc)
          return Math.round(449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33)
        }
        calculateColorTemperature_dn40(r, g, b, c) {
          if (c === 0) return 0
          const ir = Math.max(0, (r + g + b - c) / 2)
          const r2 = r - ir
          const b2 = b - ir
          if (r2 === 0) return 0
          return Math.round((3810 * b2) / r2 + 1391)
        }
        calculateLux(r, g, b) {
          return Math.round(-0.32466 * r + 1.57837 * g + -0.73191 * b)
        }
        read8() {
          return 0x44
        }
      },
  },
}
