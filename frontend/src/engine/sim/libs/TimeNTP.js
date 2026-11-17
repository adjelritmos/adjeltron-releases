// Hora do ESP32: configTime()/configTzTime() + getLocalTime() (SNTP do core), time(), localtime_r(),
// strftime(), mktime(), e a biblioteca NTPClient (com WiFiUDP).
// A hora "certa" vem do relógio do servidor adjeltron no arranque e avança com o tempo virtual
// (se a simulação for a 0,5×, o relógio do ESP32 também anda a metade).
// Antes de sincronizar, time() conta a partir de 1970 (como um ESP32 acabado de ligar).
import { blocking, wifiUp, cstr } from './_net.js'
import { Tm, strftime, CharBuf } from './CString.js'
import * as i18n from '../../../../../shared/i18n.js'

// ---------- fusos horários POSIX (ex.: "WET0WEST,M3.5.0/1,M10.5.0") ----------
const hms = (s) => {
  if (!s) return 0
  const neg = s.startsWith('-')
  const [h, m = 0, sec = 0] = s.replace(/^[+-]/, '').split(':').map(Number)
  return (neg ? -1 : 1) * (h * 3600 + m * 60 + sec)
}
export function parseTZ(tz) {
  const m = String(tz).match(/^(<[^>]+>|[A-Za-z]{3,})([+-]?\d+(?::\d+){0,2})(?:(<[^>]+>|[A-Za-z]{3,})([+-]?\d+(?::\d+){0,2})?(?:,M(\d+)\.(\d)\.(\d)(?:\/([+-]?\d+(?::\d+){0,2}))?,M(\d+)\.(\d)\.(\d)(?:\/([+-]?\d+(?::\d+){0,2}))?)?)?/)
  if (!m) return null
  const std = -hms(m[2])
  const z = { stdName: m[1].replace(/[<>]/g, ''), std, dstName: m[3]?.replace(/[<>]/g, '') || null, dst: m[3] ? (m[4] ? -hms(m[4]) : std + 3600) : null }
  if (m[3] && m[5]) z.rules = [[+m[5], +m[6], +m[7], m[8] ? hms(m[8]) : 7200], [+m[9], +m[10], +m[11], m[12] ? hms(m[12]) : 7200]]
  return z
}
// instante UTC (s) de uma regra Mm.w.d/hora no ano y, sendo off o desvio em vigor antes da mudança
function ruleUtc(y, [mon, week, wday, time], off) {
  const first = new Date(Date.UTC(y, mon - 1, 1)).getUTCDay()
  let day = 1 + ((wday - first + 7) % 7) + (week - 1) * 7
  const dim = new Date(Date.UTC(y, mon, 0)).getUTCDate()
  while (day > dim) day -= 7
  return Date.UTC(y, mon - 1, day) / 1000 + time - off
}
// desvio (s) e nome da zona num instante UTC
export function zoneAt(z, utc) {
  if (!z) return { off: 0, name: 'UTC', dst: 0 }
  if (z.dst == null || !z.rules) return { off: z.std, name: z.stdName, dst: 0 }
  const y = new Date(utc * 1000).getUTCFullYear()
  const a = ruleUtc(y, z.rules[0], z.std)
  const b = ruleUtc(y, z.rules[1], z.dst)
  const inDst = a < b ? utc >= a && utc < b : !(utc >= b && utc < a)
  return inDst ? { off: z.dst, name: z.dstName, dst: 1 } : { off: z.std, name: z.stdName, dst: 0 }
}
export function fillTm(tm, utc, zone) {
  const { off, name, dst } = zone
  const d = new Date((utc + off) * 1000)
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  Object.assign(tm, {
    tm_sec: d.getUTCSeconds(), tm_min: d.getUTCMinutes(), tm_hour: d.getUTCHours(), tm_mday: d.getUTCDate(), tm_mon: d.getUTCMonth(),
    tm_year: d.getUTCFullYear() - 1900, tm_wday: d.getUTCDay(), tm_yday: Math.floor((d.getTime() - start) / 86400000), tm_isdst: dst,
  })
  tm.__off = off
  tm.__zone = name
  return tm
}

