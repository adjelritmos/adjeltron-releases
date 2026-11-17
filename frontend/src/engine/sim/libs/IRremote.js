// IRremote (Arduino-IRremote 3.x/4.x e a API antiga 2.x).
//  Nova: IrReceiver.begin(pino); if (IrReceiver.decode()) { IrReceiver.decodedIRData.command … IrReceiver.resume(); }
//  Antiga: IRrecv irrecv(pino); decode_results r; irrecv.enableIRIn(); if (irrecv.decode(&r)) { r.value … irrecv.resume(); }
// As tramas NEC chegam ao recetor (peça irReceiver, s.irQ) vindas do Comando IR; só
// ficam completas 67,5 ms depois de a tecla ser premida (11,25 ms nas repetições).
import { NEC_US, REP_US } from '../parts/irReceiver.js'
import * as i18n from '../../../../../shared/i18n.js'

const NEC = 8
const FLAG_REPEAT = 0x01
const rev8 = (b) => parseInt((b & 0xff).toString(2).padStart(8, '0').split('').reverse().join(''), 2)

function makeRx(env) {
  return {
    pin: -1,
    held: false,
    started: false,
    decodedIRData: { protocol: 0, address: 0, command: 0, decodedRawData: 0, numberOfBits: 0, flags: 0 },
    _part() {
      const p = env.partsOnPin(this.pin, 'irReceiver')[0]
      if (!p) {
        env.warnOnce('irpin', i18n.m(`IRremote: não há nenhum recetor IR com DAT ligado ao pino ${this.pin}.`, `IRremote: no IR receiver has DAT connected to pin ${this.pin}.`))
        return null
      }
      return env.powered(p.id) ? p : null
    },
    begin(pin = 2) {
      this.pin = pin
      this.started = true
      env.api.pinMode(pin, 'INPUT')
      this._part()
    },
    enableIRIn() {
      this.started = true
      env.api.pinMode(this.pin, 'INPUT')
      this._part()
    },
    start() {
      this.started = true
    },
    stop() {
      this.started = false
    },
    // devolve a próxima trama completa (ou null)
    _next() {
      env.rt.t += 6
      if (!this.started) {
        env.warnOnce('irstart', i18n.m('IRremote: falta IrReceiver.begin(pino) (ou irrecv.enableIRIn()) no setup().', 'IRremote: IrReceiver.begin(pin) (or irrecv.enableIRIn()) is missing in setup().'))
        return null
      }
      if (this.held) return null
      const p = this._part()
      if (!p) return null
      const q = env.state(p.id).irQ
      if (!q?.length) return null
      const f = q[0]
      if (f.t + (f.rep ? REP_US : NEC_US) > env.rt.t) return null
      q.shift()
      this.held = true
      return f
    },
    decode(results) {
      const f = this._next()
      if (!f) return false
      const cmd = f.cmd & 0xff
      const raw = (((~cmd & 0xff) << 24) | (cmd << 16) | (0xff << 8) | 0x00) >>> 0
      Object.assign(this.decodedIRData, { protocol: NEC, address: 0, command: f.rep ? this.decodedIRData.command : cmd, decodedRawData: f.rep ? 0 : raw, numberOfBits: f.rep ? 0 : 32, flags: f.rep ? FLAG_REPEAT : 0 })
      if (results && typeof results === 'object') {
        // API antiga: valor de 32 bits MSB primeiro (0xFFA25D para POWER); repetição = 0xFFFFFFFF
        const legacy = ((rev8(0) << 24) | (rev8(0xff) << 16) | (rev8(cmd) << 8) | rev8(~cmd & 0xff)) >>> 0
        Object.assign(results, { decode_type: NEC, value: f.rep ? 0xffffffff : legacy, bits: 32, address: 0, command: cmd })
      }
      return true
    },
    resume() {
      this.held = false
      env.rt.t += 4
    },
    isIdle() {
      return true
    },
    available() {
      return !this.held
    },
    printIRResultShort(out) {
      const d = this.decodedIRData
      const t = d.flags & FLAG_REPEAT ? `Protocol=NEC Address=0x0 Command=0x${d.command.toString(16).toUpperCase()} Repeat gap=108ms` : `Protocol=NEC Address=0x0 Command=0x${d.command.toString(16).toUpperCase()} Raw-Data=0x${d.decodedRawData.toString(16).toUpperCase()} 32 bits LSB first`
      ;(out?.println ? out : env.api.Serial).println(t)
    },
    printIRResultMinimal(out) {
      ;(out?.print ? out : env.api.Serial).print(`P=NEC A=0x0 C=0x${this.decodedIRData.command.toString(16).toUpperCase()}`)
    },
    printIRSendUsage() {},
  }
}

export default {
  header: 'IRremote.h',
  globals: {
    ENABLE_LED_FEEDBACK: true, DISABLE_LED_FEEDBACK: false, USE_DEFAULT_FEEDBACK_LED_PIN: 0,
    NEC, UNKNOWN: -1, REPEAT: 0xffffffff, IRDATA_FLAGS_IS_REPEAT: FLAG_REPEAT,
    getProtocolString: (p) => (p === NEC ? 'NEC' : 'UNKNOWN'),
  },
  env: (env) => ({ IrReceiver: makeRx(env) }),
  classes: {
    IRrecv: (env) =>
      class IRrecv {
        constructor(pin = 2) {
          Object.assign(this, makeRx(env))
          this.pin = pin
          this.decodedIRData = { protocol: 0, address: 0, command: 0, decodedRawData: 0, numberOfBits: 0, flags: 0 }
        }
      },
    decode_results: () =>
      class decode_results {
        constructor() {
          Object.assign(this, { decode_type: 0, value: 0, bits: 0, address: 0, command: 0 })
        }
      },
  },
}
