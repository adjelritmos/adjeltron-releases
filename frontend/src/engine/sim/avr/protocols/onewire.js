// DS18B20 no barramento 1-Wire, ao nível dos intervalos de tempo (OneWire.h a sério):
// reset/presença, intervalos de escrita (LOW curto = 1, longo = 0) e de leitura (o sensor
// segura a linha a LOW para enviar um 0), comandos de ROM (READ, MATCH, SKIP, SEARCH) e
// de função (CONVERT T, READ/WRITE SCRATCHPAD, READ POWER SUPPLY). Contrato em ./index.js.
import { romOf, crc8 } from '../../libs/OneWire.js'

const CONV_MS = { 9: 94, 10: 188, 11: 375, 12: 750 }

export function ds18b20(ctx) {
  const rom = romOf(ctx.part.id)
  const romBits = rom.flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >> i) & 1))
  let lowAt = null
  let readSlot = false // o LOW atual é um intervalo de leitura (não conta como bit escrito)
  let rx = null // { want, n, v, cb }
  let tx = [] // bits a enviar nos próximos intervalos de leitura
  let txDone = null
  let status = null // intervalos de leitura "soltos": () => bit
  const sp = { th: 0x4b, tl: 0x46, cfg: 0x7f }
  let convEnd = 0
  const bitsRes = () => 9 + ((sp.cfg >> 5) & 3)
  // (sem a resistência de pull-up a linha flutua e o firmware nem consegue fazer o reset)
  const ok = () => ctx.powered()
  const expect = (want, cb) => {
    rx = { want, n: 0, v: 0, cb }
    tx = []
    status = null
  }
  const send = (bits, cb) => {
    tx = bits.slice()
    txDone = cb
    rx = null
    status = null
  }
  const idle = () => {
    rx = null
    tx = []
    status = null
  }
  const toBits = (bytes) => bytes.flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >> i) & 1))
  const scratch = () => {
    const s = ctx.s || {}
    if (s.dsPending && ctx.now() >= s.dsPending.at) {
      s.dsValue = s.dsPending.v
      s.dsPending = null
    }
    const t = s.dsValue ?? 85
    const raw = Math.round(t * 16) & 0xffff
    const mask = [0xfff8, 0xfffc, 0xfffe, 0xffff][bitsRes() - 9]
    const b = [raw & mask & 0xff, ((raw & mask) >> 8) & 0xff, sp.th, sp.tl, sp.cfg, 0xff, 0x0c, 0x10]
    return [...b, crc8(b)]
  }
  const func = () =>
    expect(8, (cmd) => {
      if (cmd === 0x44) {
        const bits = bitsRes()
        const step = { 9: 0.5, 10: 0.25, 11: 0.125, 12: 0.0625 }[bits]
        const t = ctx.input().value ?? 22
        convEnd = ctx.now() + CONV_MS[bits] * 1000
        if (ctx.s) ctx.s.dsPending = { at: convEnd, v: Math.round(t / step) * step }
        status = () => (ctx.now() >= convEnd ? 1 : 0)
      } else if (cmd === 0xbe) send(toBits(scratch()), idle)
      else if (cmd === 0x4e)
        expect(24, (v) => {
          sp.th = v & 0xff
          sp.tl = (v >> 8) & 0xff
          sp.cfg = ((v >> 16) & 0x60) | 0x1f
          idle()
        })
      else if (cmd === 0xb4) status = () => 1 // alimentação externa (não parasita)
      else if (cmd === 0xb8) status = () => 1
      else idle()
    })
  const search = (i) => {
    if (i >= 64) return func()
    const b = romBits[i]
    send([b, b ^ 1], () =>
      expect(1, (dir) => {
        if (dir !== b) idle()
        else search(i + 1)
      }),
    )
  }
  const romCmd = () =>
    expect(8, (cmd) => {
      if (cmd === 0xcc) func()
      else if (cmd === 0x33) send(romBits, func)
      else if (cmd === 0x55)
        expect(64, (v, all) => {
          if (all.every((b, k) => b === romBits[k])) func()
          else idle()
        })
      else if (cmd === 0xf0) search(0)
      else idle()
    })
  const pull = (t0, dur) => {
    ctx.drive('DQ', 0)
    ctx.at(t0 + dur, () => ctx.drive('DQ', null))
  }
  ctx.watch('DQ', (lv, us) => {
    if (lv === 0) {
      if (lowAt != null) return
      lowAt = us
      readSlot = false
      if (!ok()) return
      // intervalo de leitura: para enviar um 0 o sensor segura a linha ~45 µs
      if (tx.length) {
        readSlot = true
        const b = tx.shift()
        if (b === 0) pull(us, 45)
        if (!tx.length) {
          const cb = txDone
          txDone = null
          cb?.()
        }
      } else if (status) {
        readSlot = true
        if (status() === 0) pull(us, 45)
      }
      return
    }
    if (lowAt == null) return
    const w = us - lowAt
    lowAt = null
    if (!ok()) return
    if (w >= 400) {
      // reset → presença (LOW de 120 µs, 30 µs depois de a linha subir)
      ctx.at(us + 30, () => ctx.drive('DQ', 0))
      ctx.at(us + 150, () => ctx.drive('DQ', null))
      romCmd()
      return
    }
    if (rx && !readSlot) {
      const bit = w < 15 ? 1 : 0
      rx.all = rx.all || []
      rx.all.push(bit)
      if (rx.n < 31) rx.v |= bit << rx.n
      rx.n++
      if (rx.n >= rx.want) {
        const r = rx
        rx = null
        r.cb(r.v >>> 0, r.all)
      }
    }
  })
  return {
    reset() {
      idle()
      lowAt = null
      ctx.drive('DQ', null)
    },
  }
}
