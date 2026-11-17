// SoftwareWire.h (Testato) — I2C por software em quaisquer dois pinos digitais, só mestre.
// Fala com os mesmos dispositivos simulados que a Wire.h (componentes com gancho `i2c`), mas
// só com os que têm SDA/SCL ligados aos pinos dados no construtor. Mais lenta do que a Wire
// (no Uno real ~40–90 kHz mesmo com setClock(100000)), o que conta para o tempo do programa.
// endTransmission(): 0 = OK, 2 = ninguém respondeu no endereço (como na biblioteca real).
import { i2cDevice, i2cTime } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const ERR = { SOFTWAREWIRE_NO_ERROR: 0, SOFTWAREWIRE_BUFFER_FULL: 1, SOFTWAREWIRE_ADDRESS_NACK: 2, SOFTWAREWIRE_DATA_NACK: 3, SOFTWAREWIRE_OTHER: 4, SOFTWAREWIRE_BUFSIZE: 32 }

export default {
  header: 'SoftwareWire.h',
  globals: ERR,
  classes: {
    SoftwareWire: (env) =>
      class SoftwareWire {
        constructor(sda, scl, pullups = true) {
          this.sda = sda
          this.scl = scl
          this.pullups = pullups
          this.hz = 100000
          this.tx = null
          this.rx = []
          this.status = 0
        }
        // transação nos pinos desta instância (a Wire usa env.i2cPins; repõe-se no fim)
        _on(fn) {
          if (this.sda == null || this.scl == null) {
            env.warnOnce('swire-pins', i18n.m('SoftwareWire: crie o objeto com os pinos, ex.: SoftwareWire meuWire(4, 5); (SDA, SCL).', 'SoftwareWire: create the object with the pins, e.g. SoftwareWire myWire(4, 5); (SDA, SCL).'))
            return fn()
          }
          const prev = env.i2cPins
          env.i2cPins = { sda: Number(this.sda), scl: Number(this.scl) }
          try {
            return fn()
          } finally {
            env.i2cPins = prev
          }
        }
        // velocidade real da biblioteca (bit-banging com digitalWrite/pinMode): ~70 % do pedido, máx. ~90 kHz
        _time(n) {
          i2cTime(env, n, Math.min(this.hz * 0.7, 90000))
        }
        begin() {
          this.begun = true
          if (!this.pullups) env.warnOnce('swire-pullup', i18n.m('SoftwareWire sem pull-ups internos: lembre-se das resistências de pull-up (4,7 kΩ) em SDA e SCL.', 'SoftwareWire without internal pull-ups: remember the pull-up resistors (4.7 kΩ) on SDA and SCL.'), 'info')
        }
        end() {
          this.begun = false
        }
        setClock(hz) {
          this.hz = Math.max(1000, Math.min(400000, Number(hz) || 100000))
        }
        setTimeout() {}
        beginTransmission(addr) {
          this.tx = { addr: Number(addr) & 0x7f, data: [] }
          this.status = 0
        }
        // write(byte) | write(texto) | write(buffer, n)
        write(v, n) {
          if (!this.tx) return 0
          let bytes
          if (typeof v === 'string') bytes = [...v].map((c) => c.charCodeAt(0) & 0xff)
          else if (Array.isArray(v) || ArrayBuffer.isView(v)) bytes = Array.from(v).slice(0, n ?? v.length)
          else bytes = [Number(v) & 0xff]
          const room = ERR.SOFTWAREWIRE_BUFSIZE - this.tx.data.length
          if (bytes.length > room) this.status = ERR.SOFTWAREWIRE_BUFFER_FULL
          bytes = bytes.slice(0, Math.max(0, room))
          this.tx.data.push(...bytes.map((b) => Number(b) & 0xff))
          return bytes.length
        }
        endTransmission() {
          const t = this.tx
          this.tx = null
          if (!t) return ERR.SOFTWAREWIRE_OTHER
          if (!this.begun) env.warnOnce('swire-begin', i18n.m('SoftwareWire: falta chamar begin() no setup().', 'SoftwareWire: begin() is not called in setup().'))
          return this._on(() => {
            this._time(t.data.length)
            const dev = i2cDevice(env, t.addr)
            if (!dev) return ERR.SOFTWAREWIRE_ADDRESS_NACK
            if (t.data.length) dev.write(t.data)
            return this.status
          })
        }
        requestFrom(addr, n) {
          const k = Math.max(0, Math.min(ERR.SOFTWAREWIRE_BUFSIZE, Number(n) | 0))
          return this._on(() => {
            this._time(k)
            const dev = i2cDevice(env, Number(addr) & 0x7f)
            this.rx = dev ? dev.read(k) : []
            return this.rx.length
          })
        }
        available() {
          return this.rx.length
        }
        read() {
          return this.rx.length ? this.rx.shift() : -1
        }
        peek() {
          return this.rx.length ? this.rx[0] : -1
        }
        readBytes(buf, n) {
          let k = 0
          while (k < n && this.rx.length) buf[k++] = this.rx.shift()
          return k
        }
        printStatus(ser) {
          ser.println(i18n.m(`SoftwareWire: SDA ${this.sda}, SCL ${this.scl}, ${this.hz} Hz, pull-ups ${this.pullups ? 'sim' : 'não'}, último estado ${this.status}`, `SoftwareWire: SDA ${this.sda}, SCL ${this.scl}, ${this.hz} Hz, pull-ups ${this.pullups ? 'yes' : 'no'}, last status ${this.status}`))
        }
      },
  },
}