export const timeLib = {
  header: 'time.h',
  classes: { tm: () => Tm },
  env(env) {
    const boot = Math.floor(Date.now() / 1000) // hora real quando a simulação arrancou
    let cfg = null // { at: µs, zone }
    let synced = false
    let zone = null // fuso definido por setenv("TZ")/configTime
    const isSynced = () => {
      if (!synced && cfg && wifiUp(env) && env.rt.t - cfg.at >= 900_000) synced = true
      return synced
    }
    // segundos UTC "do ESP32"
    const nowUtc = () => (isSynced() ? boot + env.rt.t / 1e6 : env.rt.t / 1e6)
    const local = (t) => fillTm(new Tm(), Math.floor(t), zoneAt(zone, Math.floor(t)))
    const api = {
      configTime(gmt = 0, dst = 0) {
        zone = { stdName: 'UTC', std: Number(gmt) || 0, dst: null }
        if (Number(dst)) zone = { ...zone, std: (Number(gmt) || 0) + Number(dst) }
        cfg = { at: env.rt.t }
        if (!wifiUp(env)) env.warnOnce('ntpnowifi', i18n.m('configTime(): sem Wi-Fi ligado o SNTP só sincroniza depois de WiFi.status() == WL_CONNECTED.', 'configTime(): without Wi-Fi connected, SNTP only syncs after WiFi.status() == WL_CONNECTED.'), 'info')
      },
      configTzTime(tz) {
        zone = parseTZ(cstr(tz))
        cfg = { at: env.rt.t }
      },
      setenv(name, value) {
        if (cstr(name) === 'TZ') zone = parseTZ(cstr(value))
        return 0
      },
      tzset() {},
      // getLocalTime(&tm[, ms]): espera (em tempo virtual) até ms pela sincronização
      getLocalTime(tm, ms = 5000) {
        if (isSynced()) {
          if (tm) fillTm(tm, Math.floor(nowUtc()), zoneAt(zone, Math.floor(nowUtc())))
          env.rt.t += 50
          return true
        }
        const end = env.rt.t + ms * 1000
        return blocking(function* () {
          while (!isSynced()) {
            if (env.rt.t >= end) return false
            env.rt.t = Math.min(end, Math.max(env.rt.t + 10_000, env.rt.target))
            if (env.rt.t >= env.rt.target) yield
          }
          if (tm) fillTm(tm, Math.floor(nowUtc()), zoneAt(zone, Math.floor(nowUtc())))
          return true
        })
      },
      time: () => Math.floor(nowUtc()),
      localtime_r: (t, tm) => fillTm(tm || new Tm(), Math.floor(Number(t) || 0), zoneAt(zone, Math.floor(Number(t) || 0))),
      localtime: (t) => local(Number(t) || 0),
      gmtime_r: (t, tm) => fillTm(tm || new Tm(), Math.floor(Number(t) || 0), { off: 0, name: 'UTC', dst: 0 }),
      gmtime: (t) => fillTm(new Tm(), Math.floor(Number(t) || 0), { off: 0, name: 'UTC', dst: 0 }),
      mktime: (tm) => {
        const guess = Date.UTC(tm.tm_year + 1900, tm.tm_mon, tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec) / 1000
        return Math.floor(guess - zoneAt(zone, guess).off)
      },
      difftime: (a, b) => a - b,
      strftime(buf, n, fmt, tm) {
        const s = strftime(cstr(fmt), tm || new Tm()).slice(0, Math.max(0, n - 1))
        if (buf instanceof CharBuf) buf.setText(s)
        else if (Array.isArray(buf)) {
          for (let i = 0; i < s.length; i++) buf[i] = s[i]
          buf[s.length] = 0
        }
        return s.length
      },
      settimeofday: () => 0,
      sntp_set_time_sync_notification_cb: () => {},
      sntp_setoperatingmode: () => {},
      sntp_setservername: () => {},
      sntp_init: () => {},
      __ntp: { isSynced, nowUtc, boot },
    }
    return env.board.id === 'esp32' ? api : {}
  },
}

export const ntpClientLib = {
  header: 'NTPClient.h',
  classes: {
    NTPClient: (env) =>
      class NTPClient {
        // NTPClient(udp[, servidor[, desvio_s[, intervalo_ms]]])
        constructor(udp, a, b, c) {
          this.server = typeof a === 'string' ? a : 'pool.ntp.org'
          this.offset = typeof a === 'number' ? a : Number(b) || 0
          this.interval = (typeof a === 'number' ? b : c) ?? 60000
          this.epochAt = null // { utc, at }
          this.last = -Infinity
        }
        begin() {}
        end() {}
        setTimeOffset(s) {
          this.offset = Number(s) || 0
        }
        setUpdateInterval(ms) {
          this.interval = Number(ms) || 60000
        }
        setPoolServerName(s) {
          this.server = cstr(s)
        }
        isTimeSet() {
          return this.epochAt != null
        }
        forceUpdate() {
          if (!wifiUp(env)) {
            env.rt.t += 1000_000 // espera pela resposta UDP que nunca chega
            return false
          }
          const self = this
          return blocking(function* () {
            env.rt.t += 40_000 // pedido + resposta NTP
            if (env.rt.t >= env.rt.target) yield
            self.epochAt = { utc: Math.floor(Date.now() / 1000), at: env.rt.t }
            self.last = env.rt.t
            return true
          })
        }
        update() {
          if (this.epochAt && env.rt.t - this.last < this.interval * 1000) return false
          return this.forceUpdate()
        }
        getEpochTime() {
          if (!this.epochAt) return Math.floor(env.rt.t / 1e6) + this.offset
          return Math.floor(this.epochAt.utc + (env.rt.t - this.epochAt.at) / 1e6) + this.offset
        }
        getDay() {
          return (Math.floor(this.getEpochTime() / 86400) + 4) % 7
        }
        getHours() {
          return Math.floor((this.getEpochTime() % 86400) / 3600)
        }
        getMinutes() {
          return Math.floor((this.getEpochTime() % 3600) / 60)
        }
        getSeconds() {
          return this.getEpochTime() % 60
        }
        getFormattedTime() {
          const p = (n) => String(n).padStart(2, '0')
          return `${p(this.getHours())}:${p(this.getMinutes())}:${p(this.getSeconds())}`
        }
        getFormattedDate() {
          const d = new Date(this.getEpochTime() * 1000)
          return `${d.toISOString().slice(0, 10)}T${this.getFormattedTime()}Z`
        }
      },
  },
}

export const wifiUdpLib = {
  header: 'WiFiUdp.h',
  classes: {
    WiFiUDP: () =>
      class WiFiUDP {
        begin() {
          return 1
        }
        stop() {}
        beginPacket() {
          return 1
        }
        endPacket() {
          return 1
        }
        write(_v, n) {
          return n ?? 1
        }
        print() {
          return 1
        }
        parsePacket() {
          return 0
        }
        available() {
          return 0
        }
        read() {
          return -1
        }
        flush() {}
        remoteIP() {
          return { toString: () => '0.0.0.0' }
        }
        remotePort() {
          return 0
        }
      },
  },
}
