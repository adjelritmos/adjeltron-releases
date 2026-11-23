// Adafruit_ADXL345_U: acelerómetro ADXL345 (I2C 0x53 / 0x1D) com eventos Adafruit_Sensor.
// getEvent() → acceleration.x/y/z em m/s²; getX/Y/Z() → contagens cruas (resolução total: 3,9 mg/LSB
// = 256 LSB/g). Como a biblioteca real multiplica as contagens por 0,004 g, pousado dá ≈ 10,0 m/s².
import { SensorsEvent } from './Adafruit_Sensor.js'
import { findI2c, noise } from '../parts/_groupG.js'
import { adxlAccel, ADXL_LSB_G } from '../parts/adxl345.js'
import { i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const G = 9.80665
const RANGE_G = [2, 4, 8, 16] // ADXL345_RANGE_2_G = 0 … 16_G = 3

export class SensorT {
  constructor() {
    Object.assign(this, { name: '', version: 1, sensor_id: 0, type: 0, max_value: 0, min_value: 0, resolution: 0, min_delay: 0 })
  }
}

export default {
  header: 'Adafruit_ADXL345_U.h',
  globals: {
    ADXL345_DEFAULT_ADDRESS: 0x53, ADXL345_MG2G_MULTIPLIER: 0.004,
    ADXL345_RANGE_2_G: 0, ADXL345_RANGE_4_G: 1, ADXL345_RANGE_8_G: 2, ADXL345_RANGE_16_G: 3,
    ADXL345_DATARATE_3200_HZ: 0xf, ADXL345_DATARATE_1600_HZ: 0xe, ADXL345_DATARATE_800_HZ: 0xd, ADXL345_DATARATE_400_HZ: 0xc,
    ADXL345_DATARATE_200_HZ: 0xb, ADXL345_DATARATE_100_HZ: 0xa, ADXL345_DATARATE_50_HZ: 0x9, ADXL345_DATARATE_25_HZ: 0x8,
    ADXL345_DATARATE_12_5_HZ: 0x7, ADXL345_DATARATE_6_25HZ: 0x6, ADXL345_DATARATE_3_13_HZ: 0x5, ADXL345_DATARATE_1_56_HZ: 0x4,
    ADXL345_DATARATE_0_78_HZ: 0x3, ADXL345_DATARATE_0_39_HZ: 0x2, ADXL345_DATARATE_0_20_HZ: 0x1, ADXL345_DATARATE_0_10_HZ: 0x0,
    SENSOR_TYPE_ACCELEROMETER: 1, SENSOR_TYPE_MAGNETIC_FIELD: 2,
  },
  classes: {
    sensor_t: () => SensorT,
    Adafruit_ADXL345_Unified: (env) =>
      class Adafruit_ADXL345_Unified {
        constructor(id = -1) {
          this.id = id
          this.addr = null
          this.range = 0
          this.rate = 0xa
        }
        begin(addr = 0x53) {
          i2cTime(env, 3)
          env.rt.t += 1000
          const r = findI2c(env, addr, 'adxl345', 'ADXL345', i18n.m(`ligue ${i2cHint(env)}, VCC e GND (SDO a GND = 0x53, a VCC = 0x1D)`, `connect ${i2cHint(env)}, VCC and GND (SDO to GND = 0x53, to VCC = 0x1D)`))
          if (r.err) {
            env.warnOnce(`adxl${addr}`, `${r.err} begin() devolveu false.`)
            return false
          }
          this.addr = addr
          return true
        }
        _p() {
          const p = this.addr != null ? env.i2c(this.addr, 'adxl345') : null
          if (!p || !env.powered(p.id)) {
            env.warnOnce('adxllost', this.addr == null ? i18n.m('ADXL345: falta accel.begin() no setup() — as leituras dão 0.', 'ADXL345: accel.begin() is missing in setup() — readings return 0.') : i18n.m('ADXL345 deixou de responder (sem alimentação ou desligado do I2C).', 'ADXL345 stopped responding (no power or disconnected from I2C).'))
            return null
          }
          return p
        }
        _acc() {
          i2cTime(env, 7)
          const p = this._p()
          if (!p) return [0, 0, 0]
          const lim = RANGE_G[this.range] * G
          return adxlAccel(env.input(p.id)).map((v) => Math.max(-lim, Math.min(lim, v + noise(0.04))))
        }
        setRange(r) {
          this.range = r & 3
        }
        getRange() {
          return this.range
        }
        setDataRate(r) {
          this.rate = r & 0xf
        }
        getDataRate() {
          return this.rate
        }
        getDeviceID() {
          return this._p() ? 0xe5 : 0
        }
        // contagens cruas (resolução total: 3,9 mg por LSB em qualquer alcance)
        _raw(i) {
          return Math.round((this._acc()[i] / G) * ADXL_LSB_G)
        }
        getX() {
          return this._raw(0)
        }
        getY() {
          return this._raw(1)
        }
        getZ() {
          return this._raw(2)
        }
        getEvent(ev) {
          const [x, y, z] = this._acc().map((v) => Math.round((v / G) * ADXL_LSB_G) * 0.004 * G)
          if (ev && typeof ev === 'object') {
            ev.version = 0
            ev.sensor_id = this.id
            ev.type = 1
            ev.timestamp = Math.floor(env.rt.t / 1000)
            Object.assign(ev.acceleration, { x, y, z, v: [x, y, z] })
          }
          return true
        }
        getSensor(s) {
          if (s && typeof s === 'object') Object.assign(s, { name: 'ADXL345', version: 1, sensor_id: this.id, type: 1, max_value: 156.9064, min_value: -156.9064, resolution: 0.03923, min_delay: 0 })
        }
        writeRegister() {}
        readRegister() {
          return 0
        }
      },
  },
}
