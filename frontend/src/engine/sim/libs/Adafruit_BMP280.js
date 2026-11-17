// Adafruit_BMP280: pressão (Pa), temperatura (°C) e altitude (m) do BMP280 por I2C.
// A pressão vem da altitude escolhida no controlo (atmosfera padrão) com ruído de ±2 Pa.
// Atenção: begin() sem argumento usa 0x77; os módulos GY-BMP280 vêm quase sempre em 0x76.
import { pressureAt } from '../parts/bmp280.js'
import { i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const ENUMS = {
  MODE_SLEEP: 0, MODE_FORCED: 1, MODE_NORMAL: 3, MODE_SOFT_RESET_CODE: 0xb6,
  SAMPLING_NONE: 0, SAMPLING_X1: 1, SAMPLING_X2: 2, SAMPLING_X4: 3, SAMPLING_X8: 4, SAMPLING_X16: 5,
  FILTER_OFF: 0, FILTER_X2: 1, FILTER_X4: 2, FILTER_X8: 3, FILTER_X16: 4,
  STANDBY_MS_1: 0, STANDBY_MS_63: 1, STANDBY_MS_125: 2, STANDBY_MS_250: 3, STANDBY_MS_500: 4, STANDBY_MS_1000: 5, STANDBY_MS_2000: 6, STANDBY_MS_4000: 7,
}

export default {
  header: 'Adafruit_BMP280.h',
  globals: { BMP280_ADDRESS: 0x77, BMP280_ADDRESS_ALT: 0x76, BMP280_CHIPID: 0x58 },
  classes: {
    Adafruit_BMP280: (env) => {
      class Adafruit_BMP280 {
        constructor() {
          this.addr = null
        }
        begin(addr = 0x77) {
          env.rt.t += 3000
          const p = env.i2c(addr, 'bmp280')
          if (!p) {
            const other = env.i2c(null, 'bmp280')
            env.warnOnce(
              `bmp${addr}`,
              other
                ? i18n.m(`BMP280: begin(0x${addr.toString(16)}) mas o sensor está em 0x${(other.config?.addr ?? 0x76).toString(16)}. Use bmp.begin(0x${(other.config?.addr ?? 0x76).toString(16)}). begin() devolveu false.`, `BMP280: begin(0x${addr.toString(16)}) but the sensor is at 0x${(other.config?.addr ?? 0x76).toString(16)}. Use bmp.begin(0x${(other.config?.addr ?? 0x76).toString(16)}). begin() returned false.`)
                : i18n.m(`BMP280 não responde em 0x${addr.toString(16)}: VCC, GND, ${i2cHint(env)} ligados? begin() devolveu false.`, `BMP280 does not respond at 0x${addr.toString(16)}: are VCC, GND, ${i2cHint(env)} connected? begin() returned false.`),
            )
            return false
          }
          if (!env.powered(p.id)) {
            env.warnOnce('bmppwr', i18n.m('BMP280 sem alimentação: VCC → 5V e GND → GND. begin() devolveu false.', 'BMP280 has no power: VCC → 5V and GND → GND. begin() returned false.'))
            return false
          }
          this.addr = addr
          return true
        }
        _p() {
          env.rt.t += 600
          const p = this.addr != null ? env.i2c(this.addr, 'bmp280') : null
          if (!p || !env.powered(p.id)) {
            if (this.addr == null) env.warnOnce('bmpbegin', i18n.m('BMP280: falta bmp.begin(0x76) no setup().', 'BMP280: bmp.begin(0x76) is missing in setup().'))
            return null
          }
          return p
        }
        readTemperature() {
          const p = this._p()
          if (!p) return NaN
          return Math.round(((p.config?.temp ?? 21) + (Math.random() - 0.5) * 0.02) * 100) / 100
        }
        readPressure() {
          const p = this._p()
          if (!p) return NaN
          return Math.round((pressureAt(env.input(p.id).value ?? 100) + (Math.random() * 2 - 1) * 2) * 100) / 100
        }
        readAltitude(sea = 1013.25) {
          const pa = this.readPressure()
          return 44330 * (1 - Math.pow(pa / 100 / sea, 0.1903))
        }
        seaLevelForAltitude(alt, hPa) {
          return hPa / Math.pow(1 - alt / 44330, 5.255)
        }
        waterBoilingPoint(hPa) {
          return 234.175 * Math.log(hPa / 6.1078) / (17.08085 - Math.log(hPa / 6.1078))
        }
        setSampling() {}
        takeForcedMeasurement() {
          env.rt.t += 40000
          return true
        }
        sensorID() {
          return this._p() ? 0x58 : 0
        }
        getStatus() {
          return 0
        }
        reset() {}
      }
      Object.assign(Adafruit_BMP280, ENUMS)
      return Adafruit_BMP280
    },
  },
}
