// I2C_eeprom.h (Rob Tillaart) — EEPROM I2C 24xx: writeByte/readByte, updateByte, writeBlock /
// readBlock (com divisão em páginas, como a biblioteca), setBlock, isConnected, getDeviceSize.
// Fala com a peça "eeprom24" pelo mesmo barramento I2C da Wire (sim/parts/eeprom24.js).
import { i2cDevice, i2cHint, i2cTime } from './_i2c.js'
import { EEPROM_CHIPS } from '../../../../../shared/parts/eeprom24.js'
import * as i18n from '../../../../../shared/i18n.js'

const SIZES = { I2C_DEVICESIZE_24LC512: 65536, I2C_DEVICESIZE_24LC256: 32768, I2C_DEVICESIZE_24LC128: 16384, I2C_DEVICESIZE_24LC64: 8192, I2C_DEVICESIZE_24LC32: 4096, I2C_DEVICESIZE_24LC16: 2048, I2C_DEVICESIZE_24LC08: 1024, I2C_DEVICESIZE_24LC04: 512, I2C_DEVICESIZE_24LC02: 256, I2C_DEVICESIZE_24LC01: 128 }

export default {
  header: 'I2C_eeprom.h',
  globals: { ...SIZES, I2C_EEPROM_VERSION: '"1.8.5"' },
  classes: {
    I2C_eeprom: (env) =>
      class I2C_eeprom {
        constructor(addr = 0x50, size = 32768) {
          this.addr = addr
          this.size = typeof size === 'number' ? size : 32768
        }
        dev() {
          const d = i2cDevice(env, this.addr, 'eeprom24')
          if (!d) env.warnOnce(`ee${this.addr}`, i18n.m(`I2C_eeprom: não há nenhuma EEPROM em 0x${this.addr.toString(16)} — VCC/GND ligados? ${i2cHint(env)}. A0–A2 ao GND = 0x50.`, `I2C_eeprom: there is no EEPROM at 0x${this.addr.toString(16)} — VCC/GND connected? ${i2cHint(env)}. A0–A2 to GND = 0x50.`))
          return d
        }
        chip() {
          const d = this.dev()
          return d ? EEPROM_CHIPS[d.part.config?.chip] || EEPROM_CHIPS['24LC256'] : null
        }
        addrBytes(mem) {
          const c = this.chip()
          return c?.ab === 1 ? [mem & 0xff] : [(mem >> 8) & 0xff, mem & 0xff]
        }
        begin() {
          return true
        }
        isConnected() {
          return this.dev() ? true : false
        }
        getDeviceSize() {
          return this.chip()?.size ?? this.size
        }
        getPageSize() {
          return this.chip()?.page ?? 64
        }
        determineSize() {
          return this.getDeviceSize()
        }
        writeByte(mem, v) {
          const d = this.dev()
          if (!d) return 2
          const a = this.addrBytes(mem)
          d.write([...a, v & 0xff])
          i2cTime(env, a.length + 1, env.i2cHz)
          env.rt.t += 5000 // ciclo de escrita (5 ms)
          return 0
        }
        updateByte(mem, v) {
          return this.readByte(mem) === (v & 0xff) ? 0 : this.writeByte(mem, v)
        }
        readByte(mem) {
          const d = this.dev()
          if (!d) return 0
          d.write(this.addrBytes(mem))
          i2cTime(env, 3, env.i2cHz)
          return d.read(1)[0] & 0xff
        }
        // escreve por páginas (a biblioteca nunca deixa uma escrita passar o fim de uma página)
        writeBlock(mem, buf, len) {
          const d = this.dev()
          if (!d) return 2
          const page = this.getPageSize()
          let i = 0
          while (i < len) {
            const room = page - ((mem + i) % page)
            const n = Math.min(room, len - i, 30) // 30: buffer da Wire
            const a = this.addrBytes(mem + i)
            d.write([...a, ...Array.from({ length: n }, (_, k) => (typeof buf === 'string' ? buf.charCodeAt(i + k) : buf[i + k]) & 0xff)])
            i2cTime(env, a.length + n, env.i2cHz)
            env.rt.t += 5000
            i += n
          }
          return 0
        }
        readBlock(mem, buf, len) {
          const d = this.dev()
          if (!d) return 0
          d.write(this.addrBytes(mem))
          const data = d.read(len)
          i2cTime(env, len + 2, env.i2cHz)
          for (let k = 0; k < len; k++) buf[k] = data[k] & 0xff
          return len
        }
        setBlock(mem, v, len) {
          return this.writeBlock(mem, new Array(len).fill(v & 0xff), len)
        }
        updateBlock(mem, buf, len) {
          const cur = new Array(len)
          this.readBlock(mem, cur, len)
          for (let k = 0; k < len; k++) if (cur[k] !== (buf[k] & 0xff)) this.writeByte(mem + k, buf[k])
          return 0
        }
      },
  },
}
