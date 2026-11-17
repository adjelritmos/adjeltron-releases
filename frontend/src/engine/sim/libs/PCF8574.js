// PCF8574.h — expansor de E/S I2C. Junta as duas APIs mais usadas com este cabeçalho:
//   Rob Tillaart: begin(), isConnected(), write8(v), read8(), write(pin, v), read(pin),
//                 toggle(pin), value(), valueOut(), shiftLeft/Right, rotateLeft/Right, lastError()
//   Renzo Mischianti (xreef): pinMode(pin, INPUT/OUTPUT), digitalWrite(pin, v), digitalRead(pin)
// Cada operação é uma transação I2C real (Wire): escrever um byte ou pedir um byte ao chip.
import { i2cDevice, i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const OK = 0x00
const I2C_ERROR = 0x82
const PIN_ERROR = 0x81

export const makePcf = (env) =>
  class PCF8574 {
    constructor(addr = 0x20) {
      this.addr = Number(addr) & 0x7f
      this.out = 0xff
      this.in = 0
      this.err = OK
      this.inputs = 0 // máscara de pinos em INPUT (API xreef)
    }
    _dev() {
      const d = i2cDevice(env, this.addr)
      if (!d) {
        this.err = I2C_ERROR
        env.warnOnce(`pcf${this.addr}`, i18n.m(`PCF8574 0x${this.addr.toString(16).toUpperCase()} não responde: ligue ${i2cHint(env)}, VCC e GND, e confirme o endereço nas propriedades do módulo (pontes A0–A2).`, `PCF8574 0x${this.addr.toString(16).toUpperCase()} does not respond: connect ${i2cHint(env)}, VCC and GND, and check the address in the module properties (A0–A2 jumpers).`))
      }
      return d
    }
    begin(a, b) {
      // begin(valor) (Tillaart) ou begin(sda, scl) no ESP32: escreve o estado inicial
      if (a != null && b == null && a <= 0xff) this.out = Number(a) & 0xff
      return this.write8(this.out)
    }
    isConnected() {
      i2cTime(env, 0, env.i2cHz)
      return !!i2cDevice(env, this.addr)
    }
    setAddress(a) {
      this.addr = Number(a) & 0x7f
      return this.isConnected()
    }
    getAddress() {
      return this.addr
    }
    write8(v) {
      this.out = Number(v) & 0xff
      i2cTime(env, 1, env.i2cHz)
      const d = this._dev()
      if (!d) return false
      d.write([this.out | this.inputs])
      this.err = OK
      return true
    }
    read8() {
      i2cTime(env, 1, env.i2cHz)
      const d = this._dev()
      if (!d) return this.in
      this.in = d.read(1)[0]
      this.err = OK
      return this.in
    }
    write(pin, v) {
      if (pin < 0 || pin > 7) {
        this.err = PIN_ERROR
        return false
      }
      const m = 1 << pin
      return this.write8(v ? this.out | m : this.out & ~m)
    }
    read(pin) {
      if (pin < 0 || pin > 7) {
        this.err = PIN_ERROR
        return 0
      }
      return (this.read8() >> pin) & 1
    }
    readButton8(mask = 0xff) {
      const keep = this.out
      this.write8(keep | mask)
      const v = this.read8()
      this.write8(keep)
      return v & mask
    }
    readButton(pin) {
      return (this.readButton8(1 << pin) >> pin) & 1
    }
    toggle(pin) {
      return this.write8(this.out ^ (1 << pin))
    }
    toggleMask(mask = 0xff) {
      return this.write8(this.out ^ mask)
    }
    shiftLeft(n = 1) {
      return this.write8((this.out << n) & 0xff)
    }
    shiftRight(n = 1) {
      return this.write8(this.out >> n)
    }
    rotateLeft(n = 1) {
      n &= 7
      return this.write8(((this.out << n) | (this.out >> (8 - n))) & 0xff)
    }
    rotateRight(n = 1) {
      return this.rotateLeft(8 - (n & 7))
    }
    reverse() {
      let r = 0
      for (let i = 0; i < 8; i++) if (this.out & (1 << i)) r |= 1 << (7 - i)
      return this.write8(r)
    }
    value() {
      return this.in
    }
    valueOut() {
      return this.out
    }
    lastError() {
      const e = this.err
      this.err = OK
      return e
    }
    // API xreef: em INPUT o pino fica a HIGH (pull-up fraco) para poder ser lido
    pinMode(pin, mode) {
      const m = 1 << pin
      if (mode === 'OUTPUT') this.inputs &= ~m
      else this.inputs |= m
    }
    digitalWrite(pin, v) {
      return this.write(pin, v)
    }
    digitalRead(pin) {
      return this.read(pin)
    }
    digitalReadAll() {
      const v = this.read8()
      return Object.fromEntries(Array.from({ length: 8 }, (_, k) => [`p${k}`, (v >> k) & 1]))
    }
    digitalWriteAll(v) {
      return this.write8(v)
    }
  }

export default {
  header: 'PCF8574.h',
  globals: { PCF8574_OK: OK, PCF8574_I2C_ERROR: I2C_ERROR, PCF8574_PIN_ERROR: PIN_ERROR, P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7 },
  classes: { PCF8574: (env) => makePcf(env) },
}
