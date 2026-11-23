// DallasTemperature (Miles Burton) sobre OneWire: DS18B20.
// requestTemperatures() inicia a conversão (94/188/375/750 ms a 9/10/11/12 bits) e,
// por omissão, espera por ela. Cada sensor guarda o último valor convertido (85 °C ao
// ligar, como o real, se ler sem converter). −127 °C = sensor que não responde.
import { busDevices, romOf } from './OneWire.js'

const DISC_C = -127
const CONV_MS = { 9: 94, 10: 188, 11: 375, 12: 750 }

export default {
  header: 'DallasTemperature.h',
  globals: { DEVICE_DISCONNECTED_C: DISC_C, DEVICE_DISCONNECTED_F: -196.6, DEVICE_DISCONNECTED_RAW: -7040 },
  classes: {
    // typedef uint8_t DeviceAddress[8]
    DeviceAddress: () =>
      class DeviceAddress extends Array {
        constructor() {
          super()
          for (let i = 0; i < 8; i++) this.push(0)
        }
      },
    DallasTemperature: (env) =>
      class DallasTemperature {
        constructor(ow) {
          this.ow = ow
          this.bits = 12
          this.wait = true
          this.convEnd = 0
        }
        setOneWire(ow) {
          this.ow = ow
        }
        _devs() {
          return this.ow ? (this.ow.reset(), busDevices(env, this.ow.pin)) : []
        }
        begin() {
          env.rt.t += 2000
          this._devs()
        }
        getDeviceCount() {
          return this._devs().length
        }
        getDS18Count() {
          return this.getDeviceCount()
        }
        isParasitePowerMode() {
          return false
        }
        setResolution(a, b) {
          const bits = b === undefined ? a : b
          this.bits = Math.max(9, Math.min(12, Number(bits) | 0))
          env.rt.t += 1000
          return true
        }
        getResolution() {
          return this.bits
        }
        setWaitForConversion(w) {
          this.wait = !!w
        }
        getWaitForConversion() {
          return this.wait
        }
        millisToWaitForConversion(bits = this.bits) {
          return CONV_MS[bits] ?? 750
        }
        _convert(devs) {
          const step = { 9: 0.5, 10: 0.25, 11: 0.125, 12: 0.0625 }[this.bits]
          const done = env.rt.t + CONV_MS[this.bits] * 1000
          for (const p of devs) {
            const t = Math.max(-55, Math.min(125, env.input(p.id).value ?? 22)) // gama do DS18B20
            env.state(p.id).dsPending = { at: done, v: Math.round(t / step) * step }
          }
          this.convEnd = done
          if (this.wait) env.rt.t = done
        }
        requestTemperatures() {
          this._convert(this._devs())
          return { result: true, timestamp: Math.floor(env.rt.t / 1000) }
        }
        requestTemperaturesByIndex(i) {
          const d = this._devs()[i]
          if (d) this._convert([d])
          return !!d
        }
        requestTemperaturesByAddress(addr) {
          const d = this._byAddr(addr)
          if (d) this._convert([d])
          return !!d
        }
        isConversionComplete() {
          return env.rt.t >= this.convEnd
        }
        _byAddr(addr) {
          return this._devs().find((p) => romOf(p.id).every((b, i) => b === (addr?.[i] ?? -1)))
        }
        _read(p) {
          if (!p) return DISC_C
          env.rt.t += 6000 // seleção + leitura do bloco de 9 bytes
          const s = env.state(p.id)
          if (s.dsPending && env.rt.t >= s.dsPending.at) {
            s.dsValue = s.dsPending.v
            s.dsPending = null
          }
          return s.dsValue ?? 85
        }
        getTempCByIndex(i) {
          return this._read(this._devs()[i])
        }
        getTempFByIndex(i) {
          return this.toFahrenheit(this.getTempCByIndex(i))
        }
        getTempC(addr) {
          return this._read(this._byAddr(addr))
        }
        getTempF(addr) {
          return this.toFahrenheit(this.getTempC(addr))
        }
        getAddress(addr, i) {
          const p = this._devs()[i]
          if (!p) return false
          romOf(p.id).forEach((b, k) => (addr[k] = b))
          return true
        }
        isConnected(addr) {
          return !!this._byAddr(addr)
        }
        validAddress(addr) {
          return addr?.[0] === 0x28
        }
        toFahrenheit(c) {
          return c <= DISC_C ? -196.6 : c * 1.8 + 32
        }
        toCelsius(f) {
          return (f - 32) / 1.8
        }
      },
  },
}
