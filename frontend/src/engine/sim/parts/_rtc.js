// Relógio dos RTC (DS1307/DS3231): a hora vive no estado da peça (s.rtcBase em segundos
// "locais" desde 1970, no instante s.rtcT0 µs da simulação) e anda com o tempo simulado.
// Começa na hora do computador (como no Wokwi); a pilha mantém-na sem alimentação.
import { modulePower, powerDiagnose } from './_util.js'
import { i2cDiag } from './_groupD.js'

export const localNow = () => {
  const d = new Date()
  return Math.floor(d.getTime() / 1000) - d.getTimezoneOffset() * 60
}
export function rtcInit(s, tUs) {
  if (s.rtcBase == null) {
    s.rtcBase = localNow()
    s.rtcT0 = tUs
  }
}
export const rtcSeconds = (s, tUs) => (rtcInit(s, tUs), s.rtcBase + (tUs - s.rtcT0) / 1e6)
export function rtcSet(s, tUs, secs) {
  s.rtcBase = secs
  s.rtcT0 = tUs
}

const bcd = (v) => ((Math.floor(v / 10) << 4) | v % 10) & 0xff
const unbcd = (b) => (b >> 4) * 10 + (b & 15)

// registos 0x00–0x06 (seg, min, hora, dia da semana, dia, mês, ano) por I2C (Wire)
const i2c = {
  write({ s, env }, bytes) {
    s.ptr = bytes[0] & 0x3f
    if (bytes.length < 2) return
    const d = new Date(rtcSeconds(s, env.rt.t) * 1000)
    const f = [d.getUTCSeconds(), d.getUTCMinutes(), d.getUTCHours(), d.getUTCDay() + 1, d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear() % 100]
    for (let k = 1; k < bytes.length; k++) {
      const r = s.ptr++
      if (r <= 6) f[r] = unbcd(bytes[k] & (r === 0 ? 0x7f : r === 2 ? 0x3f : 0xff))
      else (s.ram ||= {})[r] = bytes[k]
    }
    rtcSet(s, env.rt.t, Date.UTC(2000 + f[6], f[5] - 1, f[4], f[2], f[1], f[0]) / 1000)
  },
  read({ s, env, part, cfg }, n) {
    const d = new Date(rtcSeconds(s, env.rt.t) * 1000)
    const f = [d.getUTCSeconds(), d.getUTCMinutes(), d.getUTCHours(), d.getUTCDay() + 1, d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear() % 100]
    // DS3231: sensor de temperatura em 0x11 (inteiro, com sinal) e 0x12 (bits 7–6 = 0,25 °C)
    const temp = part?.type === 'ds3231' ? Math.round((cfg?.temp ?? 24) * 4) / 4 : null
    const out = []
    for (let k = 0; k < n; k++) {
      const r = (s.ptr || 0) + k
      if (temp != null && r === 0x11) out.push(Math.floor(temp) & 0xff)
      else if (temp != null && r === 0x12) out.push(((temp - Math.floor(temp)) * 4) << 6)
      else out.push(r <= 6 ? bcd(f[r]) : (s.ram?.[r] ?? 0))
    }
    s.ptr = ((s.ptr || 0) + n) & 0x3f
    return out
  },
}

export function rtcBehavior(type, { vcc, vMin }) {
  return {
    type,
    i2c,
    stamp({ cond, s }) {
      cond(vcc, 'GND', s.damaged ? 1e-9 : 0.0015 / 5)
    },
    update: (ctx) => modulePower(ctx, vMin, 5.6, 6.5, vcc, 'GND'),
    step({ s, timeUs }) {
      rtcInit(s, timeUs)
    },
    output({ s, live, timeUs, cfg }) {
      live.powered = !!s.powered && !s.damaged
      const d = new Date(rtcSeconds(s, timeUs) * 1000)
      const p2 = (v) => String(v).padStart(2, '0')
      live.time = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`
      live.date = `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
      if (type === 'ds3231') live.temp = cfg.temp ?? 24
    },
    diagnose(ctx) {
      powerDiagnose(ctx, { vmax: 6, pos: vcc, label: `${vcc} → 5V e GND → GND` })
      i2cDiag(ctx)
    },
  }
}
