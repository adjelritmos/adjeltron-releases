// RTClib (Adafruit): RTC_DS1307, RTC_DS3231, RTC_Millis, DateTime e TimeSpan.
// A hora vem do estado da peça RTC (../parts/_rtc.js), que anda com o tempo simulado.
// DateTime guarda segundos "locais" desde 1970 (como a biblioteca: sem fuso horário).
import { rtcSeconds, rtcSet, localNow } from '../parts/_rtc.js'
import { i2cHint } from './_i2c.js'
import * as i18n from '../../../../../shared/i18n.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SECS_2000 = 946684800
const p2 = (v) => String(v).padStart(2, '0')

// DateTime: pode ser chamado com ou sem "new" (DateTime(2024, 1, 1) é comum em C++)
function DateTime(a, b, c, d, e, f) {
  if (!(this instanceof DateTime)) return new DateTime(a, b, c, d, e, f)
  let t
  if (a instanceof DateTime) t = a.t
  else if (typeof a === 'string') {
    // DateTime(F(__DATE__), F(__TIME__)): "Nov  4 2026", "19:30:05"
    const m = a.trim().split(/\s+/)
    const [hh, mm, ss] = String(b || '0:0:0').split(':').map(Number)
    t = Date.UTC(+m[2], Math.max(0, MON.indexOf(m[0])), +m[1], hh || 0, mm || 0, ss || 0) / 1000
  } else if (b === undefined) t = a === undefined ? SECS_2000 : Number(a)
  else t = Date.UTC(a < 100 ? 2000 + a : a, (b || 1) - 1, c ?? 1, d ?? 0, e ?? 0, f ?? 0) / 1000
  this.t = Math.floor(Number.isFinite(t) ? t : SECS_2000)
}
const D = (o) => new Date(o.t * 1000)
Object.assign(DateTime.prototype, {
  year() { return D(this).getUTCFullYear() },
  month() { return D(this).getUTCMonth() + 1 },
  day() { return D(this).getUTCDate() },
  hour() { return D(this).getUTCHours() },
  minute() { return D(this).getUTCMinutes() },
  second() { return D(this).getUTCSeconds() },
  dayOfTheWeek() { return D(this).getUTCDay() },
  twelveHour() { const h = this.hour() % 12; return h === 0 ? 12 : h },
  isPM() { return this.hour() >= 12 ? 1 : 0 },
  unixtime() { return this.t },
  secondstime() { return this.t - SECS_2000 },
  isValid() { return this.t >= SECS_2000 },
  timestamp() { return `${this.year()}-${p2(this.month())}-${p2(this.day())}T${p2(this.hour())}:${p2(this.minute())}:${p2(this.second())}` },
  // toString("hh:mm:ss") / ("DD/MM/YYYY") — como a biblioteca, substitui os campos no texto
  toString(fmt = 'YYYY-MM-DD hh:mm:ss') {
    return String(fmt)
      .replace('YYYY', this.year())
      .replace('YY', p2(this.year() % 100))
      .replace('MMM', MON[this.month() - 1])
      .replace('MM', p2(this.month()))
      .replace('DDD', ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][this.dayOfTheWeek()])
      .replace('DD', p2(this.day()))
      .replace('hh', p2(this.hour()))
      .replace('mm', p2(this.minute()))
      .replace('ss', p2(this.second()))
  },
})

function TimeSpan(days = 0, h, m, s) {
  if (!(this instanceof TimeSpan)) return new TimeSpan(days, h, m, s)
  this.s = h === undefined ? Number(days) || 0 : days * 86400 + h * 3600 + (m || 0) * 60 + (s || 0)
}
Object.assign(TimeSpan.prototype, {
  days() { return Math.trunc(this.s / 86400) },
  hours() { return Math.trunc(this.s / 3600) % 24 },
  minutes() { return Math.trunc(this.s / 60) % 60 },
  seconds() { return this.s % 60 },
  totalseconds() { return this.s },
})

const rtcClass = (env, type, label) =>
  class {
    constructor() {
      this.p = null
    }
    _dev(quiet) {
      const p = env.i2c(0x68, type)
      if (!p || !env.powered(p.id)) {
        if (!quiet) env.warnOnce(`rtc${type}`, i18n.m(`${label} não responde em 0x68: VCC e GND ligados? ${i2cHint(env)}.`, `${label} does not respond at 0x68: VCC and GND connected? ${i2cHint(env)}.`))
        return null
      }
      return p
    }
    begin() {
      env.rt.t += 400
      this.p = this._dev()
      return !!this.p
    }
    now() {
      env.rt.t += 800 // 8 bytes por I2C a 100 kHz
      const p = this._dev()
      if (!p) return new DateTime(SECS_2000 + 165 * 86400 + 45 * 3600) // lixo (165/165/165…) como no real
      return new DateTime(rtcSeconds(env.state(p.id), env.rt.t))
    }
    adjust(dt) {
      env.rt.t += 900
      const p = this._dev()
      if (p) rtcSet(env.state(p.id), env.rt.t, new DateTime(dt).t)
    }
    isrunning() {
      return this._dev(true) ? 1 : 0
    }
    lostPower() {
      return false
    }
    getTemperature() {
      env.rt.t += 300
      const p = this._dev()
      if (!p) return 0
      return Math.round((p.config?.temp ?? 24) * 4) / 4 // resolução de 0,25 °C
    }
    writeSqwPinMode() {}
    readSqwPinMode() { return 0 }
    enable32K() {}
    disable32K() {}
  }

export default {
  header: 'RTClib.h',
  globals: { DS1307_OFF: 0, DS1307_ON: 0x80, DS1307_SquareWave1HZ: 0x10, DS3231_OFF: 0x1c, DS3231_SquareWave1Hz: 0 },
  env: () => {
    // data/hora "de compilação" (o simulador compila no arranque)
    const d = new Date(localNow() * 1000)
    return {
      __DATE__: `${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ${d.getUTCFullYear()}`,
      __TIME__: `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`,
    }
  },
  classes: {
    DateTime: () => DateTime,
    TimeSpan: () => TimeSpan,
    RTC_DS1307: (env) => rtcClass(env, 'ds1307', 'RTC DS1307'),
    RTC_DS3231: (env) => rtcClass(env, 'ds3231', 'RTC DS3231'),
    RTC_Millis: (env) =>
      class RTC_Millis {
        begin(dt) {
          this.base = dt ? new DateTime(dt).t : SECS_2000
          this.t0 = env.rt.t
          return true
        }
        adjust(dt) {
          this.begin(dt)
        }
        now() {
          return new DateTime((this.base ?? SECS_2000) + Math.floor((env.rt.t - (this.t0 ?? 0)) / 1e6))
        }
      },
  },
}
