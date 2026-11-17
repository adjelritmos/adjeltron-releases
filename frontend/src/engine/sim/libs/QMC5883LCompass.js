// QMC5883LCompass (MPrograms): bússola QMC5883L (I2C 0x0D). read() mede; getX/Y/Z() contagens
// cruas (±8 G: 3000 LSB/G), getAzimuth() rumo 0–359°, getBearing(az) 0–15, getDirection(arr, az).
import { noise } from '../parts/_groupG.js'
import { magField } from '../parts/compass.js'
import { i2cTime, i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export default {
  header: 'QMC5883LCompass.h',
  globals: {},
  classes: {
    QMC5883LCompass: (env) =>
      class QMC5883LCompass {
        constructor() {
          this.addr = 0x0d
          this.v = [0, 0, 0]
          this.cal = null
          this.decl = 0
          this.inited = false
        }
        init() {
          i2cTime(env, 4)
          const p = env.i2c(this.addr, 'qmc5883l')
          if (!p) {
            const h = env.i2c(0x1e, 'hmc5883l')
            env.warnOnce('qmcinit', h ? i18n.m('QMC5883LCompass: não há QMC5883L em 0x0D, mas há um HMC5883L em 0x1E (registos diferentes) — use Adafruit_HMC5883_U.', 'QMC5883LCompass: there is no QMC5883L at 0x0D, but there is an HMC5883L at 0x1E (different registers) — use Adafruit_HMC5883_U.') : i18n.m(`QMC5883L não responde em 0x0D: ligue ${i2cHint(env)}, VCC e GND.`, `QMC5883L does not respond at 0x0D: connect ${i2cHint(env)}, VCC and GND.`))
          }
          this.inited = true
        }
        setADDR(a) {
          this.addr = a & 0x7f
        }
        setMode() {}
        setReset() {}
        setSmoothing() {}
        setMagneticDeclination(deg, min = 0) {
          this.decl = deg + min / 60
        }
        setCalibration(xmin, xmax, ymin, ymax, zmin, zmax) {
          this.cal = [[xmin, xmax], [ymin, ymax], [zmin, zmax]]
        }
        setCalibrationOffsets() {}
        setCalibrationScales() {}
        clearCalibration() {
          this.cal = null
        }
        calibrate() {
          env.rt.t += 10000000
        }
        read() {
          i2cTime(env, 7)
          const p = env.i2c(this.addr, 'qmc5883l')
          if (!p || !env.powered(p.id)) {
            env.warnOnce('qmcread', this.inited ? i18n.m('QMC5883L deixou de responder (sem alimentação ou desligado do I2C).', 'QMC5883L stopped responding (no power or disconnected from I2C).') : i18n.m('QMC5883LCompass: falta compass.init() no setup().', 'QMC5883LCompass: compass.init() is missing in setup().'))
            return
          }
          this.v = magField(env.input(p.id), p.config).map((g) => Math.round((g + noise(0.003)) * 3000))
          if (this.cal) this.v = this.v.map((x, i) => Math.round(x - (this.cal[i][0] + this.cal[i][1]) / 2))
        }
        getX() {
          return this.v[0]
        }
        getY() {
          return this.v[1]
        }
        getZ() {
          return this.v[2]
        }
        getAzimuth() {
          let a = (Math.atan2(this.v[1], this.v[0]) * 180) / Math.PI + this.decl
          a = Math.round(a)
          return a < 0 ? a + 360 : a % 360
        }
        getBearing(az) {
          return Math.round(((((az % 360) + 360) % 360) / 22.5)) % 16
        }
        getDirection(arr, az) {
          const d = DIRS[this.getBearing(az)].padEnd(3, ' ')
          if (Array.isArray(arr)) for (let i = 0; i < 3; i++) arr[i] = d[i]
        }
      },
  },
}
