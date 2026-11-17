// Ponte entre o motor (engine.js) e o emulador do microcontrolador: junta o que o
// emulador precisa do motor (pinos, circuito, Monitor Série, EEPROM…) num objeto `host`.
// firmware = { kind: 'avr', hex } (ver compile-real.js / sim/engine-select.js)
import { DEFS } from '../../../../../shared/components.js'
import { BEHAVIORS } from '../parts/index.js'
import { createAvrRunner } from './runner.js'
import { mcuOfProfile } from './mcu.js'
import * as i18n from '../../../../../shared/i18n.js'

export function createMcuEmulator(firmware, e) {
  if (firmware.kind !== 'avr') throw new Error(i18n.m(`emulador "${firmware.kind}" não disponível`, `emulator "${firmware.kind}" not available`))
  const mcu = mcuOfProfile(e.prof)
  if (!mcu) throw new Error(i18n.m(`a placa ${e.prof.mcu} não é um AVR`, `the ${e.prof.mcu} board is not an AVR`))
  const { arduino, circuit, prof } = e
  const pinName = (n) => prof.pins[n]
  const dec = new TextDecoder()
  let cr = false
  const host = {
    prof,
    pins: e.pins,
    pinLog: e.pinLog,
    servoOut: e.servoOut,
    servoUs: e.servoUs,
    parts: e.parts,
    arduino,
    circuit,
    env: e.env,
    defs: DEFS,
    behaviors: BEHAVIORS,
    nvm: e.nvm,
    touch: e.touch,
    isDirty: e.isDirty,
    solve: e.solve,
    // nível lógico que o circuito impõe numa entrada (null = a flutuar)
    readLevel(n) {
      if (!arduino || !pinName(n)) return null
      e.solve()
      if (circuit.floating(arduino.id, pinName(n))) return null
      return e.pinV(n) > prof.vio / 2 ? 1 : 0
    },
    readVolt: (n) => e.readVolt(n),
    noise: (a) => e.rand(a),
    // bytes da USART0 → Monitor Série (UTF-8; o CR do "\r\n" do println não aparece)
    serialOut(b) {
      if (b === 13) return void (cr = true)
      let t = dec.decode(Uint8Array.of(b), { stream: true })
      if (cr && b !== 10) t = `\r${t}`
      cr = false
      if (t) e.onSerial?.(t)
    },
    log: (t, level) => e.onSerial?.(t.endsWith('\n') ? t : `${t}\n`, level),
    warnOnce: e.warnOnce,
    pinsOn: (partId, pin) => e.arduinoPinsOnNet(partId, pin),
    sonarDistance: e.sonarDistance,
  }
  return createAvrRunner(host, mcu, firmware.hex)
}
