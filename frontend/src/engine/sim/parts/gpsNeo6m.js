// GPS NEO-6M: depois de ligado envia, uma vez por segundo, as frases NMEA do u-blox
// ($GPRMC, $GPVTG, $GPGGA, $GPGSA, $GPGSV, $GPGLL) pelo TX a 9600 baud (≈ 450 carateres,
// ~0,45 s de linha ocupada). Até ter posição (config.fixTime) as frases vão vazias
// (estado V / qualidade 0). A posição vem dos controlos (lat/lon) e avança com a
// velocidade e o rumo indicados. Ver libs/_uart.js e libs/TinyGPSPlus.js.
import { uartSend, toBytes } from '../libs/_uart.js'
import { GPS_DEFAULT } from '../../../../../shared/parts/gpsNeo6m.js'
import { uartDiagnose } from './_uartDiag.js'
import * as i18n from '../../../../../shared/i18n.js'

const BAUD = 9600
const p2 = (n) => String(Math.floor(n)).padStart(2, '0')
const ck = (body) => {
  let c = 0
  for (const ch of body) c ^= ch.charCodeAt(0)
  return c.toString(16).toUpperCase().padStart(2, '0')
}
const nmea = (body) => `$${body}*${ck(body)}\r\n`
// graus decimais → ddmm.mmmmm (latitude) / dddmm.mmmmm (longitude)
const dm = (v, degDigits) => {
  const a = Math.abs(v)
  const d = Math.floor(a)
  const m = (a - d) * 60
  return String(d).padStart(degDigits, '0') + m.toFixed(5).padStart(8, '0')
}
const num = (v, d) => (Number.isFinite(+v) ? +v : d)

function sentences(st, fix, d, sats) {
  const hms = `${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}.00`
  const dmy = `${p2(d.getUTCDate())}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCFullYear() % 100)}`
  const out = []
  // satélites à vista (GSV): até 4 por frase
  const view = Math.max(sats, fix ? sats : 0)
  const prns = Array.from({ length: view }, (_, k) => [2, 5, 7, 9, 13, 15, 18, 20, 24, 26, 29, 30][k % 12])
  if (!fix) {
    out.push(nmea(st.timeOk ? `GPRMC,${hms},V,,,,,,,${dmy},,,N` : 'GPRMC,,V,,,,,,,,,,N'))
    out.push(nmea('GPVTG,,,,,,,,,N'))
    out.push(nmea(st.timeOk ? `GPGGA,${hms},,,,,0,${p2(sats)},99.99,,,,,,` : 'GPGGA,,,,,,0,00,99.99,,,,,,'))
    out.push(nmea('GPGSA,A,1,,,,,,,,,,,,,99.99,99.99,99.99'))
  } else {
    const lat = dm(st.lat, 2)
    const lon = dm(st.lon, 3)
    const ns = st.lat >= 0 ? 'N' : 'S'
    const ew = st.lon >= 0 ? 'E' : 'W'
    const kn = (st.speed / 1.852).toFixed(3)
    const crs = st.speed > 0.5 ? st.course.toFixed(2) : ''
    const hdop = (sats >= 9 ? 0.85 : sats >= 7 ? 1.02 : sats >= 5 ? 1.6 : 3.2).toFixed(2)
    out.push(nmea(`GPRMC,${hms},A,${lat},${ns},${lon},${ew},${kn},${crs},${dmy},,,A`))
    out.push(nmea(`GPVTG,${crs},T,,M,${kn},N,${st.speed.toFixed(3)},K,A`))
    out.push(nmea(`GPGGA,${hms},${lat},${ns},${lon},${ew},1,${p2(sats)},${hdop},${st.alt.toFixed(1)},M,50.2,M,,`))
    const used = prns.slice(0, 12).map((p) => p2(p))
    while (used.length < 12) used.push('')
    out.push(nmea(`GPGSA,A,${sats >= 4 ? 3 : 2},${used.join(',')},${(+hdop * 1.6).toFixed(2)},${hdop},${(+hdop * 1.3).toFixed(2)}`))
  }
  const nMsg = Math.max(1, Math.ceil(view / 4))
  for (let m = 0; m < nMsg; m++) {
    const sv = prns.slice(m * 4, m * 4 + 4).map((p, k) => `${p2(p)},${p2(20 + ((p * 7 + k * 13) % 60))},${String((p * 37) % 360).padStart(3, '0')},${fix ? p2(25 + ((p * 3) % 20)) : ''}`)
    out.push(nmea(`GPGSV,${nMsg},${m + 1},${p2(view)}${sv.length ? ',' + sv.join(',') : ''}`))
  }
  out.push(nmea(fix ? `GPGLL,${dm(st.lat, 2)},${st.lat >= 0 ? 'N' : 'S'},${dm(st.lon, 3)},${st.lon >= 0 ? 'E' : 'W'},${hms},A,A` : st.timeOk ? `GPGLL,,,,,${hms},V,N` : 'GPGLL,,,,,,V,N'))
  return out.join('')
}

