// SoftwareSerial: porta série por software em quaisquer dois pinos digitais.
// Como no AVR: só uma instância ouve de cada vez (a última com begin() ou listen()),
// buffer de receção de 64 bytes (o que chega a mais perde-se: overflow() fica true) e
// enviar bloqueia o programa (o envio é feito bit a bit, ~1 ms por carácter a 9600 baud).
import { UartReader, uartSend, toBytes, charUs, streamMethods } from './_uart.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  header: 'SoftwareSerial.h',
  globals: { SERIAL_8N1: 0x800001c },
  classes: {
    SoftwareSerial: (env) =>
      class SoftwareSerial {
        constructor(rx, tx, inverse = false) {
          this.rx = rx
          this.tx = tx
          this.inverse = !!inverse
          this.baud = 9600
          this.begun = false
          this.ov = false
          this.timeout = { ms: 1000 }
          this.rd = new UartReader(env.circuit, () => env.netOfPin(this.rx), 64)
          Object.assign(this, streamMethods(this.rd, () => this._pull(), env.rt, this.timeout))
        }
        _pull() {
          const listening = env._ssListen === this
          this.rd.pull(env.rt.t, this.baud, listening && this.begun)
          if (this.rd.overflowed) {
            this.ov = true
            this.rd.overflowed = false
            env.warnOnce(`ssov${this.rx}`, i18n.m(`SoftwareSerial (RX ${this.rx}): o buffer de 64 bytes encheu e perderam-se dados — leia a porta mais vezes (evite delay() longos enquanto o módulo envia).`, `SoftwareSerial (RX ${this.rx}): the 64-byte buffer filled up and data was lost — read the port more often (avoid long delay() calls while the module is sending).`), 'info')
          }
          if (this.rd.mismatch && !this.warned) {
            this.warned = true
            env.warnOnce(`ssbaud${this.rx}`, i18n.m(`SoftwareSerial a ${this.baud} baud mas o módulo no pino ${this.rx} envia a ${this.rd.mismatch.tx} baud: chega lixo. Use begin(${this.rd.mismatch.tx}).`, `SoftwareSerial at ${this.baud} baud but the module on pin ${this.rx} sends at ${this.rd.mismatch.tx} baud: garbage arrives. Use begin(${this.rd.mismatch.tx}).`))
          }
        }
        begin(baud = 9600) {
          this.baud = Number(baud) || 9600
          if (this.baud > 115200) env.warnOnce('ssfast', i18n.m(`SoftwareSerial a ${this.baud} baud: no Uno só é fiável até ~57600 baud.`, `SoftwareSerial at ${this.baud} baud: on the Uno it is only reliable up to ~57600 baud.`))
          this.begun = true
          if (env.board.pins[this.tx]) {
            env.api.pinMode(this.tx, 'OUTPUT')
            env.api.digitalWrite(this.tx, this.inverse ? 0 : 1)
          }
          if (env.board.pins[this.rx]) env.api.pinMode(this.rx, 'INPUT_PULLUP')
          this.listen()
        }
        end() {
          this.begun = false
          if (env._ssListen === this) env._ssListen = null
        }
        listen() {
          if (env._ssListen === this) return false
          env._ssListen?._pull()
          env._ssListen = this
          this.rd.buf.length = 0
          this.rd.skip()
          return true
        }
        isListening() {
          return env._ssListen === this
        }
        stopListening() {
          if (env._ssListen !== this) return false
          env._ssListen = null
          return true
        }
        overflow() {
          this._pull()
          const o = this.ov
          this.ov = false
          return o
        }
        _send(bytes) {
          if (!this.begun) {
            env.warnOnce(`ssnb${this.tx}`, i18n.m('SoftwareSerial: print()/write() antes de begin() — nada é enviado.', 'SoftwareSerial: print()/write() before begin() — nothing is sent.'))
            return 0
          }
          const t = uartSend(env.circuit, env.netOfPin(this.tx), bytes, env.rt.t, this.baud)
          // o AVR fica ocupado a gerar os bits (com as interrupções desligadas)
          env.rt.t = Math.max(env.rt.t, t)
          void charUs
          return bytes.length
        }
        write(v, n) {
          if (typeof v === 'string') return this._send(toBytes(n != null ? v.slice(0, n) : v))
          if (Array.isArray(v) || ArrayBuffer.isView(v)) return this._send(Array.from(v).slice(0, n ?? v.length))
          return this._send([Number(v) & 0xff])
        }
        print(v, base) {
          return this._send(toBytes(env.fmt(v, base)))
        }
        println(v = '', base) {
          return (v === '' ? 0 : this.print(v, base)) + this._send([13, 10])
        }
        flush() {}
        availableForWrite() {
          return 0
        }
      },
  },
}
