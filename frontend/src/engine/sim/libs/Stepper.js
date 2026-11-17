// Stepper.h (biblioteca oficial do Arduino). Tal como a original, step(n) bloqueia:
// espera step_delay µs entre passos (60 000 000 / passosPorVolta / rpm) e escreve a
// sequência de 4 fases nos pinos. Como as bibliotecas não podem ceder o tempo à
// física, os passos ficam numa fila com o instante de cada um (µs do relógio do
// programa) no estado do motor de passo ligado aos pinos; o motor consome-a no
// instante certo (ver sim/parts/stepper.js). O programa só continua depois.
import * as i18n from '../../../../../shared/i18n.js'
const SEQ4 = [
  [1, 0, 1, 0],
  [0, 1, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 0, 1],
]
const SEQ2 = [
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
]
const WRITE_US = 5 // cada digitalWrite demora ~5 µs

export default {
  header: 'Stepper.h',
  classes: {
    Stepper: (env) =>
      class Stepper {
        constructor(steps = 200, ...pins) {
          this.n = Math.max(1, Math.abs(steps | 0))
          this.pins = pins.filter((p) => p !== undefined)
          this.delay = 0 // sem setSpeed(): passos o mais depressa possível
          this.last = -1e12
          this.num = 0
          this.speedSet = false
          if (this.pins.length !== 2 && this.pins.length !== 4) env.warnOnce('stepper-pins', i18n.m(`Stepper: só são suportados motores de 2 ou 4 fios (recebeu ${this.pins.length} pinos).`, `Stepper: only 2- or 4-wire motors are supported (got ${this.pins.length} pins).`))
        }
        setSpeed(rpm) {
          rpm = Number(rpm) || 0
          this.speedSet = true
          if (rpm <= 0) {
            env.warnOnce('stepper-speed0', i18n.m('Stepper.setSpeed(0): divisão por zero — o step() seguinte ficaria bloqueado ~71 minutos por passo.', 'Stepper.setSpeed(0): division by zero — the next step() would block for ~71 minutes per step.'))
            this.delay = 4294967295
          } else this.delay = Math.floor(60e6 / this.n / rpm)
        }
        version() {
          return 5
        }
        // motor de passo (peça) ligado aos pinos desta instância
        _target() {
          for (const p of this.pins) {
            const m = env.partsOnPin(p, 'stepper')[0]
            if (m) return m
          }
          return null
        }
        step(count) {
          count = Math.trunc(Number(count) || 0)
          if (!count || (this.pins.length !== 2 && this.pins.length !== 4)) return
          if (!this.speedSet) env.warnOnce('stepper-nospeed', i18n.m('Stepper sem setSpeed(): os passos saem o mais depressa possível e o motor não acompanha (só vibra). Chame motor.setSpeed(10) no setup().', 'Stepper without setSpeed(): steps go out as fast as possible and the motor cannot keep up (it only vibrates). Call motor.setSpeed(10) in setup().'))
          for (const p of this.pins) env.api.pinMode(p, env.api.OUTPUT)
          const motor = this._target()
          const st = motor ? env.state(motor.id) : null
          if (st) st.queue = st.queue || []
          const seq = this.pins.length === 4 ? SEQ4 : SEQ2
          const dir = count > 0 ? 1 : -1
          let left = Math.abs(count)
          let lv = null
          while (left > 0) {
            // espera ativa até passar step_delay desde o último passo
            const t = Math.max(env.rt.t, this.last + this.delay)
            env.rt.t = t
            this.last = t
            if (dir > 0) {
              if (++this.num === this.n) this.num = 0
            } else {
              if (this.num === 0) this.num = this.n
              this.num--
            }
            left--
            env.rt.t += WRITE_US * this.pins.length
            lv = this.pins.map((p, k) => [p, seq[this.num % 4][k]])
            if (st) st.queue.push({ t: env.rt.t, lv })
          }
          // sem motor de passo ligado (outro driver): fica só o estado final nos pinos
          if (!st && lv) {
            const t = env.rt.t
            for (const [p, v] of lv) env.api.digitalWrite(p, v)
            env.rt.t = t
          }
        }
      },
  },
}