export default {
  type: 'gpsNeo6m',
  stamp({ s, cond, src }) {
    cond('VCC', 'GND', s.damaged ? 1e-9 : s.powered ? 1 / 110 : 1e-6) // ~45 mA a adquirir satélites
    if (s.powered) src('TX', 'GND', 3.3, 300) // linha em repouso a HIGH (lógica de 3,3 V)
  },
  update({ s, vd, set }) {
    const v = vd('VCC', 'GND')
    if (v > 6.5) set('damaged', true)
    set('powered', !s.damaged && v >= 3.0 && v <= 6)
  },
  step({ s, cfg, input, part, circuit, timeUs, dt }) {
    if (!s.powered) {
      s.t0 = null
      return
    }
    const inp = {
      lat: num(input.lat, num(cfg.lat, GPS_DEFAULT.lat)),
      lon: num(input.lon, num(cfg.lon, GPS_DEFAULT.lon)),
      speed: Math.max(0, num(input.speed, num(cfg.speed, 0))),
      course: ((num(input.course, num(cfg.course, 0)) % 360) + 360) % 360,
      sats: Math.max(0, Math.min(12, Math.round(num(input.sats, num(cfg.sats, 8))))),
      alt: num(input.alt, num(cfg.alt, GPS_DEFAULT.alt)),
    }
    if (s.t0 == null) {
      s.t0 = timeUs
      s.next = timeUs + 1e6 // primeira frase ~1 s depois de ligar
      s.epoch = Date.now()
      s.st = { ...inp }
      s.inKey = `${inp.lat},${inp.lon}`
    }
    const st = s.st
    Object.assign(st, { speed: inp.speed, course: inp.course, sats: inp.sats, alt: inp.alt })
    // posição mudada nos controlos: salta para lá
    const key = `${inp.lat},${inp.lon}`
    if (key !== s.inKey) {
      s.inKey = key
      st.lat = inp.lat
      st.lon = inp.lon
    }
    // a mover-se: avança na direção do rumo
    if (st.speed > 0) {
      const d = (st.speed / 3.6) * dt
      const r = (st.course * Math.PI) / 180
      st.lat = Math.max(-89.9, Math.min(89.9, st.lat + (d * Math.cos(r)) / 111320))
      st.lon = ((st.lon + (d * Math.sin(r)) / (111320 * Math.cos((st.lat * Math.PI) / 180)) + 540) % 360) - 180
    }
    const up = (timeUs - s.t0) / 1e6
    s.fix = up >= num(cfg.fixTime, 2) && st.sats >= 3
    st.timeOk = up >= Math.min(1, num(cfg.fixTime, 2))
    if (timeUs >= s.next) {
      s.next += 1e6
      const d = new Date(s.epoch + (timeUs - s.t0) / 1000)
      uartSend(circuit, circuit.nets.netOf(part.id, 'TX'), toBytes(sentences(st, s.fix, d, st.sats)), timeUs, BAUD)
      s.sent = (s.sent || 0) + 1
    }
  },
  output({ s, live, timeUs }) {
    live.powered = !!s.powered
    live.fix = !!s.fix
    if (s.st) {
      live.lat = Math.round(s.st.lat * 1e6) / 1e6
      live.lon = Math.round(s.st.lon * 1e6) / 1e6
      live.sats = s.st.sats
    }
    // LED "PPS": pisca 1× por segundo com posição
    live.pps = !!s.fix && s.t0 != null && (timeUs - s.t0) % 1e6 < 1.2e5
    live.sent = s.sent || 0
  },
  diagnose(ctx) {
    const { part, vd, name, issues } = ctx
    const v = vd('VCC', 'GND')
    if (v > 6.5) issues.push({ level: 'error', msg: i18n.m(`${name}: ${v.toFixed(1)} V no VCC (máx. 6 V com o regulador da placa). Danificado!`, `${name}: ${v.toFixed(1)} V on VCC (max 6 V with the board's regulator). Damaged!`), parts: [part.id] })
    else if (v < -0.5) issues.push({ level: 'error', msg: `${name}: VCC e GND trocados!`, parts: [part.id] })
    else if (v < 3) issues.push({ level: 'warn', msg: i18n.m(`${name} sem alimentação: VCC → 5V e GND → GND.`, `${name} has no power: VCC → 5V and GND → GND.`), parts: [part.id] })
    uartDiagnose(ctx, { tx: 'TX', rx: 'RX' })
  },
}
