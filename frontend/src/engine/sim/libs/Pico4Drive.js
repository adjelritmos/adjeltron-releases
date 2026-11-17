// Pico4Drive (Paulo Costa / Paulo Marques, github.com/P33a/Pico4DriveLib, v1.0.1) — mesma API e
// mesmos pinos da biblioteca real (src/Pico4Drive.cpp):
//   drivers DRV8212P: DRV1 = GP11 (A) / GP10 (B), DRV2 = GP13/GP12, DRV3 = GP15/GP14, DRV4 = GP17/GP16
//   multiplexador 74HC4051: seleção GP18/GP19/GP20, saída no GP28 (A2)
//   ATtiny412 (gestão de energia): fala por série no GP21 (1 byte: bit0 = botão ON,
//   bits 1–7 = (Vbat − 4,8 V) / 50 mV); GP21 a LOW pede para desligar a placa.
// Os sinais saem mesmo pelos pinos da Pico (analogWrite/digitalWrite/analogRead): a placa
// (backend/sim/parts/pico4drive.js) lê-os pelo soquete, como no hardware.
import { blocking } from './_net.js'
import * as i18n from '../../../../../shared/i18n.js'

const MUX = [18, 19, 20]
const TINY = 21
const ADC_IN = 28
const DRV = [[11, 10], [13, 12], [15, 14], [17, 16]]
const TINY_PERIOD_US = 10000 // o ATtiny envia o estado a cada ~10 ms

function make(env) {
  const api = () => env.api
  return class pico4drive_t {
    constructor() {
      this.analogWriteBits = 10
      this.analogWriteMax = 1023
      this.battery_voltage = 7.4
      this.PWM_limit = Math.trunc((this.analogWriteMax * 5.5) / this.battery_voltage)
      this.button_state = 0
      this.button_press_count = 0
      this._board = null
      this._rx = 0
    }
    _carrier() {
      if (!this._board) this._board = env.partsOnPin(TINY, 'pico4drive')[0] || null
      return this._board
    }
    init(PWM_freq = 16000) {
      const a = api()
      for (const p of MUX) a.pinMode(p, 'OUTPUT')
      a.analogWriteResolution(this.analogWriteBits)
      a.analogWriteFreq(PWM_freq)
      for (const [pa, pb] of DRV) {
        a.pinMode(pa, 'OUTPUT')
        a.pinMode(pb, 'OUTPUT')
      }
      this.button_press_count = 0
      this._rx = env.rt.t
      if (!this._carrier()) env.warnOnce('p4d-none', i18n.m('pico4drive.init(): a Pico não está encaixada numa placa Pico4Drive (soquete) — os motores, o ADC multiplexado e a bateria não respondem.', 'pico4drive.init(): the Pico is not seated on a Pico4Drive board (socket) — the motors, the multiplexed ADC and the battery do not respond.'))
    }
    update() {
      const b = this._carrier()
      if (!b) return
      const s = env.state(b.id) || {}
      if (!s.pwr) return
      // bytes recebidos do ATtiny desde a última chamada (só interessa o último)
      if (env.rt.t - this._rx < TINY_PERIOD_US) return
      this._rx = env.rt.t
      env.rt.t += 90 // ler o byte da SerialPIO
      const q = Math.max(0, Math.min(127, Math.round(((s.vbat ?? 0) - 4.8) / 0.05)))
      const c = (q << 1) | (env.input(b.id).pressed ? 1 : 0)
      const bstate = c & 1
      if (bstate && !this.button_state) this.button_press_count++
      this.button_state = bstate
      this.battery_voltage = 1e-3 * ((c >> 1) * 50 + 4800)
    }
    read_adc(channel) {
      const a = api()
      // gpio_put_masked(): os 3 pinos mudam ao mesmo tempo
      MUX.forEach((p, i) => a.digitalWrite(p, (channel >> i) & 1))
      env.rt.t += 10 // delayMicroseconds(10)
      env.warnOnce('p4d-adc', i18n.m('Pico4Drive read_adc(): devolve o valor do analogRead(A2) — 0–1023 por omissão no core Arduino-Pico (10 bits); com analogReadResolution(12) passa a 0–4095.', 'Pico4Drive read_adc(): returns the analogRead(A2) value — 0–1023 by default in the Arduino-Pico core (10 bits); with analogReadResolution(12) it becomes 0–4095.'), 'info')
      return a.analogRead(ADC_IN)
    }
    voltage_to_PWM(u) {
      return Math.trunc((u / this.battery_voltage) * this.analogWriteMax)
    }
    set_driver_PWM(new_PWM, a_or_drv, pin_b) {
      let pa, pb
      if (pin_b === undefined) {
        const d = DRV[a_or_drv | 0]
        if (!d) return env.warnOnce('p4d-drv', i18n.m(`set_driver_PWM(): driver ${a_or_drv} não existe (use p2d_drv1…p2d_drv4).`, `set_driver_PWM(): driver ${a_or_drv} does not exist (use p2d_drv1…p2d_drv4).`))
        ;[pa, pb] = d
      } else [pa, pb] = [a_or_drv, pin_b]
      const a = api()
      const max = this.analogWriteMax
      let v = Math.trunc(Number(new_PWM) || 0)
      if (v > this.PWM_limit) v = this.PWM_limit
      if (v < -this.PWM_limit) v = -this.PWM_limit
      if (v === 0) {
        // A = H, B = H → travão (as duas saídas a GND)
        a.analogWrite(pa, max)
        a.analogWrite(pb, max)
      } else if (v > 0) {
        a.analogWrite(pa, max - v)
        a.analogWrite(pb, max)
      } else {
        a.analogWrite(pa, max)
        a.analogWrite(pb, max + v)
      }
    }
    set_driver_voltage(new_voltage, driver_num) {
      const pwm = this.voltage_to_PWM(new_voltage)
      this.set_driver_PWM(pwm, driver_num)
      return pwm
    }
    power_off() {
      const a = api()
      a.pinMode(TINY, 'OUTPUT')
      a.digitalWrite(TINY, 0)
      // while (1); — a placa desliga-se (e a Pico com ela, se não estiver na USB)
      return blocking(function* () {
        for (;;) {
          env.rt.t += 1000
          if (env.rt.t >= env.rt.target) yield
        }
      })
    }
  }
}

export default {
  header: 'Pico4Drive.h',
  globals: { p2d_drv1: 0, p2d_drv2: 1, p2d_drv3: 2, p2d_drv4: 3 },
  classes: {
    pico4drive_t: (env) => make(env),
    Pico4Drive: (env) => make(env),
  },
}
