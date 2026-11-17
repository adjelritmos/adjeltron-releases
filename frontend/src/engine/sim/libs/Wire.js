// Wire.h — barramento I2C (SDA/SCL nos pinos I2C da placa: A4/A5 no Uno/Nano, 21/22 no ESP32).
// Fala com os componentes em plugin que têm o gancho `i2c` (MPU6050, PCA9685…).
// endTransmission() devolve 0 (ACK) ou 2 (ninguém respondeu no endereço), como no real,
// por isso um "scanner" I2C funciona. Cada byte custa 9 ciclos do relógio (100 kHz por
// omissão; Wire.setClock(400000) para 400 kHz).
import { i2cDevice, i2cTime } from './_i2c.js'

const makeWire = (env) => {
  let tx = null
  let rx = []
  env.i2cHz = 100000
  return {
    // ESP32: Wire.begin(sda, scl) também escolhe os pinos
    begin(sda, scl, freq) {
      if (sda != null && scl != null && typeof sda === 'number') env.i2cPins = { sda: Number(sda), scl: Number(scl) }
      if (freq) env.i2cHz = Math.max(10000, Math.min(1000000, Number(freq)))
      return true
    },
    end() {},
    // ESP32/Pico: Wire.setSDA(4); Wire.setSCL(5); Wire.setPins(4, 5) — na simulação o barramento
    // é lógico (os componentes com gancho `i2c` respondem pelo endereço), por isso só se regista
    setPins(sda, scl) {
      env.i2cPins = { sda: Number(sda), scl: Number(scl) }
      return true
    },
    setSDA(sda) {
      env.i2cPins = { ...(env.i2cPins || {}), sda: Number(sda) }
      return true
    },
    setSCL(scl) {
      env.i2cPins = { ...(env.i2cPins || {}), scl: Number(scl) }
      return true
    },
    setClock(hz) {
      env.i2cHz = Math.max(10000, Math.min(1000000, Number(hz) || 100000))
    },
    setTimeout() {},
    setWireTimeout() {},
    beginTransmission(addr) {
      tx = { addr: Number(addr) & 0x7f, data: [] }
    },
    // write(byte) | write(texto) | write(buffer, n)
    write(v, n) {
      if (!tx) return 0
      let bytes
      if (typeof v === 'string') bytes = [...v].map((c) => c.charCodeAt(0) & 0xff)
      else if (Array.isArray(v) || ArrayBuffer.isView(v)) bytes = Array.from(v).slice(0, n ?? v.length)
      else bytes = [Number(v) & 0xff]
      tx.data.push(...bytes.map((b) => Number(b) & 0xff))
      return bytes.length
    },
    // stop = false (início repetido) não muda nada na simulação
    endTransmission() {
      const t = tx
      tx = null
      if (!t) return 4
      i2cTime(env, t.data.length, env.i2cHz)
      const dev = i2cDevice(env, t.addr)
      if (!dev) return 2
      if (t.data.length) dev.write(t.data)
      return 0
    },
    requestFrom(addr, n) {
      const k = Math.max(0, Math.min(32, Number(n) | 0)) // buffer de 32 bytes da Wire do AVR
      i2cTime(env, k, env.i2cHz)
      const dev = i2cDevice(env, Number(addr) & 0x7f)
      rx = dev ? dev.read(k) : []
      return rx.length
    },
    available: () => rx.length,
    read: () => (rx.length ? rx.shift() : -1),
    peek: () => (rx.length ? rx[0] : -1),
    flush() {},
    onReceive() {},
    onRequest() {},
  }
}

export default {
  header: 'Wire.h',
  // Wire1 = segundo barramento do ESP32/Pico; na simulação vê os mesmos dispositivos
  env: (env) => ({ Wire: makeWire(env), Wire1: makeWire(env) }),
  // TwoWire I2C_PCA = TwoWire(0); (ESP32: segundo objeto com outros pinos) — na simulação
  // todos os barramentos veem os mesmos dispositivos, nos pinos escolhidos em begin()
  classes: {
    TwoWire: (env) =>
      class TwoWire {
        constructor() {
          Object.assign(this, makeWire(env))
        }
      },
  },
}
