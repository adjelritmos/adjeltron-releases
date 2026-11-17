// Adafruit_PWMServoDriver.h: escreve nos registos do PCA9685 tal como a biblioteca
// real (incluindo o cálculo do prescaler com o oscilador que o sketch indicar).
import { i2cDevice, i2cTime, i2cHint } from './_i2c.js'
import { PCA } from '../parts/pca9685.js'
import * as i18n from '../../../../../shared/i18n.js'

const RESTART = 0x80
const SLEEP = 0x10
const AI = 0x20
const OUTDRV = 0x04

export default {
  header: 'Adafruit_PWMServoDriver.h',
  globals: { PCA9685_I2C_ADDRESS: 0x40, FREQUENCY_OSCILLATOR: 25000000, PCA9685_PRESCALE_MIN: 3, PCA9685_PRESCALE_MAX: 255 },
  classes: {
    Adafruit_PWMServoDriver: (env) =>
      class Adafruit_PWMServoDriver {
        // Adafruit_PWMServoDriver() | (0x41) | (0x40, Wire)
        constructor(addr = 0x40) {
          this.addr = typeof addr === 'number' ? addr : 0x40
          this.osc = 25e6
        }
        _dev() {
          const d = i2cDevice(env, this.addr, 'pca9685')
          if (!d) env.warnOnce(`pca${this.addr}`, i18n.m(`PCA9685 0x${this.addr.toString(16)} não responde: VCC → 5V, GND, ${i2cHint(env)} e endereço certo nas propriedades.`, `PCA9685 0x${this.addr.toString(16)} does not respond: VCC → 5V, GND, ${i2cHint(env)} and the right address in the properties.`))
          return d
        }
        _w(reg, ...vals) {
          i2cTime(env, 1 + vals.length, env.i2cHz)
          this._dev()?.write([reg, ...vals.map((v) => v & 0xff)])
        }
        _r(reg) {
          i2cTime(env, 1, env.i2cHz)
          i2cTime(env, 1, env.i2cHz)
          const d = this._dev()
          if (!d) return 0
          d.write([reg])
          return d.read(1)[0]
        }
        begin(prescale = 0) {
          this.reset()
          this.osc = 25e6
          if (prescale) this.setExtClk(prescale)
          else this.setPWMFreq(1000) // como a biblioteca real: os servos precisam de setPWMFreq(50)!
          return true
        }
        reset() {
          this._w(PCA.MODE1, RESTART)
          env.rt.t += 10000
        }
        sleep() {
          this._w(PCA.MODE1, this._r(PCA.MODE1) | SLEEP)
          env.rt.t += 5000
        }
        wakeup() {
          this._w(PCA.MODE1, this._r(PCA.MODE1) & ~SLEEP)
        }
        setExtClk(prescale) {
          const old = this._r(PCA.MODE1)
          this._w(PCA.MODE1, (old & ~RESTART) | SLEEP)
          this._w(PCA.MODE1, (old & ~RESTART) | SLEEP | 0x40)
          this._w(PCA.PRESCALE, prescale)
          env.rt.t += 5000
          this._w(PCA.MODE1, ((old & ~RESTART) & ~SLEEP) | RESTART | AI)
        }
        setPWMFreq(freq) {
          freq = Math.max(1, Math.min(3500, Number(freq) || 1))
          let pre = this.osc / (freq * 4096) + 0.5 - 1
          pre = Math.trunc(Math.max(3, Math.min(255, pre)))
          const old = this._r(PCA.MODE1)
          this._w(PCA.MODE1, (old & ~RESTART) | SLEEP) // dormir para mudar o prescaler
          this._w(PCA.PRESCALE, pre)
          this._w(PCA.MODE1, old)
          env.rt.t += 5000
          this._w(PCA.MODE1, old | RESTART | AI)
        }
        setOutputMode(totempole) {
          const m = this._r(PCA.MODE2)
          this._w(PCA.MODE2, totempole ? m | OUTDRV : m & ~OUTDRV)
        }
        readPrescale() {
          return this._r(PCA.PRESCALE)
        }
        getPWM(num, off = false) {
          const reg = PCA.LED0 + 4 * num + (off ? 2 : 0)
          return this._r(reg) | ((this._r(reg + 1) & 0x1f) << 8)
        }
        setPWM(num, on, off) {
          on = Math.trunc(on) & 0xffff
          off = Math.trunc(off) & 0xffff
          this._w(PCA.LED0 + 4 * (num & 15), on, on >> 8, off, off >> 8)
          return 0
        }
        setPin(num, val, invert = false) {
          val = Math.max(0, Math.min(4095, Math.trunc(val)))
          if (invert) {
            if (val === 0) this.setPWM(num, 4096, 0)
            else if (val === 4095) this.setPWM(num, 0, 4096)
            else this.setPWM(num, 0, 4095 - val)
          } else if (val === 4095) this.setPWM(num, 4096, 0)
          else if (val === 0) this.setPWM(num, 0, 4096)
          else this.setPWM(num, 0, val)
        }
        // passos = µs / (1e6 × (prescale + 1) / oscilador)
        writeMicroseconds(num, us) {
          const len = (1e6 * (this.readPrescale() + 1)) / this.osc
          this.setPWM(num, 0, Math.trunc(us / len))
        }
        getOscillatorFrequency() {
          return this.osc
        }
        setOscillatorFrequency(f) {
          this.osc = Number(f) || 25e6
        }
      },
  },
}
