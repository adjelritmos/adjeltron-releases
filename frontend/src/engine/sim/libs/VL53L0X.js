// VL53L0X (biblioteca da Pololu): init(), setTimeout(), readRangeSingleMillimeters(),
// startContinuous(), readRangeContinuousMillimeters(), timeoutOccurred(), setAddress().
// Fora de alcance devolve 8190; sem sensor (ou a meio de um timeout) devolve 65535.
import { vlMeasure, vlFind } from './_vl53.js'
import { i2cTime } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  header: 'VL53L0X.h',
  globals: {},
  classes: {
    VL53L0X: (env) => {
      class VL53L0X {
        constructor() {
          this.addr = 0x29
          this.ok = false
          this.timeout = 0
          this.timedOut = false
          this.budget = 33000
          this.cont = null
          this.last_status = 0
        }
        setBus() {}
        init(io2v8 = true) {
          void io2v8
          env.rt.t += 40000
          const r = vlFind(env, 0x29, 'VL53L0X')
          if (r.err) {
            env.warnOnce('vlinit', `${r.err} init() devolveu false.`)
            return (this.ok = false)
          }
          this.addr = 0x29
          return (this.ok = true)
        }
        setAddress(a) {
          this.addr = a & 0x7f
        }
        getAddress() {
          return this.addr
        }
        setTimeout(ms) {
          this.timeout = ms | 0
        }
        getTimeout() {
          return this.timeout
        }
        timeoutOccurred() {
          const t = this.timedOut
          this.timedOut = false
          return t
        }
        setSignalRateLimit() {
          return true
        }
        getSignalRateLimit() {
          return 0.25
        }
        setMeasurementTimingBudget(us) {
          this.budget = Math.max(20000, us | 0)
          return true
        }
        getMeasurementTimingBudget() {
          return this.budget
        }
        setVcselPulsePeriod() {
          return true
        }
        getVcselPulsePeriod() {
          return 14
        }
        _measure() {
          i2cTime(env, 3)
          const r = this.ok ? vlFind(env, this.addr, 'VL53L0X') : { err: i18n.m('VL53L0X: falta sensor.init() no setup().', 'VL53L0X: sensor.init() is missing in setup().') }
          if (r.err) {
            env.warnOnce('vllost2', r.err)
            // espera até ao timeout (0 = para sempre: limita-se a 1 s para o programa não congelar)
            env.rt.t += (this.timeout || 1000) * 1000
            this.timedOut = true
            return 65535
          }
          const m = vlMeasure(env, r.p)
          return m.status === 4 ? 8190 : m.mm
        }
        readRangeSingleMillimeters() {
          env.rt.t += this.budget + 1500
          return this._measure()
        }
        startContinuous(period = 0) {
          this.cont = { period: Math.max(this.budget, (period | 0) * 1000), t0: env.rt.t }
        }
        stopContinuous() {
          this.cont = null
        }
        readRangeContinuousMillimeters() {
          if (!this.cont) {
            env.warnOnce('vlcont', i18n.m('VL53L0X: readRangeContinuousMillimeters() sem startContinuous() — a esperar pelo timeout.', 'VL53L0X: readRangeContinuousMillimeters() without startContinuous() — waiting for the timeout.'))
            env.rt.t += (this.timeout || 1000) * 1000
            this.timedOut = true
            return 65535
          }
          const next = this.cont.t0 + this.cont.period
          if (env.rt.t < next) env.rt.t = next
          this.cont.t0 = env.rt.t
          return this._measure()
        }
      }
      Object.assign(VL53L0X, { VcselPeriodPreRange: 0, VcselPeriodFinalRange: 1 })
      return VL53L0X
    },
  },
}
