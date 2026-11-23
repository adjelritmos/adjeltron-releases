// Modelos com tempos ao µs: HC-SR04 (eco), DHT22/DHT11 (1 fio), HX711 (relógio série),
// recetor IR (tramas NEC). Ver o contrato em ./index.js.
import { REP_US } from '../../parts/irReceiver.js'

// ---------- HC-SR04: impulso de ≥ 10 µs em Trig → Echo a HIGH durante 2·d/c ----------
export function hcsr04(ctx) {
  let rise = null
  let busy = false
  const idle = () => ctx.drive('Echo', 0)
  idle()
  ctx.watch('Trig', (lv, us) => {
    if (lv === 1) rise = us
    else if (rise != null) {
      const w = us - rise
      rise = null
      if (w < 8 || busy || !ctx.powered()) return
      const d = ctx.host.sonarDistance(ctx.part.id)
      const dur = d >= 399 ? 38000 : Math.round((d * 2) / 0.0343)
      busy = true
      // 8 impulsos de 40 kHz (~200 µs) + atraso do circuito antes de o eco subir
      ctx.at(us + 460, () => ctx.drive('Echo', 1))
      ctx.at(us + 460 + dur, () => {
        idle()
        busy = false
      })
    }
  })
  return {
    reset() {
      busy = false
      rise = null
      idle()
    },
  }
}

// ---------- DHT22 / DHT11 ----------
function dhtFrame(type, t, h) {
  let d
  if (type === 'dht11') {
    // DHT11: 20–90 % HR e 0–50 °C, só valores inteiros (como em libs/DHT.js)
    const hi = Math.round(Math.max(20, Math.min(90, h)))
    const ti = Math.round(Math.max(0, Math.min(50, t)))
    d = [hi, 0, ti, 0, 0]
  } else {
    const hh = Math.round(Math.max(0, Math.min(100, h)) * 10)
    const tt = Math.round(Math.abs(Math.max(-40, Math.min(80, t))) * 10)
    d = [hh >> 8, hh & 255, ((tt >> 8) & 0x7f) | (t < 0 ? 0x80 : 0), tt & 255, 0]
  }
  d[4] = (d[0] + d[1] + d[2] + d[3]) & 255
  return d
}
export function dht(ctx) {
  let lowAt = null
  let busy = false
  const minLow = ctx.part.type === 'dht11' ? 15000 : 700
  ctx.watch('DATA', (lv, us) => {
    if (lv === 0) {
      if (lowAt == null) lowAt = us
      return
    }
    // o MCU soltou a linha (ou pô-la a HIGH) depois do impulso de arranque
    if (lowAt == null) return
    const w = us - lowAt
    lowAt = null
    if (w < minLow || busy || !ctx.powered()) return
    const s = ctx.s
    if (s?.onUs != null && ctx.now() - s.onUs < 1e6) return // ainda a arrancar
    const inp = ctx.input()
    const d = dhtFrame(ctx.part.type, inp.value ?? 22, inp.humidity ?? ctx.cfg.humidity ?? 50)
    busy = true
    let t = us + 30
    const seq = [[t, 0], [(t += 80), 1], [(t += 80), 0]]
    for (const byte of d)
      for (let b = 7; b >= 0; b--) {
        seq.push([(t += 50), 1])
        seq.push([(t += (byte >> b) & 1 ? 70 : 27), 0])
      }
    seq.push([(t += 50), null])
    for (const [at, lv] of seq) ctx.at(at, () => ctx.drive('DATA', lv))
    ctx.at(t + 1, () => (busy = false))
    ctx.live.lastRead = Math.round(us / 1e6)
  })
  return {
    reset() {
      busy = false
      lowAt = null
      ctx.drive('DATA', null)
    },
  }
}

// ---------- HX711: 24 bits (MSB primeiro) a cada impulso de PD_SCK, 10 conversões/s ----------
const COUNTS_PER_G = 420
export function hx711(ctx) {
  let ready = false
  let readyAt = null
  let pulses = 0
  let bits = 0
  let gainK = 1
  const conv = () => {
    const g = ctx.input().value ?? 0
    const raw = Math.round(8000 * gainK + g * COUNTS_PER_G * gainK + (Math.random() * 2 - 1) * 40)
    return Math.max(-8388608, Math.min(8388607, raw)) & 0xffffff
  }
  const schedule = (us) => {
    readyAt = us
    ctx.at(us, () => {
      if (!ctx.powered()) return
      ready = true
      pulses = 0
      bits = conv()
      ctx.drive('DT', 0) // dado pronto
    })
  }
  ctx.drive('DT', 1)
  ctx.watch('SCK', (lv, us) => {
    if (lv !== 1 || !ctx.powered()) return
    if (!ready) return
    pulses++
    if (pulses <= 24) ctx.drive('DT', (bits >> (24 - pulses)) & 1)
    else if (pulses === 25) {
      ctx.drive('DT', 1)
      ready = false
      // ganho da próxima conversão: 25 impulsos = A/128, 26 = B/32, 27 = A/64
      ctx.at(us + 20, () => {
        gainK = pulses === 25 ? 1 : pulses === 27 ? 0.5 : 0
      })
      schedule(us + 100000)
    }
  })
  return {
    step(us) {
      if (!ctx.powered()) {
        ready = false
        readyAt = null
        return
      }
      if (readyAt == null) schedule(us + 400000) // arranque
    },
    reset() {
      ready = false
      readyAt = null
      ctx.drive('DT', 1)
    },
  }
}

// ---------- Recetor IR (VS1838B): tramas NEC do "Comando IR" → forma de onda em DAT ----------
export function irReceiver(ctx) {
  const sent = new WeakSet()
  let primed = false
  let cursor = 0
  const wave = (f, t0) => {
    const seq = [[t0, 0], [t0 + 9000, 1]]
    let t = t0 + 9000
    if (f.rep) {
      t += 2250
      seq.push([t, 0], [t + 562, 1])
      return { seq, end: t0 + REP_US }
    }
    t += 4500
    const cmd = f.cmd & 0xff
    for (const byte of [0x00, 0xff, cmd, ~cmd & 0xff])
      for (let b = 0; b < 8; b++) {
        seq.push([t, 0], [t + 562, 1])
        t += 562 + ((byte >> b) & 1 ? 1687 : 562)
      }
    seq.push([t, 0], [t + 562, 1])
    return { seq, end: t + 562 + 100 }
  }
  return {
    step(us) {
      const on = ctx.powered()
      const log = ctx.s?.irLog || []
      if (!primed) {
        primed = true
        for (const f of log) sent.add(f) // tramas de antes do arranque não se repetem
      }
      if (us >= cursor) ctx.drive('DAT', on ? 1 : null)
      if (!on) return
      for (const f of log) {
        if (sent.has(f)) continue
        sent.add(f)
        const t0 = Math.max(us + 50, cursor)
        const { seq, end } = wave(f, t0)
        cursor = end
        for (const [at, lv] of seq) ctx.at(at, () => ctx.drive('DAT', lv))
      }
    },
    reset() {
      cursor = 0
    },
  }
}
