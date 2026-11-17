// HX711 (bogde/olkal): ADC de 24 bits da célula de carga. 10 conversões por segundo:
// read() espera pela próxima (até 100 ms). Valor bruto = desvio do zero da ponte
// (+ ~8000) + massa × ~420 contagens/g (canal A, ganho 128) + ruído de ±40 contagens.
import * as i18n from '../../../../../shared/i18n.js'
const COUNTS_PER_G = 420
const PERIOD_US = 100000

export default {
  header: 'HX711.h',
  classes: {
    HX711: (env) =>
      class HX711 {
        constructor() {
          Object.assign(this, { dout: -1, sck: -1, gain: 128, OFFSET: 0, SCALE: 1, next: 0, part: null, down: false })
        }
        begin(dout, sck, gain = 128) {
          this.dout = dout
          this.sck = sck
          this.set_gain(gain)
          env.api.pinMode(sck, 'OUTPUT')
          env.api.pinMode(dout, 'INPUT')
          const p = env.partsOnPin(dout, 'hx711')[0] || null
          if (!p) env.warnOnce('hxdt', i18n.m(`HX711: nenhum módulo com DT no pino ${dout}. begin(DT, SCK) — DT primeiro!`, `HX711: no module with DT on pin ${dout}. begin(DT, SCK) — DT first!`))
          else if (!env.pinsOf(p.id, 'SCK').includes(sck)) env.warnOnce('hxsck', i18n.m(`HX711: SCK do módulo não está no pino ${sck}.`, `HX711: the module's SCK is not on pin ${sck}.`))
          this.part = p
          this.next = env.rt.t + 400000 // arranque (~400 ms) antes da 1.ª conversão
        }
        set_gain(g = 128) {
          this.gain = g === 64 ? 64 : g === 32 ? 32 : 128
        }
        _ok() {
          return this.part && env.powered(this.part.id) && !this.down && env.pinsOf(this.part.id, 'SCK').includes(this.sck)
        }
        is_ready() {
          env.rt.t += 4
          return !!this._ok() && env.rt.t >= this.next
        }
        wait_ready() {
          if (this._ok()) env.rt.t = Math.max(env.rt.t, this.next)
          else this.read()
        }
        wait_ready_timeout(timeout = 1000) {
          const end = env.rt.t + timeout * 1000
          if (!this._ok()) {
            env.rt.t = end
            return false
          }
          env.rt.t = Math.max(env.rt.t, this.next)
          return env.rt.t <= end
        }
        wait_ready_retry(retries = 3, ms = 0) {
          return this.wait_ready_timeout((retries + 1) * Math.max(ms, 100))
        }
        read() {
          if (!this._ok()) {
            // a biblioteca real fica à espera de DT = LOW para sempre
            env.warnOnce('hxread', i18n.m('HX711: o módulo não responde (alimentação, DT ou SCK desligados) — read() ficaria bloqueado; devolve 0.', 'HX711: the module does not respond (power, DT or SCK disconnected) — read() would block; returns 0.'))
            env.rt.t += PERIOD_US
            return 0
          }
          env.rt.t = Math.max(env.rt.t, this.next) + 60 // 24 + 1 impulsos de relógio
          this.next = env.rt.t + PERIOD_US
          const g = env.input(this.part.id).value ?? 0
          const k = this.gain === 128 ? 1 : this.gain === 64 ? 0.5 : 0
          const raw = Math.round(8000 * k + g * COUNTS_PER_G * k + (Math.random() * 2 - 1) * 40)
          return Math.max(-8388608, Math.min(8388607, raw))
        }
        read_average(times = 10) {
          let s = 0
          const n = Math.max(1, times | 0)
          for (let i = 0; i < n; i++) s += this.read()
          return Math.trunc(s / n)
        }
        get_value(times = 1) {
          return this.read_average(times) - this.OFFSET
        }
        get_units(times = 1) {
          return this.get_value(times) / this.SCALE
        }
        tare(times = 10) {
          this.OFFSET = this.read_average(times)
        }
        set_scale(scale = 1) {
          this.SCALE = Number(scale) || 1
        }
        get_scale() {
          return this.SCALE
        }
        set_offset(o = 0) {
          this.OFFSET = Math.trunc(o)
        }
        get_offset() {
          return this.OFFSET
        }
        power_down() {
          this.down = true
        }
        power_up() {
          this.down = false
          this.next = env.rt.t + PERIOD_US
        }
      },
  },
}
