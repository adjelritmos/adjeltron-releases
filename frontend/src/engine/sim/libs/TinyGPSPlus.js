// TinyGPS++ (Mikal Hart): descodifica as frases NMEA $GPRMC e $GPGGA (e $GN…) que um
// módulo GPS envia pela porta série. Igual à original: gps.encode(c) carácter a carácter
// devolve true quando uma frase com soma de verificação correta acaba; os valores só
// mudam nesse momento; isUpdated() fica true até se ler o valor (lat(), value()…).
const KNOTS_KMPH = 1.852
const EARTH_R = 6372795

const dec = (t) => {
  // "123.45" → 12345 (centésimas), como o parseDecimal da biblioteca
  const neg = t.startsWith('-')
  const [a, b = ''] = t.replace('-', '').split('.')
  const v = (parseInt(a || '0', 10) * 100 + parseInt((b + '00').slice(0, 2), 10)) || 0
  return neg ? -v : v
}
// "4807.038" (ddmm.mmmm) → graus decimais
const degrees = (t) => {
  const v = parseFloat(t)
  if (!Number.isFinite(v)) return 0
  const d = Math.floor(v / 100)
  return d + (v - d * 100) / 60
}

export function makeTinyGPS(env) {
  const millis = () => Math.floor(env.rt.t / 1000)
  // um campo com valor válido/atualizado (padrão de todas as classes TinyGPS…)
  class Field {
    constructor() {
      this.valid = false
      this.updated = false
      this.lastCommit = 0
      this.val = 0
      this.stage = 0
    }
    isValid() {
      return this.valid
    }
    isUpdated() {
      return this.updated
    }
    age() {
      return this.valid ? millis() - this.lastCommit : 0xffffffff
    }
    commit() {
      this.val = this.stage
      this.valid = this.updated = true
      this.lastCommit = millis()
    }
    value() {
      this.updated = false
      return this.val
    }
  }
  class Location extends Field {
    constructor() {
      super()
      this.val = { lat: 0, lng: 0 }
      this.stage = { lat: 0, lng: 0 }
      this.fixQuality = 0
      this.fixMode = 1
    }
    lat() {
      this.updated = false
      return this.val.lat
    }
    lng() {
      this.updated = false
      return this.val.lng
    }
    rawLat() {
      return raw(this.val.lat)
    }
    rawLng() {
      return raw(this.val.lng)
    }
    FixQuality() {
      return this.fixQuality
    }
    FixMode() {
      return this.fixMode
    }
  }
  const raw = (v) => {
    const a = Math.abs(v)
    return { deg: Math.floor(a), billionths: Math.round((a - Math.floor(a)) * 1e9), negative: v < 0 }
  }
  class DateF extends Field {
    year() {
      this.updated = false
      return 2000 + (this.val % 100)
    }
    month() {
      this.updated = false
      return Math.floor(this.val / 100) % 100
    }
    day() {
      this.updated = false
      return Math.floor(this.val / 10000)
    }
  }
  class TimeF extends Field {
    hour() {
      this.updated = false
      return Math.floor(this.val / 1000000)
    }
    minute() {
      this.updated = false
      return Math.floor(this.val / 10000) % 100
    }
    second() {
      this.updated = false
      return Math.floor(this.val / 100) % 100
    }
    centisecond() {
      this.updated = false
      return this.val % 100
    }
  }
  // valores decimais guardados em centésimas (velocidade em nós, rumo, altitude em cm)
  class Decimal extends Field {
    _f() {
      this.updated = false
      return this.val / 100
    }
  }
  class Speed extends Decimal {
    knots() {
      return this._f()
    }
    mph() {
      return this._f() * 1.15077945
    }
    mps() {
      return this._f() * 0.51444444
    }
    kmph() {
      return this._f() * KNOTS_KMPH
    }
  }
  class Course extends Decimal {
    deg() {
      return this._f()
    }
  }
  class Altitude extends Decimal {
    meters() {
      return this._f()
    }
    miles() {
      return this._f() * 0.00062137112
    }
    kilometers() {
      return this._f() * 0.001
    }
    feet() {
      return this._f() * 3.2808399
    }
  }
  class HDOP extends Decimal {
    hdop() {
      return this._f()
    }
  }

  return class TinyGPSPlus {
    constructor() {
      this.location = new Location()
      this.date = new DateF()
      this.time = new TimeF()
      this.speed = new Speed()
      this.course = new Course()
      this.altitude = new Altitude()
      this.satellites = new Field()
      this.hdop = new HDOP()
      this._chars = 0
      this._withFix = 0
      this._failed = 0
      this._passed = 0
      this._term = ''
      this._termN = 0
      this._parity = 0
      this._isCk = false
      this._type = null
      this._fix = false
    }
    encode(c) {
      const ch = typeof c === 'number' ? String.fromCharCode(c & 0xff) : String(c)[0]
      this._chars++
      switch (ch) {
        case ',':
          this._parity ^= 0x2c
        // falls through
        case '\r':
        case '\n':
        case '*': {
          let valid = false
          if (this._term.length < 16 || this._isCk) valid = this._endTerm()
          this._termN++
          this._term = ''
          this._isCk = ch === '*'
          return valid
        }
        case '$':
          this._termN = 0
          this._term = ''
          this._parity = 0
          this._type = null
          this._isCk = false
          this._fix = false
          return false
        default:
          if (this._term.length < 15) this._term += ch
          if (!this._isCk) this._parity ^= ch.charCodeAt(0)
          return false
      }
    }
    _endTerm() {
      const t = this._term
      if (this._isCk) {
        const ck = parseInt(t.slice(0, 2), 16)
        if (ck === this._parity) {
          // como na original: qualquer frase com a soma certa conta (e encode() devolve true)
          this._passed++
          if (this._fix) this._withFix++
          if (!this._type) return true
          if (this._type === 'RMC') {
            this.date.commit()
            this.time.commit()
            if (this._fix) {
              this.location.commit()
              this.speed.commit()
              this.course.commit()
            }
          } else {
            this.time.commit()
            if (this._fix) {
              this.location.commit()
              this.altitude.commit()
            }
            this.satellites.commit()
            this.hdop.commit()
          }
          return true
        }
        this._failed++
        return false
      }
      if (this._termN === 0) {
        this._type = /^G[PNLA]RMC$/.test(t) ? 'RMC' : /^G[PNLA]GGA$/.test(t) ? 'GGA' : null
        return false
      }
      if (!this._type || !t.length) return false
      const L = this.location
      const n = this._termN
      if (this._type === 'RMC') {
        if (n === 1) this.time.stage = dec(t)
        else if (n === 2) this._fix = t[0] === 'A'
        else if (n === 3) L.stage = { ...L.stage, lat: degrees(t) }
        else if (n === 4 && t[0] === 'S') L.stage = { ...L.stage, lat: -Math.abs(L.stage.lat) }
        else if (n === 5) L.stage = { ...L.stage, lng: degrees(t) }
        else if (n === 6 && t[0] === 'W') L.stage = { ...L.stage, lng: -Math.abs(L.stage.lng) }
        else if (n === 7) this.speed.stage = dec(t)
        else if (n === 8) this.course.stage = dec(t)
        else if (n === 9) this.date.stage = parseInt(t, 10) || 0
      } else {
        if (n === 1) this.time.stage = dec(t)
        else if (n === 2) L.stage = { ...L.stage, lat: degrees(t) }
        else if (n === 3 && t[0] === 'S') L.stage = { ...L.stage, lat: -Math.abs(L.stage.lat) }
        else if (n === 4) L.stage = { ...L.stage, lng: degrees(t) }
        else if (n === 5 && t[0] === 'W') L.stage = { ...L.stage, lng: -Math.abs(L.stage.lng) }
        else if (n === 6) {
          this._fix = t[0] > '0'
          L.fixQuality = parseInt(t, 10) || 0
        } else if (n === 7) this.satellites.stage = parseInt(t, 10) || 0
        else if (n === 8) this.hdop.stage = dec(t)
        else if (n === 9) this.altitude.stage = dec(t)
      }
      return false
    }
    charsProcessed() {
      return this._chars
    }
    sentencesWithFix() {
      return this._withFix
    }
    failedChecksum() {
      return this._failed
    }
    passedChecksum() {
      return this._passed
    }
    static libraryVersion() {
      return '1.0.3'
    }
    // distância (m) entre dois pontos (fórmula da biblioteca: ortodrómica)
    static distanceBetween(lat1, long1, lat2, long2) {
      const r = Math.PI / 180
      const delta = (long1 - long2) * r
      const sdlong = Math.sin(delta)
      const cdlong = Math.cos(delta)
      const a1 = lat1 * r
      const a2 = lat2 * r
      const slat1 = Math.sin(a1)
      const clat1 = Math.cos(a1)
      const slat2 = Math.sin(a2)
      const clat2 = Math.cos(a2)
      let d = clat1 * slat2 - slat1 * clat2 * cdlong
      d = d * d + (clat2 * sdlong) ** 2
      d = Math.sqrt(d)
      const den = slat1 * slat2 + clat1 * clat2 * cdlong
      return Math.atan2(d, den) * EARTH_R
    }
    static courseTo(lat1, long1, lat2, long2) {
      const r = Math.PI / 180
      const dlon = (long2 - long1) * r
      const a1 = lat1 * r
      const a2 = lat2 * r
      const a = Math.sin(dlon) * Math.cos(a2)
      let b = Math.sin(a1) * Math.cos(a2) * Math.cos(dlon)
      b = Math.cos(a1) * Math.sin(a2) - b
      let deg = (Math.atan2(a, b) * 180) / Math.PI
      if (deg < 0) deg += 360
      return deg
    }
    static cardinal(course) {
      const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
      return dirs[Math.floor((course + 11.25) / 22.5) % 16]
    }
  }
}

export default {
  header: 'TinyGPS++.h',
  classes: { TinyGPSPlus: (env) => makeTinyGPS(env) },
}
