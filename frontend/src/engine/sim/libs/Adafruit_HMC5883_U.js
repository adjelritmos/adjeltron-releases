// Adafruit_HMC5883_U: magnetómetro HMC5883L (I2C 0x1E). getEvent() → magnetic.x/y/z em µT.
import { findI2c, noise } from '../parts/_groupG.js'
import { magField } from '../parts/compass.js'
import { i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const GAIN_LSB = { 0x20: 1100, 0x40: 855, 0x60: 670, 0x80: 450, 0xa0: 400, 0xc0: 330, 0xe0: 230 } // LSB/gauss (XY)

export default {
  header: 'Adafruit_HMC5883_U.h',
  globals: { HMC5883_MAGGAIN_1_3: 0x20, HMC5883_MAGGAIN_1_9: 0x40, HMC5883_MAGGAIN_2_5: 0x60, HMC5883_MAGGAIN_4_0: 0x80, HMC5883_MAGGAIN_4_7: 0xa0, HMC5883_MAGGAIN_5_6: 0xc0, HMC5883_MAGGAIN_8_1: 0xe0, HMC5883_ADDRESS_MAG: 0x1e },
  classes: {
    Adafruit_HMC5883_Unified: (env) =>
      class Adafruit_HMC5883_Unified {
        constructor(id = -1) {
          this.id = id
          this.ok = false
          this.gain = 0x20
        }
        begin() {
          i2cTime(env, 3)
          const r = findI2c(env, 0x1e, 'hmc5883l', 'HMC5883L', i18n.m(`ligue ${i2cHint(env)}, VCC e GND`, `connect ${i2cHint(env)}, VCC and GND`))
          if (r.err) {
            const q = env.i2c(0x0d, 'qmc5883l')
            env.warnOnce('hmcbegin', q ? i18n.m('HMC5883L não responde em 0x1E, mas há um QMC5883L em 0x0D (o clone usado na maioria dos GY-271): use a biblioteca QMC5883LCompass. begin() devolveu false.', 'HMC5883L does not respond at 0x1E, but there is a QMC5883L at 0x0D (the clone used on most GY-271 boards): use the QMC5883LCompass library. begin() returned false.') : `${r.err} begin() devolveu false.`)
            return (this.ok = false)
          }
          return (this.ok = true)
        }
        setMagGain(g) {
          this.gain = g
        }
        getEvent(ev) {
          i2cTime(env, 7)
          env.rt.t += 6000 // medição única
          const p = this.ok ? env.i2c(0x1e, 'hmc5883l') : null
          let f = [0, 0, 0]
          if (p && env.powered(p.id)) {
            const lsb = GAIN_LSB[this.gain] || 1100
            f = magField(env.input(p.id), p.config).map((v) => (Math.round((v + noise(0.004)) * lsb) / lsb) * 100) // gauss → µT
          } else env.warnOnce('hmclost', this.ok ? i18n.m('HMC5883L deixou de responder.', 'HMC5883L stopped responding.') : i18n.m('HMC5883L: falta mag.begin() no setup().', 'HMC5883L: mag.begin() is missing in setup().'))
          if (ev && typeof ev === 'object') {
            ev.sensor_id = this.id
            ev.type = 2
            ev.timestamp = Math.floor(env.rt.t / 1000)
            Object.assign(ev.magnetic, { x: f[0], y: f[1], z: f[2], v: f })
          }
          return !!p
        }
        getSensor(s) {
          if (s && typeof s === 'object') Object.assign(s, { name: 'HMC5883', version: 1, sensor_id: this.id, type: 2, max_value: 800, min_value: -800, resolution: 0.2, min_delay: 0 })
        }
      },
  },
}
