// Adafruit_VL53L0X: begin(), rangingTest(&medida, debug), readRange(), readRangeStatus(),
// startRangeContinuous(), isRangeComplete(), readRangeResult(), stopRangeContinuous().
import { vlMeasure, vlFind } from './_vl53.js'
import { i2cTime } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

class VL53L0X_RangingMeasurementData_t {
  constructor() {
    Object.assign(this, { TimeStamp: 0, MeasurementTimeUsec: 0, RangeMilliMeter: 0, RangeDMaxMilliMeter: 0, SignalRateRtnMegaCps: 0, AmbientRateRtnMegaCps: 0, EffectiveSpadRtnCount: 0, ZoneId: 0, RangeFractionalPart: 0, RangeStatus: 0 })
  }
}

export default {
  header: 'Adafruit_VL53L0X.h',
  globals: { VL53L0X_I2C_ADDR: 0x29, VL53L0X_ERROR_NONE: 0 },
  classes: {
    VL53L0X_RangingMeasurementData_t: () => VL53L0X_RangingMeasurementData_t,
    Adafruit_VL53L0X: (env) => {
      class Adafruit_VL53L0X {
        constructor() {
          this.addr = 0x29
          this.ok = false
          this.budget = 33000
          this.cont = null
          this.last = { mm: 0, status: 0 }
          this.Status = 0
        }
        begin(addr = 0x29, debug = false) {
          void debug
          void addr
          env.rt.t += 40000 // reset + calibração de referência + SPADs
          const r = vlFind(env, 0x29, 'Adafruit_VL53L0X')
          if (r.err) {
            env.warnOnce('vlbegin', `${r.err} begin() devolveu false.`)
            this.ok = false
            return false
          }
          this.addr = 0x29
          this.ok = true
          return true
        }
        setAddress() {
          return this.ok
        }
        _dev() {
          const r = vlFind(env, this.addr, 'Adafruit_VL53L0X')
          if (r.err) env.warnOnce('vllost', `${r.err}${this.ok ? '' : i18n.m(' (falta lox.begin() no setup().)', ' (lox.begin() is missing in setup().)')}`)
          return this.ok ? r.p || null : null
        }
        rangingTest(m, debug = false) {
          void debug
          env.rt.t += this.budget + 2000
          i2cTime(env, 14)
          const p = this._dev()
          const res = p ? vlMeasure(env, p) : { mm: 0, status: 4 }
          if (m && typeof m === 'object') Object.assign(m, { RangeMilliMeter: res.mm, RangeStatus: res.status, MeasurementTimeUsec: this.budget, TimeStamp: Math.floor(env.rt.t / 1000) })
          this.last = res
          this.Status = p ? 0 : -6
          return this.Status
        }
        getSingleRangingMeasurement(m, debug) {
          return this.rangingTest(m, debug)
        }
        readRange() {
          if (this.cont) return this.readRangeResult()
          this.rangingTest(null)
          return this.last.status === 4 ? 8190 : this.last.mm
        }
        readRangeStatus() {
          return this.last.status
        }
        startRangeContinuous(period = 50) {
          this.cont = { period: Math.max(this.budget / 1000, period) * 1000, t0: env.rt.t }
          return true
        }
        stopRangeContinuous() {
          this.cont = null
        }
        isRangeComplete() {
          return !!this.cont && env.rt.t - this.cont.t0 >= this.cont.period
        }
        waitRangeComplete() {
          if (this.cont) env.rt.t = Math.max(env.rt.t, this.cont.t0 + this.cont.period)
          return 0
        }
        readRangeResult() {
          i2cTime(env, 14)
          const p = this._dev()
          if (this.cont) this.cont.t0 = env.rt.t
          this.last = p ? vlMeasure(env, p) : { mm: 0, status: 4 }
          return this.last.status === 4 ? 8190 : this.last.mm
        }
        setMeasurementTimingBudgetMicroSeconds(us) {
          this.budget = Math.max(20000, us | 0)
          return true
        }
        getMeasurementTimingBudgetMicroSeconds() {
          return this.budget
        }
        configSensor() {
          return true
        }
        timeoutOccurred() {
          return false
        }
      }
      Object.assign(Adafruit_VL53L0X, { VL53L0X_SENSE_DEFAULT: 0, VL53L0X_SENSE_LONG_RANGE: 1, VL53L0X_SENSE_HIGH_SPEED: 2, VL53L0X_SENSE_HIGH_ACCURACY: 3 })
      return Adafruit_VL53L0X
    },
  },
}
