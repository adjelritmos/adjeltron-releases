// OneWire (Paul Stoffregen): barramento 1-Wire num pino. Os dispositivos são as peças
// DS18B20 com DQ ligado ao pino, alimentadas e com pull-up (s.pulled). reset() devolve 1
// se algum responder; search() percorre os endereços de 64 bits (família 0x28).
import * as i18n from '../../../../../shared/i18n.js'
export function crc8(bytes, len = bytes.length) {
  let crc = 0
  for (let i = 0; i < len; i++) {
    let b = bytes[i] & 0xff
    for (let j = 0; j < 8; j++) {
      const mix = (crc ^ b) & 1
      crc >>= 1
      if (mix) crc ^= 0x8c
      b >>= 1
    }
  }
  return crc
}
// endereço ROM (64 bits) estável derivado do id da peça
export function romOf(id) {
  let h = 2166136261
  for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const rom = [0x28, h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff, (h >> 24) & 0xff, 0x05, 0x00]
  return [...rom, crc8(rom)]
}
// sensores que respondem neste pino
export function busDevices(env, pin) {
  return env.partsOnPin(pin, 'ds18b20').filter((p) => env.powered(p.id) && env.state(p.id).pulled)
}

export default {
  header: 'OneWire.h',
  classes: {
    OneWire: (env) =>
      class OneWire {
        constructor(pin) {
          this.pin = pin
          this.searchIdx = 0
        }
        _devs() {
          env.api.pinMode(this.pin, 'INPUT')
          const all = env.partsOnPin(this.pin, 'ds18b20')
          const ok = busDevices(env, this.pin)
          if (all.length && !ok.length) {
            const unpulled = all.some((p) => env.powered(p.id) && !env.state(p.id).pulled)
            env.warnOnce('owpull', unpulled ? i18n.m('OneWire: o DS18B20 não responde — falta a resistência de pull-up de 4,7 kΩ entre DQ e 5V.', 'OneWire: the DS18B20 does not respond — the 4.7 kΩ pull-up resistor between DQ and 5V is missing.') : i18n.m('OneWire: o DS18B20 não tem alimentação (VDD → 5V, GND → GND).', 'OneWire: the DS18B20 has no power (VDD → 5V, GND → GND).'))
          }
          return ok
        }
        reset() {
          env.rt.t += 960
          return this._devs().length ? 1 : 0
        }
        write() {
          env.rt.t += 70 * 8
        }
        write_bytes(buf, n) {
          env.rt.t += 70 * 8 * n
        }
        read() {
          env.rt.t += 70 * 8
          return 0xff
        }
        read_bytes(buf, n) {
          for (let i = 0; i < n; i++) buf[i] = this.read()
        }
        select() {
          env.rt.t += 70 * 72
        }
        skip() {
          env.rt.t += 70 * 8
        }
        depower() {}
        reset_search() {
          this.searchIdx = 0
        }
        search(addr) {
          env.rt.t += 13000
          const devs = this._devs()
          if (this.searchIdx >= devs.length) {
            this.searchIdx = 0
            return false
          }
          const rom = romOf(devs[this.searchIdx++].id)
          for (let i = 0; i < 8; i++) addr[i] = rom[i]
          return true
        }
        static crc8(a, len) {
          return crc8(a, len)
        }
      },
  },
}
